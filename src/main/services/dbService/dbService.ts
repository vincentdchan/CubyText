import { Database } from "sqlite3";
import { versions } from "./version";
import logger from "@pkg/main/services/logService";
import { homeId } from "@pkg/common/constants";
import { app } from "electron";
import { performance } from "perf_hooks";
import { isUndefined } from "lodash-es";
import HomeInitData from "./assets/home_init.json";

function openDatabase(filename: string): Promise<Database> {
  return new Promise((resolve, reject) => {
    const db = new Database(filename, (err) => {
      if (err) {
        return reject(err);
      }
      resolve(db);
    });
  });
}

export class DbService {
  static #instance: DbService | undefined;

  static async initMemory(): Promise<void> {
    const db = await openDatabase(":memory:");
    DbService.#instance = new DbService(db);
    return await DbService.#instance.initService();
  }

  static async initLocal(filename: string): Promise<void> {
    const db = await openDatabase(filename);
    DbService.#instance = new DbService(db);
    return await DbService.#instance.initService();
  }

  static get(): DbService {
    return DbService.#instance!;
  }

  private constructor(readonly db: Database) {}

  async initService() {
    try {
      const begin = performance.now();
      await this.#prepareDatabase();
      await this.#initHomePageIfNeed();
      const end = performance.now();
      logger.info(`db init in ${end - begin}ms`);
    } catch (err) {
      logger.error(err);
      app.exit(1);
    }
  }

  async #initHomePageIfNeed() {
    const home = await this.get(`SELECT id FROM document WHERE id=?`, [homeId]);
    if (isUndefined(home)) {
      await this.#forceInitHomePage();
    }
    logger.debug("home: ", home);
  }

  async #forceInitHomePage() {
    const homeTitle = "Home";
    logger.info("init home page...");
    const now = new Date().getTime();
    await this.run(
      `INSERT INTO document(id, title, snapshot, snapshot_version, accessed_at, created_at, modified_at)
        VALUES (?, ?, ?, 0, ?, ?, ?)`,
      [homeId, homeTitle, JSON.stringify(HomeInitData), now, now, now],
    );
  }

  async #prepareDatabase() {
    await this.run(`PRAGMA journal_mode = WAL;`, []);
    await this.run(
      "CREATE TABLE IF NOT EXISTS global_kv (key TEXT PRIMARY KEY, value TEXT)",
      [],
    );
    let version = parseInt((await this.kvGet("version")) ?? "-1", 10);
    if (version === versions.length - 1) {
      return;
    }
    logger.info(`db version: ${version}`);

    while (version < versions.length - 1) {
      const v = versions[++version];
      logger.info(`upgrading db version to ${version}`);
      v.execute(this.db);
    }

    await this.kvSet("version", version.toString());
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

  dispose() {
    this.db.close();
    logger.info("db closed~");
  }
}
