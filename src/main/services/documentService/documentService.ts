import { FinalizedChangeset, changesetToMessage } from "blocky-data";
import { lazy } from "blocky-common/es/lazy";
import { DbService } from "@pkg/main/services/dbService";
import { makeDefaultIdGenerator } from "@pkg/main/helpers/idHelper";
import {
  type OpenDocumentResponse,
  type SearchItem,
  type GetGraphInfoResponse,
} from "@pkg/common/message";
import type { OutlineNode } from "@pkg/common/outlineTree";
import logger from "@pkg/main/services/logService";
import { isUndefined } from "lodash-es";
import { SearchService } from "@pkg/main/services/searchService";
import { SubscriptionService } from "@pkg/main/services/subscriptionService";
import { performance } from "perf_hooks";
import { homeId } from "@pkg/common/constants";
import { DocumentState } from "./documentState";
import { FullDatabaseSnapshot } from "./fullDatabaseSnapshot";

const idHelper = makeDefaultIdGenerator();

export class DocumentService {
  static #init = lazy(() => new DocumentService());

  static get(): DocumentService {
    return DocumentService.#init();
  }

  #documents: Map<string, DocumentState> = new Map();

  async getDocumentStateById(id: string): Promise<DocumentState> {
    const doc = this.#documents.get(id);
    if (doc) {
      doc.counter++;
      return doc;
    }
    const documentState = await DocumentState.openFromDatabase(id);
    this.#documents.set(id, documentState);
    return documentState;
  }

  async openDocById(id: string): Promise<OpenDocumentResponse> {
    const doc = await this.getDocumentStateById(id);
    return doc.generateResponse();
  }

  async getDocInfo(id: string): Promise<SearchItem> {
    const docData = await this.getDocumentStateById(id);
    const data = docData.generateResponse();
    this.closeDoc(id);

    return {
      key: data.id,
      title: docData.title,
      createdAt: data.createdAt,
      modifiedAt: data.modifiedAt,
    };
  }

  async getDocTitleEvenTrash(id: string): Promise<string | undefined> {
    const dbService = DbService.get();
    const row = await dbService.get(`SELECT title FROM document WHERE id=?`, [
      id,
    ]);
    return row?.title;
  }

  async getDocTitle(id: string): Promise<string | undefined> {
    const dbService = DbService.get();
    const row = await dbService.get(
      `SELECT title FROM document WHERE id=? AND trashed_at IS NULL`,
      [id],
    );
    return row?.title;
  }

  async applyChangeset(
    docId: string,
    changeset: FinalizedChangeset,
  ): Promise<string | undefined> {
    const documentState = this.#documents.get(docId);
    if (!documentState) {
      throw new Error(`document not opened, can not apply: ${docId}`);
    }
    const applyResult = documentState.applyChangeset(changeset);
    if (isUndefined(applyResult)) {
      return;
    }
    const dbService = DbService.get();
    const id = idHelper.mkChangesetId();
    const now = new Date().getTime();
    const promises: Promise<any>[] = [];

    dbService.db.serialize(() => {
      promises.push(
        dbService.run(
          `INSERT INTO changeset(id, version_num, document_id, content, created_at)
          VALUES(?, ?, ?, ?, ?)`,
          [id, 0, docId, JSON.stringify(changesetToMessage(changeset)), now],
        ),
      );
      promises.push(
        dbService.run(`UPDATE document SET title=?, modified_at=? WHERE id=?`, [
          applyResult,
          now,
          docId,
        ]),
      );
    });

    await Promise.all(promises);

    logger.debug(`Changeset ${id} applied on ${docId}`);
    const subscription = SubscriptionService.get();
    subscription.broadcastChangeset(docId, changeset);

    if (documentState.changesetCounter >= DocumentState.ChangesetMergeCount) {
      this.#mergeChangesets(documentState); // ignore the result
    }

    return id;
  }

  async #mergeChangesets(documentState: DocumentState) {
    const begin = performance.now();
    const dbService = DbService.get();

    try {
      const snapshot = documentState.state.document.toJSON();
      const snapshotVersion = documentState.state.appliedVersion;
      await dbService.run(
        `UPDATE document
        SET snapshot=?, snapshot_version=?
        WHERE id=?`,
        [JSON.stringify(snapshot), snapshotVersion, documentState.id],
      );
      await dbService.run(`DELETE FROM changeset WHERE document_id=?`, [
        documentState.id,
      ]);

      documentState.changesetCounter = 0;
      logger.info(
        `Merge changesets for ${documentState.id} in ${
          performance.now() - begin
        }ims`,
      );
    } catch (err) {
      logger.error(err);
    }
  }

  async getOutlineById(id: string): Promise<OutlineNode | undefined> {
    const state = this.#documents.get(id);
    if (isUndefined(state)) {
      return undefined;
    }
    return state.generateOutline();
  }

  closeDoc(id: string) {
    const doc = this.#documents.get(id);
    if (!doc) {
      return;
    }
    if (--doc.counter === 0) {
      this.#documents.delete(id);
    }
  }

  async movetoTrash(id: string): Promise<void> {
    this.#documents.delete(id);
    const dbService = DbService.get();
    const searchService = SearchService.get();
    const now = new Date().getTime();
    await dbService.run(`UPDATE document SET trashed_at=? WHERE id=?`, [
      now,
      id,
    ]);
    searchService.deleteItem(id);
    logger.info(`${id} moved to trash`);

    const subscription = SubscriptionService.get();
    subscription.broadcastTrash(id);
  }

  async fetchTrash(): Promise<SearchItem[]> {
    const dbService = DbService.get();
    const rows = await dbService.all(
      `SELECT
        id as key, title,
        accessed_at as accessedAt,
        created_at as createdAt,
        modified_at as modifiedAt
      FROM document
      WHERE trashed_at IS NOT NULL`,
      [],
    );
    rows.forEach((row) => {
      if (!row.title) {
        row.title = "Untitled document";
      }
    });
    return rows;
  }

  async recoverDocument(id: string): Promise<void> {
    const dbService = DbService.get();
    await dbService.run(`UPDATE document SET trashed_at=NULL WHERE id=?`, [id]);
    logger.info(`${id} recovered`);
  }

  async deletePermanently(id: string): Promise<void> {
    const dbService = DbService.get();
    const begin = performance.now();
    await dbService.run(
      `DELETE FROM document WHERE id=? AND trashed_at IS NOT NULL`,
      [id],
    );
    await dbService.run(`DELETE FROM changeset WHERE document_id=?`, [id]);
    await dbService.run(`DELETE FROM blob_storage WHERE owner_id=?`, [id]);
    logger.info(
      `${id} is deleted permanently in ${performance.now() - begin}ms`,
    );
  }

  async computeGraph(): Promise<GetGraphInfoResponse> {
    const begin = performance.now();
    const fullSnapshot = await FullDatabaseSnapshot.init();

    const nodes = [...fullSnapshot.documents.values()].map((item) => {
      let val: number;
      if (item.id === homeId) {
        val = 10;
      } else {
        val = 4;
      }
      return {
        id: item.id,
        label: item.title || "Untitled document",
        val,
      };
    });
    const graph = await this.#computeGraph(nodes, fullSnapshot);
    logger.info(`compute graph in ${performance.now() - begin}ms`);
    return graph;
  }

  async #computeGraph(
    nodes: any[],
    fullSnapshot: FullDatabaseSnapshot,
  ): Promise<GetGraphInfoResponse> {
    const nodesMap = new Map<string, any>();
    for (const node of nodes) {
      nodesMap.set(node.id, node);
    }
    const links: any[] = [];

    for (const node of nodes) {
      const docState = fullSnapshot.documents.get(node.id)!;
      try {
        const references: OutlineNode[] = [];
        await docState.generateOutline(references);
        for (const ref of references) {
          const docId = ref.id.slice("Ref-".length);
          links.push({
            source: node.id,
            target: docId,
          });
        }
      } catch (err) {
        logger.error("Generate outline error for", node.id, "reason", err);
      }
    }

    return {
      nodes,
      links,
    };
  }
}
