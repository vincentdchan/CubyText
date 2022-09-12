import { isUndefined } from "lodash-es";
import { Tab } from "./tab";
import { Split, TabResizeEvent } from "./split";
import { makeDefaultIdGenerator } from "@pkg/main/helpers/idHelper";
import "./tabsManager.scss";
import mainController from "../mainController";

const idHelper = makeDefaultIdGenerator();

/**
 * This class can be extended in the future.
 * So don't use a react component there.
 */
export class TabsManager {
  static instance: TabsManager | undefined;
  static MinWidthPerTab = 320;

  readonly tabs: Tab[] = [];
  readonly tabsMap: Map<string, Tab> = new Map();

  #domObserver: ResizeObserver;
  #parent: HTMLElement | undefined;
  #splits: Split[] = [];
  #containerWidth = 0;
  #renderedWidth = 0;

  constructor() {
    if (!isUndefined(TabsManager.instance)) {
      throw new Error("multiple instances");
    }
    TabsManager.instance = this;
    this.#domObserver = new ResizeObserver(this.#fetchWidthAndRender);
  }

  #fetchWidthAndRender = () => {
    const oldWith = this.#renderedWidth;
    this.#fetchWidth();
    this.#reallocateWidth(oldWith);
  };

  #fetchWidth() {
    const rect = this.#parent?.getBoundingClientRect();
    if (rect) {
      this.#containerWidth = rect.width;
    }
  }

  #createTab(): Tab {
    const id = idHelper.mkTabId();
    const tab = new Tab(id);
    this.tabsMap.set(id, tab);

    tab.mount(this.#parent!);
    if (this.tabs.length > 0) {
      tab.initTabTitle();
    }
    tab.onClose.on(() => {
      const index = this.tabs.indexOf(tab);
      if (index < 0) {
        return;
      }
      tab.dispose();
      this.tabsMap.delete(tab.id);
      this.tabs.splice(index, 1);

      if (index === this.#splits.length) {
        const split = this.#splits[index - 1];
        split.dispose();
        this.#splits.splice(index - 1, 1);
      } else {
        const split = this.#splits[index];
        split.dispose();
        this.#splits.splice(index, 1);
      }

      this.#distributeTabs();
    });
    this.tabs.push(tab);
    return tab;
  }

  #createSplit(): Split {
    const split = new Split();
    split.mount(this.#parent!);
    this.#splits.push(split);
    split.resizing.on((evt: TabResizeEvent) =>
      this.#handleTabResized(split, evt),
    );
    return split;
  }

  #handleTabResized(split: Split, evt: TabResizeEvent) {
    const index = this.#splits.indexOf(split);
    if (index < 0) {
      return;
    }
    const deltaX = evt.resizePoint.x - evt.startState.point.x;
    this.#moveSplitWithDelta(index, deltaX);
  }

  #moveSplitWithDelta(index: number, deltaX: number): boolean {
    const split = this.#splits[index];
    const leftTab = this.tabs[index];
    const rightTab = this.tabs[index + 1];

    if (leftTab.width + deltaX < TabsManager.MinWidthPerTab) {
      if (index === 0) {
        return false;
      }
      const moveLeftTab = this.#moveSplitWithDelta(index - 1, deltaX);
      if (!moveLeftTab) {
        return false;
      }
    }

    if (rightTab.width - deltaX < TabsManager.MinWidthPerTab) {
      if (index === this.#splits.length - 1) {
        return false;
      }
      const moveRightTab = this.#moveSplitWithDelta(index + 1, deltaX);
      if (!moveRightTab) {
        return false;
      }
    }

    leftTab.width += deltaX;
    split.left += deltaX;
    rightTab.left += deltaX;
    rightTab.width -= deltaX;
    return true;
  }

  splitTab(): Tab | undefined {
    if (!this.#parent) {
      return;
    }

    const tab = this.#createTab();

    this.#createSplit();

    this.#distributeTabs();

    mainController.focusedTabId.set(tab.id);

    return tab;
  }

  #distributeTabs() {
    if (this.tabs.length === 1) {
      this.tabs[0].left = 0;
      const newWith = Math.max(
        this.#containerWidth,
        TabsManager.MinWidthPerTab,
      );
      this.#renderedWidth = newWith;
      this.tabs[0].width = newWith;
      this.tabs[0].removeTabTitle();
      return 0;
    }

    const widthPerTab = Math.max(
      (1 / this.tabs.length) * this.#containerWidth,
      TabsManager.MinWidthPerTab,
    );

    this.#renderedWidth = 0;

    for (let i = 0, len = this.tabs.length; i < len; i++) {
      this.tabs[i].width = widthPerTab;
      this.tabs[i].left = widthPerTab * i;
      this.#renderedWidth += widthPerTab;
      if (i < len - 1) {
        this.#splits[i].left = widthPerTab * (i + 1);
      }
    }

    if (this.tabs.length === 2) {
      for (const tab of this.tabs) {
        tab.initTabTitle();
      }
    }
  }

  mount(parent: HTMLElement): void {
    this.#parent = parent;
    this.#fetchWidth();
    this.#domObserver.observe(this.#parent);

    this.#createTab();
  }

  /**
   * Depends on the original ratios after
   * the window resized.
   */
  #reallocateWidth(oldWith: number) {
    if (this.tabs.length === 1) {
      this.tabs[0].left = 0;
      this.tabs[0].left = 0;
      const newWidth = Math.max(
        this.#containerWidth,
        TabsManager.MinWidthPerTab,
      );
      this.tabs[0].width = newWidth;
      this.#renderedWidth = newWidth;
      this.tabs[0].removeTabTitle();
      return 0;
    }

    const ratios: number[] = Array(this.tabs.length);
    for (let i = 0, len = this.tabs.length; i < len; i++) {
      ratios[i] = this.tabs[i].width / oldWith;
    }

    this.#renderedWidth = 0;
    let acc = 0;
    for (let i = 0, len = this.tabs.length; i < len; i++) {
      const newWidth = Math.max(
        ratios[i] * this.#containerWidth,
        TabsManager.MinWidthPerTab,
      );
      this.tabs[i].left = acc;
      this.tabs[i].width = newWidth;
      this.#renderedWidth += newWidth;
      acc += newWidth;
      if (i < len - 1) {
        this.#splits[i].left = acc;
      }
    }
  }

  dispose(): void {
    TabsManager.instance = undefined;
  }
}
