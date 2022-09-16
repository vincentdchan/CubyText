import { Database } from "sqlite3";
import logger from "@pkg/main/services/logService";
import type { IDisposable } from "blocky-common/es/disposable";
import { type DbVersion } from "./version";

export function openDatabase(filename: string): Promise<Database> {
  return new Promise((resolve, reject) => {
    const db = new Database(filename, (err) => {
      if (err) {
        return reject(err);
      }
      resolve(db);
    });
  });
}

export class DbServiceBase implements IDisposable {
  protected constructor(readonly db: Database) {}

  protected async prepareDatabase(dbVersions: DbVersion[]) {
    await this.run(`PRAGMA journal_mode = WAL;`, []);
    await this.run(
      "CREATE TABLE IF NOT EXISTS global_kv (key TEXT PRIMARY KEY, value TEXT)",
      [],
    );
    let version = parseInt((await this.kvGet("version")) ?? "-1", 10);
    if (version === dbVersions.length - 1) {
      return;
    }
    logger.info(`db version: ${version}`);

    while (version < dbVersions.length - 1) {
      const v = dbVersions[++version];
      logger.info(`upgrading db version to ${version}`);
      v.execute(this.db);
    }

    await this.kvSet("version", version.toString());
  }

  kvGet(key: string): Promise<string | undefined> {
    return new Promise<string>((resolve, reject) => {
      this.db.get(
        `SELECT value FROM global_kv WHERE key=?`,
        [key],
        (err: Error | null, row: any) => {
          if (err) {
            return reject(err);
          }
          resolve(row?.value);
        },
      );
    });
  }

  kvSet(key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO global_kv(key, value) VALUES (?, ?)`,
        [key, value],
        (err: Error | null) => {
          if (err) {
            return reject(err);
          }
          resolve();
        },
      );
    });
  }

  run(sql: string, params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err: Error | null) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  }

  get(sql: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err: Error | null, row: any) => {
        if (err) {
          return reject();
        }
        resolve(row);
      });
    });
  }

  all(sql: string, params: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err: Error | null, rows: any[]) => {
        if (err) {
          return reject();
        }
        resolve(rows);
      });
    });
  }

  dispose() {
    this.db.close();
    logger.info("db closed~");
  }
}
