import {
  makeReactBlock,
  DefaultBlockOutline,
  type ReactBlockRenderProps,
} from "blocky-preact";
import { ExplorerBlock } from "@pkg/renderer/blocks/explorerBlock";
import { type IPlugin } from "blocky-core";

export const ExplorerBlockName = "DocumentsExplorer";

export function makeExplorerBlockPlugin(): IPlugin {
  return {
    name: ExplorerBlockName,
    blocks: [
      makeReactBlock({
        name: ExplorerBlockName,
        component: (props: ReactBlockRenderProps) => (
          <DefaultBlockOutline outlineColor="var(--app-border-color)">
            <ExplorerBlock
              controller={props.controller}
              blockElement={props.blockElement}
            />
          </DefaultBlockOutline>
        ),
      }),
    ],
  };
}
