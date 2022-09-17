import Fuse from "fuse.js";
import { type SearchItem } from "@pkg/common/message";
import { findIndex } from "lodash-es";
import { performance } from "perf_hooks";
import { FullDatabaseSnapshot } from "@pkg/main/services/documentService";
import logger from "@pkg/main/services/logService";

export class SearchService {
  #items: SearchItem[];
  #fuse: Fuse<SearchItem>;

  constructor() {
    this.#items = [];

    this.#fuse = new Fuse(this.#items, {
      keys: ["title"],
    });
  }

  async init(fullSnapshot: FullDatabaseSnapshot) {
    const begin = performance.now();

    [...fullSnapshot.documents.values()].forEach((docState) => {
      this.#items.push({
        key: docState.id,
        title: docState.title,
        createdAt: docState.createdAt,
        modifiedAt: docState.modifiedAt,
      });
    });

    this.#fuse = new Fuse(this.#items, {
      keys: ["title"],
    });

    logger.info(`init search service in ${performance.now() - begin}ms`);
  }

  search(content: string): SearchItem[] {
    const result = this.#fuse.search(content, {
      limit: 10,
    });
    const items = result.map((item) => item.item);
    return items;
  }

  reportItem(searchItem: SearchItem) {
    const index = findIndex(this.#items, (item) => item.key === searchItem.key);
    logger.debug("report search item:", searchItem.title, "index", index);

    if (index >= 0) {
      this.#fuse.removeAt(index);
    }

    this.#fuse.add(searchItem);
  }

  deleteItem(id: string) {
    const index = findIndex(this.#items, (item) => item.key === id);

    if (index >= 0) {
      this.#fuse.removeAt(index);
    }
  }
}
