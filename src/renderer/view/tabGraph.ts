import type { ForceGraphInstance } from "force-graph";
import { $on, clearAllChildren } from "blocky-common/es/dom";
import { debounce } from "lodash-es";
import { getGraphInfo } from "@pkg/common/message";
import mainController from "@pkg/renderer/mainController";
import { themeSingleton } from "@pkg/renderer/styles";
import { TabDelegate } from "./tabDelegate";

export class TabGraph extends TabDelegate {
  forceGraphModule: typeof import("force-graph") | undefined;
  #instance: ForceGraphInstance | undefined;
  #resizeObserver: ResizeObserver;

  constructor(tabId: string) {
    super(tabId, "cuby-tab-graph");
    this.title.set("Graph");

    this.#resizeObserver = new ResizeObserver(
      debounce(() => {
        if (!this.#instance) {
          return;
        }
        const rect = this.container.getBoundingClientRect();
        this.#instance.width(rect.width);
        this.#instance.height(rect.height);
      }, 200),
    );
    this.#resizeObserver.observe(this.container);

    $on(this.container, "click", () => this.focus.emit());
    themeSingleton.changed.on(() => this.initGraphModule());

    this.initGraphModule();
  }

  async initGraphModule() {
    clearAllChildren(this.container);
    this.forceGraphModule = await import("force-graph");
    const graphData = await getGraphInfo.request({});

    const theme = themeSingleton.get()!;
    const graph = this.forceGraphModule.default();
    this.#instance = graph(this.container)
      .graphData(graphData)
      .nodeCanvasObjectMode(() => "after")
      .nodeCanvasObject((node: any, ctx, globalScale) => {
        const label = node.label;
        const fontSize = 12 / globalScale;
        ctx.font = `${fontSize}px Sans-Serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = theme.app.color; //node.color;
        ctx.fillText(label, node.x, node.y + 18);
      })
      .linkColor(() => theme.app.borderColor)
      .nodeColor(() => "rgb(76,130,181)")
      .onNodeClick((node: any) => {
        mainController.openDocOnActiveTab(node.id);
      })
      .onNodeDragEnd((node) => {
        node.fx = node.x;
        node.fy = node.y;
      });
    const rect = this.container.getBoundingClientRect();
    this.#instance.width(rect.width);
    this.#instance.height(rect.height);
  }

  dispose(): void {
    this.#resizeObserver.disconnect();
    super.dispose();
  }
}
