import { render } from "preact";
import { unmountComponentAtNode } from "preact/compat";
import SearchBox from "@pkg/renderer/components/searchBox";
import { DivContainer } from "blocky-common/es/dom";
import { Slot } from "blocky-common/es";
import type { EditorController } from "blocky-core";
import type { IDisposable } from "blocky-common/es/disposable";

function generatePlaceholder(): Comment {
  return document.createComment("searchbox-placeholder");
}

export class SearchBoxRenderer implements IDisposable {
  #container: SearchBoxContainer | undefined;
  #placeholder: Comment | undefined;

  constructor(
    private parent: HTMLElement,
    private controller: EditorController,
  ) {
    this.#placeholder = generatePlaceholder();
    parent.insertBefore(this.#placeholder, parent.firstChild);
  }

  toggle() {
    if (this.#placeholder) {
      const container = new SearchBoxContainer(this.controller);
      container.close.on(() => this.toggle());
      this.parent.replaceChild(container.container, this.#placeholder);
      container.init();

      this.#container = container;
      this.#placeholder = undefined;
    } else if (this.#container) {
      const comment = generatePlaceholder();
      this.parent.replaceChild(comment, this.#container.container);

      this.#container.dispose();
      this.#container = undefined;
      this.#placeholder = comment;
    }
  }

  dispose(): void {
    this.#container?.dispose();
  }
}

class SearchBoxContainer extends DivContainer {
  close = new Slot();

  constructor(private controller: EditorController) {
    super("cuby-search-box-renderer");
  }

  init() {
    render(
      <SearchBox
        onClose={() => this.close.emit()}
        controller={this.controller}
      />,
      this.container,
    );
  }

  dispose(): void {
    unmountComponentAtNode(this.container);
    this.close.dispose();
    super.dispose();
  }
}
