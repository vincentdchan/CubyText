import { isUndefined } from "lodash-es";
import { Component, VNode, cloneElement, RefObject, createRef } from "preact";
import { createPortal } from "preact/compat";
import { $on } from "blocky-common/es/dom";
import { IDisposable, flattenDisposable } from "blocky-common/es/disposable";
import "./Tooltip.css";

interface Size {
  width: number;
  height: number;
}

const PADDING = 4;
const PRESERVE_PADDING = 24;
const tooltipTimeout = 600;

function getPopupCoord(
  direction: Direction,
  rect: DOMRect,
  popupSize: Size,
): [number, number] {
  let x = rect.x;
  let y = rect.y;
  const { width: popupWidth, height: popupHeight } = popupSize;
  const tooltipWidth = popupWidth | 0;
  switch (direction) {
    case "top": {
      x += (rect.width / 2 - tooltipWidth / 2) | 0;
      y = (y - popupHeight - PADDING) | 0;
      break;
    }

    case "bottom": {
      x += (rect.width / 2 - tooltipWidth / 2) | 0;
      y += rect.height;
      y += PADDING;
      break;
    }

    case "topLeftAligned": {
      y -= popupHeight;
      y -= PADDING;
      break;
    }

    case "bottomLeftAligned": {
      y += rect.height;
      y += PADDING;
      break;
    }

    case "bottomRightAligned": {
      x += rect.width;
      x -= tooltipWidth;
      y += rect.height;
      y += PADDING;
      break;
    }

    case "right": {
      x += (rect.width + PADDING) | 0;
      break;
    }

    default: {
    }
  }

  const { innerWidth } = window;
  if (x + tooltipWidth >= innerWidth) {
    x = innerWidth - PRESERVE_PADDING - tooltipWidth;
  }

  return [x, y];
}

export interface TooltipProps {
  direction?: Direction;
  children: VNode;
  content: string;
  childRef?: RefObject<any>;
}

export type Direction =
  | "top"
  | "topLeftAligned"
  | "bottom"
  | "bottomLeftAligned"
  | "bottomRightAligned"
  | "right";

interface TooltipState {
  showTooltip: boolean;
  x: number;
  y: number;
}

class Tooltip extends Component<TooltipProps, TooltipState> {
  private disposables: IDisposable[] = [];
  #childRef: RefObject<any>;
  #tooltipRef: RefObject<HTMLDivElement> = createRef();
  #tooltipDebounced: any;

  constructor(props: TooltipProps) {
    super(props);
    this.#childRef = props.childRef ?? createRef();
    this.state = {
      showTooltip: false,
      x: 0,
      y: 0,
    };
  }

  override componentDidMount() {
    const refObj = this.#childRef.current;
    if (refObj instanceof HTMLElement) {
      this.disposables.push($on(refObj, "mouseenter", this.#handleMouseEnter));
      this.disposables.push($on(refObj, "mouseleave", this.#handleMouseLeave));
    } else {
      console.error("not an html element:", refObj);
    }
  }

  override componentDidUpdate(
    prevProps: TooltipProps,
    prevState: TooltipState,
  ) {
    if (!prevState.showTooltip && this.state.showTooltip) {
      window.requestAnimationFrame(() => {
        this.#updateTooltipCoord();
      });
    }
  }

  #updateTooltipCoord() {
    const currentTooltip = this.#tooltipRef.current;
    const target = this.#childRef.current;
    if (!currentTooltip || !target) {
      return;
    }
    const tooltipRect = currentTooltip.getBoundingClientRect();
    const targetRect = (target as HTMLElement).getBoundingClientRect();
    const coord = getPopupCoord(this.props.direction ?? "bottom", targetRect, {
      width: tooltipRect.width,
      height: tooltipRect.height,
    });
    this.setState({
      x: coord[0],
      y: coord[1],
    });
  }

  #handleMouseEnter = () => {
    if (!isUndefined(this.#tooltipDebounced)) {
      clearTimeout(this.#tooltipDebounced);
    }
    this.#tooltipDebounced = setTimeout(() => {
      this.#tooltipDebounced = undefined;
      this.setState({
        showTooltip: true,
        x: -1000,
        y: -1000,
      });
    }, tooltipTimeout);
  };

  #handleMouseLeave = () => {
    if (!isUndefined(this.#tooltipDebounced)) {
      clearTimeout(this.#tooltipDebounced);
      this.#tooltipDebounced = undefined;
    }
    if (this.state.showTooltip) {
      this.setState({
        showTooltip: false,
      });
    }
  };

  override componentWillUnmount() {
    flattenDisposable(this.disposables).dispose();
  }

  override render({ children }: TooltipProps, state: TooltipState) {
    const { showTooltip, x, y } = state;
    return (
      <>
        {cloneElement(children, {
          ref: this.#childRef,
        })}
        {showTooltip &&
          createPortal(
            <div
              className="cuby-tooltip cuby-cm-noselect cuby-cm-oneline"
              style={{ top: y + "px", left: x + "px" }}
              ref={this.#tooltipRef}
            >
              {this.props.content}
            </div>,
            document.getElementById("cuby-tooltips")!,
          )}
      </>
    );
  }
}

export default Tooltip;
