import { DbService } from "@pkg/main/services/dbService";
import { BlockyDocument, changesetFromMessage, State } from "blocky-data";
import { groupBy } from "lodash-es";
import { DocumentState, documentFromRow } from "./documentState";
import logger from "@pkg/main/services/logService";
import { performance } from "perf_hooks";

/**
 * Normally, we don't need the full snapshot
 * to save the memory.
 *
 * The opening docs are reference counting.
 * When nobody opened a documents, the memory will be freed.
 *
 * But sometimes, we need the global relationship.
 *
 * For example:
 * - Building the searching indexes
 * - Building the graph
 */

export class FullDatabaseSnapshot {
  static async init(): Promise<FullDatabaseSnapshot> {
    const begin = performance.now();
    const snapshot = new FullDatabaseSnapshot();
    const dbService = DbService.get();
    const documentRows = await dbService.all(
      `SELECT
        id,
        snapshot,
        snapshot_version AS snapshotVersion,
        accessed_at AS accessedAt,
        created_at AS createdAt,
        modified_at AS modifiedAt
      FROM document WHERE trashed_at IS NULL`,
      [],
    );
    const changesetRows = await dbService.all(
      `SELECT
        id,
        version_num AS version,
        content,
        document_id AS documentId
      FROM changeset`,
      [],
    );

    const changesetGroups = groupBy(changesetRows, "documentId");

    for (const documentRow of documentRows) {
      const id = documentRow.id;
      const document: BlockyDocument = documentFromRow(documentRow);

      const changesetRows = changesetGroups[id] ?? [];
      const changesets = changesetRows.map((row) =>
        changesetFromMessage(JSON.parse(row.content)),
      );

      const state = new State("local", document, documentRow.snapshotVersion);

      for (const changeset of changesets) {
        state.apply(changeset);
      }

      const documentState = new DocumentState({
        id,
        state,
        changesetCount: changesets.length,
      });
      documentState.accessedAt = documentRow.accessedAt;
      documentState.createdAt = documentRow.createdAt;
      documentState.modifiedAt = documentRow.modifiedAt;

      snapshot.documents.set(id, documentState);
    }

    logger.info(
      `Build full snapshot for ${documentRows.length} documents in ${
        performance.now() - begin
      }ms`,
    );

    return snapshot;
  }

  readonly documents: Map<string, DocumentState> = new Map();
}
