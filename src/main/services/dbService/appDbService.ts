import { DbServiceBase, openDatabase } from "./dbService";
import { appVersions } from "./version";

export class AppDbService extends DbServiceBase {
  static async init(filename: string): Promise<AppDbService> {
    const db = await openDatabase(filename);
    const appDbService = new AppDbService(db);
    appDbService.initService();
    return appDbService;
  }

  private initService() {
    this.prepareDatabase(appVersions);
  }
}
