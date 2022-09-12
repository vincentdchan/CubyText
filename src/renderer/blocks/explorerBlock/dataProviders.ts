import { recentDocuments, fetchTrash, SearchItem } from "@pkg/common/message";
import { type DataProvider } from "@pkg/renderer/components/documentList";

export class RecentDataProvider implements DataProvider {
  get name() {
    return "Recent documents";
  }

  async request(): Promise<SearchItem[]> {
    const resp = await recentDocuments.request({});
    return resp.data;
  }
}

export class TrashDataProvider implements DataProvider {
  get name() {
    return "Trash";
  }

  async request(): Promise<SearchItem[]> {
    const resp = await fetchTrash.request({});
    return resp.data;
  }
}
