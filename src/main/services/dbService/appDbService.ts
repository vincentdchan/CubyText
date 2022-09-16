import { DbServiceBase, openDatabase } from "./dbService";
import { appVersions } from "./version";

export class AppDbService extends DbServiceBase {
  static async init(filename: string): Promise<AppDbService> {
    const db = await openDatabase(filename);
    const appDbService = new AppDbService(db);
    await appDbService.initService();
    return appDbService;
  }

  private async initService() {
    await this.prepareDatabase(appVersions);
  }
}
