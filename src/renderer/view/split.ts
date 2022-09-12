import { Slot } from "blocky-common/es/events";
import { DivContainer, $on, listenWindow, elem } from "blocky-common/es/dom";
import {
  flattenDisposable,
  type IDisposable,
} from "blocky-common/es/disposable";

export interface Point {
  x: number;
  y: number;
}

export interface dragStartState {
  left: number;
  point: Point;
}

export class TabResizeEvent {
  constructor(
    readonly startState: dragStartState,
    readonly resizePoint: Point,
  ) {}
}

export class Split extends DivContainer {
  static Width = 5;
  #left = 0;
  #dragStartPoint: dragStartState | undefined;
  readonly resizing: Slot<TabResizeEvent> = new Slot();
  #central: HTMLDivElement;
  private disposables: IDisposable[] = [];
  constructor() {
    super("cuby-split");
    this.container.style.width = Split.Width + "px";
    $on(this.container, "mousedown", (e: MouseEvent) => {
      this.#beginDrag(e);
    });
    this.disposables.push(
      listenWindow("mouseup", () => {
        this.#dragStartPoint = undefined;
        window.removeEventListener("mousemove", this.#handleMouseMove);
      }),
    );

    this.#central = elem("div", "central");
    this.container.append(this.#central);
  }

  get left() {
    return this.#left;
  }

  set left(v: number) {
    if (v === this.#left) {
      return;
    }
    this.#left = v;
    this.container.style.left = ((v - 2) | 0) + "px";
  }

  #beginDrag(e: MouseEvent) {
    this.#dragStartPoint = {
      left: this.#left,
      point: {
        x: e.clientX,
        y: e.clientY,
      },
    };
    window.addEventListener("mousemove", this.#handleMouseMove);
  }

  #handleMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    this.resizing.emit(
      new TabResizeEvent(this.#dragStartPoint!, {
        x: e.clientX,
        y: e.clientY,
      }),
    );
    this.#dragStartPoint!.point = {
      x: e.clientX,
      y: e.clientY,
    };
  };

  override dispose(): void {
    flattenDisposable(this.disposables).dispose();
    super.dispose();
  }
}
