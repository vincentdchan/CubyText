import { $on, DivContainer, elem } from "blocky-common/es/dom";
import { Slot } from "blocky-common/es/events";
import { TabPageNotFound } from "./tabPageNotFound";
import { TabPlaceholderRenderer } from "./tabPlaceholder";
import { createDocumentMessage } from "@pkg/common/message";
import { faClose } from "@fortawesome/free-solid-svg-icons";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { TabEditor } from "./tabEditor";
import { TabDelegate } from "./tabDelegate";
import mainController from "@pkg/renderer/mainController";
import { ObservableFixedSizeStack } from "@pkg/renderer/helpers/observableFixedSizeStack";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import { TabGraph } from "./tabGraph";

const historySize = 8;

class TabTitle extends DivContainer {
  readonly closeBtn = new CloseButton();
  readonly click: Slot<MouseEvent>;
  #textContainer = elem("div", "cuby-tab-title-text");
  #content = "Get started";
  #focused = false;

  constructor() {
    super("cuby-tab-title cuby-cm-noselect");
    this.container.appendChild(this.#textContainer);
    this.#textContainer.textContent = this.#content;
    this.closeBtn.mount(this.container);
    this.click = Slot.fromEvent(this.container, "click");
  }

  get focused() {
    return this.#focused;
  }

  set focused(v: boolean) {
    this.#focused = v;
    if (v) {
      this.container.classList.add("focused");
    } else {
      this.container.classList.remove("focused");
    }
  }

  get content() {
    return this.#content;
  }

  set content(v: string) {
    if (v === this.#content) {
      return;
    }
    this.#content = v;
    this.#textContainer.textContent = v;
  }
}

class CloseButton extends DivContainer {
  readonly click: Slot = new Slot();
  constructor() {
    super("cuby-tab-title-close-btn");
    const iconData = icon(faClose);
    this.container.innerHTML = iconData.html[0];
    $on(this.container, "click", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.click.emit();
    });
  }
}

export class Tab extends DivContainer {
  #activeTab: TabDelegate | undefined;
  #width = 0;
  #left = 0;
  #title: TabTitle | undefined;
  #tabContentContainer: HTMLDivElement;
  #focused: boolean;

  private disposables: IDisposable[] = [];

  readonly docHistory = new ObservableFixedSizeStack<string>(historySize);
  readonly onClose = new Slot();

  get activeTab(): TabDelegate | undefined {
    return this.#activeTab;
  }

  constructor(readonly id: string) {
    super("cuby-tab");
    this.#tabContentContainer = elem("div", "cuby-content-container");
    this.container.appendChild(this.#tabContentContainer);
    this.#activeTab = this.#createNewPlaceholderRenderer();
    this.#focused = mainController.focusedTabId.get() === id;
    mainController.focusedTabId.changed.on((id: string | undefined) => {
      this.#setFocusState(id === this.id);
    });
  }

  #setFocusState(focused: boolean) {
    if (this.#focused === focused) {
      return;
    }

    if (this.#title) {
      this.#title.focused = focused;
    }
    this.#focused = focused;
  }

  focused(): boolean {
    return this.#focused;
  }

  initTabTitle() {
    if (this.#title) {
      return;
    }
    this.#title = new TabTitle();
    this.#title.click.on(() => this.focus());
    this.#title.closeBtn.click.pipe(this.onClose);
    this.container.insertBefore(
      this.#title.container,
      this.container.firstChild,
    );
    if (this.#activeTab) {
      this.#title.content = this.#activeTab.title.get() || "Untitled document";
    }
  }

  initGraph() {
    const graphTab = new TabGraph(this.id);
    this.#initTab(graphTab);
  }

  removeTabTitle() {
    if (!this.#title) {
      return;
    }
    this.#title.dispose();
    this.#title = undefined;
  }

  #createNewPlaceholderRenderer(): TabPlaceholderRenderer {
    const result = new TabPlaceholderRenderer(this.id);
    result.onCreateNewPage.on(() => this.createPage());
    this.#initTab(result);
    return result;
  }

  refresh() {
    const delegate = this.#activeTab;
    if (!delegate) {
      return;
    }
    if (delegate instanceof TabEditor) {
      this.initTabEditor(delegate.docId);
      return;
    }
    if (delegate instanceof TabGraph) {
      this.initGraph();
    }
  }

  async createPage() {
    const resp = await createDocumentMessage.request({}); // create page first in case of failed
    console.log("create new page id:", resp.id);

    this.#activeTab?.dispose();
    this.#activeTab = undefined;

    this.initTabEditor(resp.id);
  }

  goBack() {
    const docId = this.docHistory.pop();
    if (!docId) {
      return;
    }
    this.initTabEditor(docId);
  }

  focus() {
    mainController.focusedTabId.set(this.id);
  }

  initTabEditor(docId: string) {
    if (this.#activeTab instanceof TabEditor) {
      this.docHistory.push(this.#activeTab.docId);
    }
    const tabEditor = new TabEditor(this.id, docId);
    this.#initTab(tabEditor);
  }

  navigatePageNotFound() {
    const pageNotFound = new TabPageNotFound(this.id);
    this.#initTab(pageNotFound);
  }

  #initTab(delegate: TabDelegate) {
    if (this.#activeTab) {
      this.#activeTab.dispose();
      this.#activeTab = undefined;
    }
    if (this.#title) {
      this.#title.content = delegate.title.get() || "Untitled document";
    }
    delegate.title.changed.on((newValue) => {
      if (this.#title) {
        this.#title.content = newValue || "Untitled document";
      }
    });
    delegate.focus.on(() => this.focus());
    delegate.trashed.on(() => this.navigatePageNotFound());
    delegate.mount(this.#tabContentContainer);
    this.#activeTab = delegate;
  }

  mount(parent: HTMLElement): void {
    super.mount(parent);
    this.#activeTab?.mount(this.container);
  }

  get width() {
    return this.#width;
  }

  set width(v: number) {
    this.#width = v;
    this.container.style.width = v + "px";
  }

  get left() {
    return this.#left;
  }

  set left(v: number) {
    this.#left = v;
    this.container.style.left = v + "px";
  }

  get docId(): string | undefined {
    if (this.#activeTab instanceof TabEditor) {
      return this.#activeTab.docId;
    }
    return undefined;
  }

  dispose(): void {
    this.#activeTab?.dispose();
    this.#activeTab = undefined;
    this.#title?.dispose();
    this.#title = undefined;
    flattenDisposable(this.disposables).dispose();

    if (mainController.focusedTabId.get() === this.id) {
      mainController.focusedTabId.set(undefined);
    }

    super.dispose();
  }
}
