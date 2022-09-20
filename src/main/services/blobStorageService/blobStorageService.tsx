import { NotebookDbService } from "@pkg/main/services/dbService";
import { makeDefaultIdGenerator } from "@pkg/main/helpers/idHelper";
import logger from "@pkg/main/services/logService";

export interface BlobStorageServiceOptions {
  dbService: NotebookDbService;
}

export class BlobStorageService {
  idHelper = makeDefaultIdGenerator();
  readonly dbService: NotebookDbService;

  constructor(options: BlobStorageServiceOptions) {
    this.dbService = options.dbService;
  }

  async store(ownerId: string, buffer: Buffer): Promise<string> {
    const blobId = this.idHelper.mkBlobId();
    const now = new Date().getTime();
    this.dbService.db
      .prepare(`INSERT INTO blob_storage(
        id, content, size, owner_id, created_at, accessed_at, modified_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(blobId, buffer, buffer.byteLength, ownerId, now, now, now);
    logger.info(
      `Blob ${blobId} stored, size: ${buffer.byteLength}, owner: ${ownerId}`,
    );
    return blobId;
  }

  async get(id: string): Promise<Buffer> {
    const row = this.dbService.db
      .prepare(
        `SELECT
        content as data
        FROM blob_storage WHERE id=?`,
      )
      .get(id);
    return row.data;
  }
}
