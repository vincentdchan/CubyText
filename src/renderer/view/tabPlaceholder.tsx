import { Slot } from "blocky-common/es/events";
import { unmountComponentAtNode } from "preact/compat";
import { $on } from "blocky-common/es/dom";
import { render } from "preact";
import { TabDelegate } from "./tabDelegate";
import mainController from "@pkg/renderer/mainController";
import TabPlaceholder from "@pkg/renderer/components/tabPlaceholder";
import { homeId } from "@pkg/common/constants";

export class TabPlaceholderRenderer extends TabDelegate {
  readonly onCreateNewPage = new Slot();
  constructor(id: string) {
    super(id, "cuby-tab-placeholder-container");
    this.title.set("Get started");
    $on(this.container, "click", () => this.focus.emit());
  }

  #handleGoHome = () => {
    mainController.focusedTabId.set(this.id);
    mainController.openDocOnActiveTab(homeId);
  };

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    render(
      <TabPlaceholder
        onGoHome={this.#handleGoHome}
        onCreatePage={() => this.onCreateNewPage.emit()}
        onOpenPage={() => mainController.openQuickSearchPanel()}
        tabId={this.id}
      />,
      this.container,
    );
  }

  override dispose(): void {
    unmountComponentAtNode(this.container);
    super.dispose();
  }
}
