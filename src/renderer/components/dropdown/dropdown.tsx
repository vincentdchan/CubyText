import {
  Component,
  ComponentChildren,
  createRef,
  JSX,
  type RefObject,
} from "preact";
import { createPortal } from "preact/compat";
import Mask from "@pkg/renderer/components/mask";

export enum DropdownDirection {
  BottomWithLeftAligned = 1,
  BottomWithRightAligned = 2,
}

export interface ChildRenderOptions {
  ref: RefObject<any>;
  show: () => void;
}

const defaultWidth = 240;
const maxHeight = 240;
const minHeight = 120;

export interface DropdownProps {
  offsetY?: number;
  direction?: DropdownDirection;
  width?: number;
  overlay?: (style: JSX.CSSProperties) => ComponentChildren;
  children: (options: ChildRenderOptions) => ComponentChildren;
}

interface DropdownState {
  show: boolean;
  x: number;
  y: number;
  maxHeight: number;
}

export interface DropdownInput {
  rect: DOMRect;
  dropdownWidth: number;
  offsetY: number;
  direction: DropdownDirection;
}

export interface DropdownOutput {
  x: number;
  y: number;
  maxHeight: number;
}

function getXByDirection(input: DropdownInput): number {
  const x = input.rect.x;
  if (input.direction === DropdownDirection.BottomWithRightAligned) {
    return x + input.rect.width - input.dropdownWidth;
  }
  return x;
}

function computeMenuOnTop(input: DropdownInput): DropdownOutput {
  const x = getXByDirection(input);
  const { rect, offsetY } = input;
  const yBottom = rect.y - rect.height - offsetY;

  let height = maxHeight;
  let y = yBottom - height;
  if (y < 0) {
    y = 0;
    height = yBottom;
  }

  return { x, y, maxHeight: height };
}

export function computeDropdown(input: DropdownInput): DropdownOutput {
  const x = getXByDirection(input);
  const { rect, offsetY } = input;
  const y = rect.y + rect.height + offsetY;
  let height = maxHeight;
  if (y + height >= window.innerHeight) {
    height = window.innerHeight - y;
  }

  if (height < minHeight) {
    return computeMenuOnTop(input);
  }

  return { x, y, maxHeight };
}

class Dropdown extends Component<DropdownProps, DropdownState> {
  #childRef: RefObject<HTMLElement> = createRef();

  constructor(props: DropdownProps) {
    super(props);
    this.state = {
      show: false,
      x: 0,
      y: 0,
      maxHeight: maxHeight,
    };
  }

  #show = () => {
    const rect = this.#childRef.current!.getBoundingClientRect();
    const offsetY = this.props.offsetY ?? 8;
    const dropdownWidth = this.props.width ?? defaultWidth;

    const output = computeDropdown({
      rect,
      offsetY,
      direction:
        this.props.direction ?? DropdownDirection.BottomWithLeftAligned,
      dropdownWidth,
    });

    this.setState({
      show: true,
      x: output.x,
      y: output.y,
      maxHeight: output.maxHeight,
    });
  };

  #handleMaskClicked = () => {
    this.setState({
      show: false,
    });
  };

  override render(props: DropdownProps, state: DropdownState) {
    const { children, overlay } = props;
    return (
      <>
        {children({ ref: this.#childRef, show: this.#show })}
        {state.show &&
          createPortal(
            <Mask onClick={this.#handleMaskClicked}>
              {overlay?.({
                position: "fixed",
                width: props.width ?? defaultWidth,
                left: state.x,
                top: state.y,
                maxHeight: state.maxHeight,
              })}
            </Mask>,
            document.body,
          )}
      </>
    );
  }
}

export default Dropdown;
