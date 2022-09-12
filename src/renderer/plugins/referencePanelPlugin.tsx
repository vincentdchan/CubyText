import { type IPlugin, Embed, type EmbedInitOptions } from "blocky-core";
import { makePreactFollowerWidget } from "blocky-preact";
import { $on } from "blocky-common/es/dom";
import DocReferencesPanel from "@pkg/renderer/components/docReferencesPanel";
import ReferenceSpan from "@pkg/renderer/components/referenceSpan";
import { render, unmountComponentAtNode } from "preact/compat";
import mainController from "@pkg/renderer/mainController";
import "./referencePanelPlugin.scss";

class ReferenceEmbed extends Embed {
  static type = "reference";
  constructor(options: EmbedInitOptions) {
    super(options);
    this.element.className = "cuby-reference";
    $on(this.element as HTMLElement, "click", () => {
      mainController.openDocOnActiveTab(options.record.docId);
    });
    render(<ReferenceSpan docId={options.record.docId} />, this.element);
  }

  dispose() {
    unmountComponentAtNode(this.element);
  }
}

function referencePanelPlugin(): IPlugin {
  return {
    name: "reference-panel",
    embeds: [ReferenceEmbed],
    onInitialized(editor) {
      editor.keyDown.on((e: KeyboardEvent) => {
        if (e.key !== "[") {
          return;
        }
        editor.controller.enqueueNextTick(() => {
          const state = editor.state.cursorState;
          const blockElement = editor.controller.getBlockElementAtCursor();
          if (!blockElement || !state) {
            return;
          }
          if (blockElement.nodeName !== "Text") {
            return;
          }
          const textModel = blockElement.getTextModel("textContent")!;
          if (
            textModel.charAt(state.offset - 1) !== "[" ||
            textModel.charAt(state.offset - 2) !== "["
          ) {
            return;
          }
          editor.insertFollowerWidget(
            makePreactFollowerWidget(
              ({ controller, editingValue, closeWidget, atTop }) => (
                <DocReferencesPanel
                  controller={controller}
                  editingValue={editingValue}
                  closeWidget={closeWidget}
                  atTop={atTop}
                />
              ),
              { maxHeight: 300 },
            ),
          );
        });
      });
    },
  };
}

export default referencePanelPlugin;
