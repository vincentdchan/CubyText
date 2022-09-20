import {
  BlockyDocument,
  FinalizedChangeset,
  State,
  documentFromJsonNode,
  changesetFromMessage,
} from "blocky-data";
import { NotebookDbService } from "@pkg/main/services/dbService";
import {
  type OpenDocumentResponse,
  pushOutlineChanged,
} from "@pkg/common/message";
import singleton from "@pkg/main/singleton";
import { OutlineNode } from "@pkg/common/outlineTree";
import logger from "@pkg/main/services/logService";
import { OutlineGenerator } from "./outlineGenerator";
import { debounce, isEqual } from "lodash-es";
import { SearchService } from "@pkg/main/services/searchService";
import { DocumentService } from "./documentService";

export function getChangesetOfDocumentsFromDatabase(
  dbService: NotebookDbService,
  id: string,
): FinalizedChangeset[] {
  const rows = dbService.db
    .prepare(
      `SELECT id, version_num, content, created_at
      FROM changeset
      WHERE document_id=? ORDER BY version_num`,
    )
    .all(id);
  return rows.map((row) => changesetFromMessage(JSON.parse(row.content)));
}

export function documentFromRow(row: any): BlockyDocument {
  let document: BlockyDocument;

  if (row.snapshot) {
    document = documentFromJsonNode(JSON.parse(row.snapshot)) as BlockyDocument;
  } else {
    document = new BlockyDocument();
  }
  return document;
}

export interface DocumentStateInitOptions {
  id: string;
  state: State;
  changesetCount: number;
  documentService: DocumentService;
  searchService: SearchService;
}

export class DocumentState {
  static ChangesetMergeCount = 20;

  static async openFromDatabase({
    dbService,
    documentService,
    searchService,
    id,
  }: {
    dbService: NotebookDbService;
    documentService: DocumentService;
    searchService: SearchService;
    id: string;
  }): Promise<DocumentState> {
    const result = dbService.db
      .prepare(
        `SELECT
          snapshot,
          snapshot_version AS snapshotVersion,
          accessed_at AS accessedAt,
          created_at AS createdAt,
          modified_at AS modifiedAt
        FROM document WHERE id=? AND trashed_at is NULL`,
      )
      .get(id);
    if (!result) {
      throw new Error(`Can not find document in database by ID: ${id}`);
    }
    const document: BlockyDocument = documentFromRow(result);

    const changesets = await getChangesetOfDocumentsFromDatabase(dbService, id);

    const state = new State("local", document, result.snapshotVersion);

    for (const changeset of changesets) {
      state.apply(changeset);
    }

    const documentState = new DocumentState({
      id,
      state,
      changesetCount: changesets.length,
      documentService,
      searchService,
    });
    documentState.accessedAt = result.accessedAt;
    documentState.createdAt = result.createdAt;
    documentState.modifiedAt = result.modifiedAt;

    logger.debug(
      `openFromDatabase(${id}), changeset size: ${changesets.length}`,
    );

    return documentState;
  }

  readonly id: string;
  readonly state: State;
  readonly documentService: DocumentService;
  readonly searchService: SearchService;
  counter = 1;
  changesetCounter = 0;
  accessedAt = 0;
  createdAt = 0;
  modifiedAt = 0;

  constructor(options: DocumentStateInitOptions) {
    this.id = options.id;
    this.state = options.state;
    this.changesetCounter = options.changesetCount;
    this.documentService = options.documentService;
    this.searchService = options.searchService;
  }

  #pushedOutline: OutlineNode | undefined;

  get version() {
    return this.state.appliedVersion;
  }

  generateResponse(): OpenDocumentResponse {
    return {
      id: this.id,
      snapshot: this.state.document.toJSON(),
      snapshotVersion: this.state.appliedVersion,
      accessedAt: this.accessedAt,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    };
  }

  applyChangeset(
    finalizedChangeset: FinalizedChangeset,
  ): { title: string; changed: boolean } | undefined {
    const beforeTitleContent = this.title;
    const test = this.state.apply(finalizedChangeset);
    if (!test) {
      return undefined;
    }
    const afterTitleContent = this.title;
    this.debouncedNotifyOutlineChanged();
    this.reportToSearchService();
    this.changesetCounter++;
    return {
      title: afterTitleContent,
      changed: beforeTitleContent !== afterTitleContent,
    };
  }

  debouncedNotifyOutlineChanged = debounce(async () => {
    const outline = await this.generateOutline();

    if (isEqual(this.#pushedOutline, outline)) {
      return;
    }

    logger.debug(`Push outline of document: ${this.id}`);
    pushOutlineChanged.push(singleton.browserWindow, {
      docId: this.id,
      outline,
    });
  }, 500);

  reportToSearchService() {
    this.searchService.reportItem({
      key: this.id,
      title: this.title,
      createdAt: this.createdAt,
      modifiedAt: this.modifiedAt,
    });
  }

  get title(): string {
    return (
      this.state.document.title.getTextModel("textContent")?.toString() ?? ""
    );
  }

  generateOutline(referencesCollector?: OutlineNode[]): OutlineNode {
    const generator = new OutlineGenerator({
      document: this.state.document,
      referencesCollector,
      documentService: this.documentService,
    });
    return generator.generate();
  }
}
