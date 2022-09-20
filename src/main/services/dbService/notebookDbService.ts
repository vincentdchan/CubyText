import { DbServiceBase, openDatabase } from "./dbService";
import { homeId } from "@pkg/common/constants";
import { app } from "electron";
import { performance } from "perf_hooks";
import { isUndefined } from "lodash-es";
import logger from "@pkg/main/services/logService";
import { notebookVersions } from "./version";
import HomeInitData from "./assets/home_init.json";

export class NotebookDbService extends DbServiceBase {
  static async initMemory(): Promise<NotebookDbService> {
    const db = await openDatabase(":memory:");
    const service = new NotebookDbService(db);
    await service.initService();
    return service;
  }

  static async initLocal(filename: string): Promise<NotebookDbService> {
    const db = await openDatabase(filename);
    const service = new NotebookDbService(db);
    await service.initService();
    return service;
  }

  initService() {
    try {
      const begin = performance.now();
      this.prepareDatabase(notebookVersions);
      this.#initHomePageIfNeed();
      const end = performance.now();
      logger.info(`db init in ${end - begin}ms`);
    } catch (err) {
      logger.error(err);
      app.exit(1);
    }
  }

  #initHomePageIfNeed() {
    const home = this.db
      .prepare(`SELECT id FROM document WHERE id=?`)
      .get(homeId);
    if (isUndefined(home)) {
      this.#forceInitHomePage();
    }
    logger.debug("home: ", home);
  }

  async #forceInitHomePage() {
    const homeTitle = "Home";
    logger.info("init home page...");
    const now = new Date().getTime();
    this.db
      .prepare(
        `INSERT INTO document(id, title, snapshot, snapshot_version, accessed_at, created_at, modified_at)
        VALUES (?, ?, ?, 0, ?, ?, ?)`,
      )
      .run(homeId, homeTitle, JSON.stringify(HomeInitData), now, now, now);
  }
}
