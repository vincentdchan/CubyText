import { IDisposable } from "blocky-common/es/disposable";
import { Cell } from "blocky-common/es/cell";
import { isUndefined } from "lodash-es";
import { exportSnapshot } from "@pkg/common/message";
import { TabsManager } from "./view/tabsManager";
import { Tab } from "./view/tab";
import { TabEditor } from "./view/tabEditor";
import { TabGraph } from "./view/tabGraph";
import isHotkey from "is-hotkey";

class MainController {
  readonly focusedTabId: Cell<string | undefined> = new Cell(undefined);

  #objects: any = {};

  constructor() {
    this.listenHotKeys();

    (window as any).__cubyTextMainController = this;
  }

  async exportActiveSnapshot() {
    const tabId = this.focusedTabId.get();
    if (!tabId) {
      return;
    }
    const tab = TabsManager.instance?.tabsMap.get(tabId);
    if (!tab) {
      return;
    }
    const docId = tab.docId;
    if (!docId) {
      return;
    }

    return exportSnapshot.request({ docId });
  }

  jumpTo(blockId: string) {
    const activeTabId = this.focusedTabId.get();
    if (isUndefined(activeTabId)) {
      return;
    }
    const tab = TabsManager.instance?.tabsMap.get(activeTabId);
    if (!tab) {
      return;
    }

    if (tab.activeTab instanceof TabEditor) {
      tab.activeTab.jumpTo(blockId);
    }
  }

  listenHotKeys() {
    window.addEventListener("keydown", this.handleKeydown);
  }

  handleKeydown = (e: KeyboardEvent) => {
    if (isHotkey("mod+w", e)) {
      // TODO: close this tab
      e.preventDefault();
    } else if (isHotkey("mod+t", e)) {
      e.preventDefault();
      this.createANewDoc();
    } else if (isHotkey("mod+r", e)) {
      e.preventDefault();
      this.refreshCurrentTab();
    } else if (isHotkey("mod+\\", e)) {
      e.preventDefault();
      const tabsManager = TabsManager.instance;
      tabsManager?.splitTab();
    } else if (isHotkey("mod+f", e)) {
      e.preventDefault();
      this.toggleSearchBoxOnCurrentTab();
    }
  };

  toggleSearchBoxOnCurrentTab() {
    const tab = this.#getFocusedTab();
    if (!tab) {
      return;
    }

    const { activeTab } = tab;
    if (activeTab instanceof TabEditor) {
      activeTab.toggleSearchBox();
    }
  }

  refreshCurrentTab() {
    const tab = this.#getFocusedTab();
    if (!tab) {
      return;
    }
    tab.refresh();
  }

  #getFocusedTab(): Tab | undefined {
    const tabsManager = TabsManager.instance;
    if (!tabsManager) {
      return;
    }
    const focusedId = this.focusedTabId.get();
    if (!focusedId) {
      return;
    }
    return tabsManager.tabsMap.get(focusedId);
  }

  bind(obj: any, names: string[]): IDisposable {
    for (const name of names) {
      const exist = this.#objects[name];
      if (exist) {
        exist.push(obj);
      } else {
        this.#objects[name] = [obj];
      }
    }
    return {
      dispose: () => {
        for (const name of names) {
          const exist = this.#objects[name];
          if (!exist) {
            continue;
          }
          this.#objects[name] = exist.filter((o: any) => o !== obj);
          if (this.#objects[name].length === 0) {
            this.#objects[name] = undefined;
          }
        }
      },
    };
  }

  openDocOnActiveTab(docId: string) {
    const tab = this.#getFocusedTab();
    if (isUndefined(tab)) {
      return;
    }

    if (tab.activeTab instanceof TabEditor && tab.activeTab.docId === docId) {
      return;
    }

    tab.initTabEditor(docId);
  }

  /**
   * If graph tab is opened, focus it.
   * If the current view is empty, turn it into graph.
   * Otherwise, split tabs, and open graph view.
   */
  openGraphTab() {
    const tabsManager = TabsManager.instance;
    if (!tabsManager) {
      return;
    }
    for (const tab of tabsManager.tabs) {
      if (tab.activeTab instanceof TabGraph) {
        if (this.focusedTabId.get() === tab.id) {
          return;
        }
        this.focusedTabId.set(tab.id);
        return;
      }
    }

    const currentTab = this.focusedTabId.get();
    if (!isUndefined(currentTab)) {
      const tab = tabsManager.tabsMap.get(currentTab)!;
      if (!tab.activeTab) {
        tab.initGraph();
        return;
      }
    }

    const newTab = tabsManager.splitTab();
    if (newTab) {
      newTab.initGraph();
    }
  }

  /**
   * 1. Found a tab is free
   * 2. Create a new tab
   */
  createANewDoc() {
    const tabsManager = TabsManager.instance;
    if (!tabsManager) {
      return;
    }

    let foundTab: Tab | undefined;
    for (const tab of tabsManager.tabs) {
      const activeTab = tab.activeTab;
      if (!activeTab || !(activeTab instanceof TabEditor)) {
        foundTab = tab;
        break;
      }
    }

    if (!foundTab) {
      const newTab = tabsManager.splitTab();
      if (!newTab) {
        return;
      }
      return newTab.createPage();
    }

    foundTab.createPage();
  }

  openQuickSearchPanel = () => this.emits("openQuickSearchPanel");

  emits(name: string, ...args: any[]) {
    const objects = this.#objects[name];
    if (Array.isArray(objects)) {
      for (const obj of objects) {
        obj[name].call(obj, ...args);
      }
    }
  }
}

export default new MainController();
