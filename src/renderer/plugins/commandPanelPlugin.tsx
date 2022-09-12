import { type IPlugin } from "blocky-core";
import { makePreactFollowerWidget } from "blocky-preact";
import SlashCommandPanel from "@pkg/renderer/components/slashCommandPanel";

function commandPanelPlugin(): IPlugin {
  return {
    name: "command-panel",
    onInitialized(editor) {
      editor.keyDown.on((e: KeyboardEvent) => {
        if (e.key !== "/") {
          return;
        }
        editor.controller.enqueueNextTick(() => {
          const blockElement = editor.controller.getBlockElementAtCursor();
          if (!blockElement) {
            return;
          }
          if (blockElement.nodeName !== "Text") {
            return;
          }
          editor.insertFollowerWidget(
            makePreactFollowerWidget(
              ({ controller, closeWidget, editingValue, atTop }) => {
                const focusedNode = controller.getBlockElementAtCursor();
                return (
                  <SlashCommandPanel
                    editingValue={editingValue}
                    focusedNode={focusedNode}
                    controller={controller}
                    closeWidget={closeWidget}
                    onClose={closeWidget}
                    atTop={atTop}
                    style={{ maxHeight: 240 }}
                  />
                );
              },
              { maxHeight: 260 },
            ),
          );
        });
      });
    },
  };
}

export default commandPanelPlugin;
