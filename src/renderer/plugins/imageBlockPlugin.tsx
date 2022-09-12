import { type TryParsePastedDOMEvent, type IPlugin } from "blocky-core";
import { BlockElement } from "blocky-data";
import { makeReactBlock, type ReactBlockRenderProps } from "blocky-preact";
import ImageBlock from "@pkg/renderer/blocks/imageBlock";

export const ImageBlockName = "Image";

export function makeImageBlockPlugin(): IPlugin {
  return {
    name: ImageBlockName,
    blocks: [
      makeReactBlock({
        name: ImageBlockName,
        component: (props: ReactBlockRenderProps) => (
          <ImageBlock
            controller={props.controller}
            blockElement={props.blockElement}
          />
        ),
        tryParsePastedDOM(e: TryParsePastedDOMEvent) {
          const { node, editorController } = e;
          const img = node.querySelector("img");
          if (img) {
            const newId = editorController.idGenerator.mkBlockId();
            const src = img.getAttribute("src");
            let attributes: object | undefined;
            if (src) {
              attributes = {
                src: src,
              };
            }
            const element = new BlockElement(ImageBlockName, newId, attributes);
            return element;
          }
        },
      }),
    ],
  };
}
