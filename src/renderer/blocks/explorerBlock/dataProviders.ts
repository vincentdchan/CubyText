import { recentDocuments, fetchTrash, SearchItem } from "@pkg/common/message";
import { DocListChangeObserver } from "@pkg/renderer/helpers/docListChangeObserver";
import type { IDisposable } from "blocky-common/es/disposable";

export abstract class DataProvider implements IDisposable {
  readonly observer: DocListChangeObserver;
  constructor(readonly name: string, readonly uniqueId: string) {
    this.observer = new DocListChangeObserver(uniqueId);
    this.observer.start();
  }

  abstract request(): Promise<SearchItem[]>;

  dispose(): void {
    this.observer.dispose();
  }
}

export class RecentDataProvider extends DataProvider {
  constructor(uniqueId: string) {
    super("Recent documents", uniqueId);
  }

  async request(): Promise<SearchItem[]> {
    const resp = await recentDocuments.request({});
    return resp.data;
  }
}

export class TrashDataProvider extends DataProvider {
  constructor(uniqueId: string) {
    super("Trash", uniqueId);
  }

  async request(): Promise<SearchItem[]> {
    const resp = await fetchTrash.request({});
    return resp.data;
  }
}
