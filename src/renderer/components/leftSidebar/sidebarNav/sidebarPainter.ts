import type { SidebarNavItem } from "./sidebarNav";
import { themeSingleton } from "@pkg/renderer/styles";

export class SidebarPainter {
  #renderWidth = 0;
  #renderHeight = 0;
  #width = 0;
  #height = 0;
  #layoutItems: LayoutSidebarItem[] = [];
  selectedKey: string | undefined;
  constructor(
    private dom: HTMLCanvasElement,
    private context: CanvasRenderingContext2D,
    private data: SidebarNavItem[],
  ) {}

  get width() {
    return this.#width;
  }

  set width(v: number) {
    const ratio = window.devicePixelRatio;
    this.#width = v;
    this.#renderWidth = ratio * v;
    this.dom.width = this.#renderWidth;
    this.dom.style.width = v + "px";
  }

  get height() {
    return this.#height;
  }

  set height(v: number) {
    const ratio = window.devicePixelRatio;
    this.#height = v;
    this.#renderHeight = ratio * v;
    this.dom.height = this.#renderHeight;
    this.dom.style.height = v + "px";
  }

  clearHoverStates() {
    for (let i = 0, len = this.#layoutItems.length; i < len; i++) {
      this.#layoutItems[i].isHover = false;
    }
  }

  hitTest(x: number, y: number): LayoutSidebarItem | void {
    this.clearHoverStates();
    for (let i = 0, len = this.#layoutItems.length; i < len; i++) {
      const item = this.#layoutItems[i];
      if (
        x >= item.x &&
        x < item.x + item.width &&
        y >= item.y &&
        y < item.y + item.height
      ) {
        return item;
      }
    }
  }

  layout() {
    this.#layoutItems.length = 0;
    let yAcc = 0;
    for (let i = 0, len = this.data.length; i < len; i++) {
      const layoutItem = this.#layoutItem(this.data[i]);
      if (layoutItem) {
        layoutItem.y = yAcc;
        this.#layoutItems.push(layoutItem);
        yAcc += layoutItem.height;
      }
    }
  }

  #layoutItem(dataItem: SidebarNavItem): LayoutSidebarItem | void {
    const item = new LayoutSidebarItem(dataItem, this.context);
    item.width = this.#width;
    return item;
  }

  render() {
    this.context.clearRect(0, 0, this.#renderWidth, this.#renderHeight);
    for (let i = 0, len = this.#layoutItems.length; i < len; i++) {
      const item = this.#layoutItems[i];
      item.render(item.data.id === this.selectedKey);
    }
  }
}

export class LayoutSidebarItem {
  x = 0;
  y = 0;
  width = 0;
  height: number;
  isHover = false;
  static readonly padding = 8;
  static readonly font = "500 12px Arial, Sans-Serif";
  static readonly iconWidth: number = 10;
  static readonly iconPadding: number = 6;
  #offset = 0;
  constructor(
    readonly data: SidebarNavItem,
    private context: CanvasRenderingContext2D,
  ) {
    this.context.font = LayoutSidebarItem.font;
    const textMetrics = context.measureText(this.data.name);
    this.#offset = textMetrics.fontBoundingBoxDescent;
    this.height = textMetrics.width + LayoutSidebarItem.padding * 2;
    if (data.icon) {
      this.height +=
        LayoutSidebarItem.iconWidth + LayoutSidebarItem.iconPadding;
    }
  }

  render(selected?: boolean) {
    const ratio = window.devicePixelRatio;

    this.context.save();
    this.context.scale(ratio, ratio);

    if (this.isHover) {
      this.context.fillStyle = "rgba(0, 0, 0, 0.2)";
      this.context.fillRect(this.x, this.y, this.width, this.height);
    } else if (selected) {
      this.context.fillStyle = "rgba(0, 0, 0, 0.1)";
      this.context.fillRect(this.x, this.y, this.width, this.height);
    }

    const theme = themeSingleton.get()!;
    this.context.fillStyle = theme.app.iconColor;
    this.context.font = LayoutSidebarItem.font;
    this.context.translate(
      this.x,
      this.y + this.height - LayoutSidebarItem.padding,
    );
    this.context.rotate((-90 * Math.PI) / 180);
    let textX = 0;
    const textY = this.width / 2 + this.#offset;
    if (this.data.icon) {
      textX += LayoutSidebarItem.iconWidth + LayoutSidebarItem.iconPadding;
    }
    this.context.fillText(this.data.name, textX, textY);

    if (this.data.icon) {
      const xOffset = (this.width - LayoutSidebarItem.iconWidth) / 2 - 2;
      this.context.drawImage(
        this.data.icon,
        0,
        xOffset,
        LayoutSidebarItem.iconWidth,
        LayoutSidebarItem.iconWidth,
      );
    }

    this.context.restore();
  }
}
