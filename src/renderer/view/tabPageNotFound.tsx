import { TabDelegate } from "./tabDelegate";
import { render, unmountComponentAtNode } from "preact/compat";
import { $on } from "blocky-common/es/dom";
import PageNotFound from "@pkg/renderer/components/pageNotFound";

export class TabPageNotFound extends TabDelegate {
  constructor(id: string) {
    super(id, "cuby-tab-page-not-found");
    this.title.set("Page not found");
    $on(this.container, "click", () => this.focus.emit());
  }

  override mount(parent: HTMLElement): void {
    super.mount(parent);
    render(<PageNotFound />, this.container);
  }

  override dispose(): void {
    unmountComponentAtNode(this.container);
    super.dispose();
  }
}
