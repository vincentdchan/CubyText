import { lazy } from "blocky-common/es/lazy";
import { DbService } from "@pkg/main/services/dbService";
import { makeDefaultIdGenerator } from "@pkg/main/helpers/idHelper";
import logger from "@pkg/main/services/logService";

export class BlobStorageService {
  static #init = lazy(() => new BlobStorageService());

  static get(): BlobStorageService {
    return BlobStorageService.#init();
  }

  idHelper = makeDefaultIdGenerator();

  async store(ownerId: string, buffer: Buffer): Promise<string> {
    const dbService = DbService.get();
    const blobId = this.idHelper.mkBlobId();
    const now = new Date().getTime();
    await dbService.run(
      `INSERT INTO blob_storage(
      id, content, size, owner_id, created_at, accessed_at, modified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [blobId, buffer, buffer.byteLength, ownerId, now, now, now],
    );
    logger.info(
      `Blob ${blobId} stored, size: ${buffer.byteLength}, owner: ${ownerId}`,
    );
    return blobId;
  }

  async get(id: string): Promise<Buffer> {
    const dbService = DbService.get();
    const row = await dbService.get(
      `SELECT
      content as data
      FROM blob_storage WHERE id=?`,
      [id],
    );
    return row.data;
  }
}
