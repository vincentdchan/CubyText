import Database, { Database as BetterDatabase } from "better-sqlite3";
import logger from "@pkg/main/services/logService";
import { type DbVersion } from "./version";

export function openDatabase(filename: string): BetterDatabase {
  return new Database(filename);
}

export class DbServiceBase {
  protected constructor(readonly db: BetterDatabase) {}

  protected prepareDatabase(dbVersions: DbVersion[]) {
    this.db.exec(`PRAGMA journal_mode = WAL;`);
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS global_kv (key TEXT PRIMARY KEY, value TEXT)",
    );
    let version = parseInt(this.kvGet("version") ?? "-1", 10);
    if (version === dbVersions.length - 1) {
      return;
    }
    logger.info(`db version: ${version}`);

    while (version < dbVersions.length - 1) {
      const v = dbVersions[++version];
      logger.info(`upgrading db version to ${version}`);
      v.execute(this.db);
    }

    this.kvSet("version", version.toString());
  }

  kvGet(key: string): string | undefined {
    const row = this.db
      .prepare(`SELECT value FROM global_kv WHERE key=?`)
      .get(key);
    return row?.value;
  }

  kvSet(key: string, value: string): void {
    this.db
      .prepare(`INSERT OR REPLACE INTO global_kv(key, value) VALUES (?, ?)`)
      .run(key, value);
  }

  close() {
    this.db.close();
    logger.info("db closed~");
  }
}
