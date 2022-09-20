import { FinalizedChangeset, changesetToMessage } from "blocky-data";
import { NotebookDbService } from "@pkg/main/services/dbService";
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
import type {
  DocContentSubscriptionService,
  DocListSubscriptionService,
} from "@pkg/main/services/subscriptionService";
import { performance } from "perf_hooks";
import { homeId } from "@pkg/common/constants";
import { DocumentState } from "./documentState";
import { FullDatabaseSnapshot } from "./fullDatabaseSnapshot";

const idHelper = makeDefaultIdGenerator();

export interface DocumentServiceInitOptions {
  dbService: NotebookDbService;
  searchService: SearchService;
  docContentSubscriptionService: DocContentSubscriptionService;
  docListSubscriptionService: DocListSubscriptionService;
}

export class DocumentService {
  #documents: Map<string, DocumentState> = new Map();
  readonly dbService: NotebookDbService;
  readonly searchService: SearchService;
  readonly docContentSubscriptionService: DocContentSubscriptionService;
  readonly docListSubscriptionService: DocListSubscriptionService;

  constructor(options: DocumentServiceInitOptions) {
    this.dbService = options.dbService;
    this.searchService = options.searchService;
    this.docContentSubscriptionService = options.docContentSubscriptionService;
    this.docListSubscriptionService = options.docListSubscriptionService;
  }

  async getDocumentStateById(id: string): Promise<DocumentState> {
    const doc = this.#documents.get(id);
    if (doc) {
      doc.counter++;
      return doc;
    }
    const documentState = await DocumentState.openFromDatabase({
      dbService: this.dbService,
      searchService: this.searchService,
      documentService: this,
      id,
    });
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

  getDocTitleEvenTrash(id: string): string | undefined {
    const row = this.dbService.db
      .prepare(`SELECT title FROM document WHERE id=?`)
      .get(id);
    return row?.title;
  }

  getDocTitle(id: string): string | undefined {
    const row = this.dbService.db
      .prepare(`SELECT title FROM document WHERE id=? AND trashed_at IS NULL`)
      .get(id);
    return row?.title;
  }

  applyChangeset(
    docId: string,
    changeset: FinalizedChangeset,
  ): string | undefined {
    const documentState = this.#documents.get(docId);
    if (!documentState) {
      throw new Error(`document not opened, can not apply: ${docId}`);
    }
    const applyResult = documentState.applyChangeset(changeset);
    if (isUndefined(applyResult)) {
      return;
    }
    const id = idHelper.mkChangesetId();
    const now = new Date().getTime();

    this.dbService.db
      .prepare(
        `INSERT INTO changeset(id, version_num, document_id, content, created_at)
          VALUES(?, ?, ?, ?, ?)`,
      )
      .run(id, 0, docId, JSON.stringify(changesetToMessage(changeset)), now);

    this.dbService.db
      .prepare(`UPDATE document SET title=?, modified_at=? WHERE id=?`)
      .run(applyResult.title, now, docId);

    logger.debug(`Changeset ${id} applied on ${docId}`);
    this.docContentSubscriptionService.broadcastChangeset(docId, changeset);

    if (applyResult.changed) {
      this.docListSubscriptionService.broadcast();
    }

    if (documentState.changesetCounter >= DocumentState.ChangesetMergeCount) {
      this.#mergeChangesets(documentState); // ignore the result
    }

    return id;
  }

  #mergeChangesets(documentState: DocumentState) {
    const begin = performance.now();

    try {
      const snapshot = documentState.state.document.toJSON();
      const snapshotVersion = documentState.state.appliedVersion;
      this.dbService.db
        .prepare(
          `UPDATE document
          SET snapshot=?, snapshot_version=?
          WHERE id=?`,
        )
        .run(JSON.stringify(snapshot), snapshotVersion, documentState.id);

      this.dbService.db
        .prepare(`DELETE FROM changeset WHERE document_id=?`)
        .run(documentState.id);

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

  movetoTrash(id: string): void {
    this.#documents.delete(id);
    const now = new Date().getTime();
    this.dbService.db
      .prepare(`UPDATE document SET trashed_at=? WHERE id=?`)
      .run(now, id);
    this.searchService.deleteItem(id);
    logger.info(`${id} moved to trash`);

    this.docContentSubscriptionService.broadcastTrash(id);
  }

  async fetchTrash(): Promise<SearchItem[]> {
    const rows = this.dbService.db
      .prepare(
        `SELECT
        id as key, title,
        accessed_at as accessedAt,
        created_at as createdAt,
        modified_at as modifiedAt
      FROM document
      WHERE trashed_at IS NOT NULL`,
      )
      .all();
    rows.forEach((row) => {
      if (!row.title) {
        row.title = "Untitled document";
      }
    });
    return rows;
  }

  recoverDocument(id: string): void {
    this.dbService.db
      .prepare(`UPDATE document SET trashed_at=NULL WHERE id=?`)
      .run(id);
    logger.info(`${id} recovered`);
  }

  deletePermanently(id: string): void {
    const begin = performance.now();
    this.dbService.db
      .prepare(`DELETE FROM document WHERE id=? AND trashed_at IS NOT NULL`)
      .run(id);
    this.dbService.db
      .prepare(`DELETE FROM changeset WHERE document_id=?`)
      .run(id);
    this.dbService.db
      .prepare(`DELETE FROM blob_storage WHERE owner_id=?`)
      .run(id);
    logger.info(
      `${id} is deleted permanently in ${performance.now() - begin}ms`,
    );
  }

  computeGraph(): GetGraphInfoResponse {
    const begin = performance.now();
    const fullSnapshot = FullDatabaseSnapshot.init({
      dbService: this.dbService,
      documentService: this,
      searchService: this.searchService,
    });

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
    const graph = this.#computeGraph(nodes, fullSnapshot);
    logger.info(`compute graph in ${performance.now() - begin}ms`);
    return graph;
  }

  #computeGraph(
    nodes: any[],
    fullSnapshot: FullDatabaseSnapshot,
  ): GetGraphInfoResponse {
    const nodesMap = new Map<string, any>();
    for (const node of nodes) {
      nodesMap.set(node.id, node);
    }
    const links: any[] = [];

    for (const node of nodes) {
      const docState = fullSnapshot.documents.get(node.id)!;
      try {
        const references: OutlineNode[] = [];
        docState.generateOutline(references);
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
