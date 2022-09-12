import { Component, createRef, JSX } from "preact";
import "./virtualList.scss";

export interface Data {
  key: string;
}

export interface VirtualListProps {
  flex?: boolean;
  data: Data[];
  itemHeight: number;
  itemRenderer: (item: Data, style: JSX.CSSProperties) => JSX.Element;
}

interface VirtualListState {
  height: number;
}

export class VirtualList extends Component<VirtualListProps, VirtualListState> {
  #containerRef = createRef<HTMLDivElement>();
  #contentRef = createRef<HTMLDivElement>();
  #resizeObserver: ResizeObserver;

  #scrollTop = 0;
  #scrollHeight = 0;
  #containerHeight = 0;

  constructor(props: VirtualListProps) {
    super(props);
    this.#resizeObserver = new ResizeObserver(() => {
      const rect = this.#containerRef.current!.getBoundingClientRect();
      this.#containerHeight = rect.height;
      this.#scroll(0);
    });
    this.state = {
      height: 0,
    };
  }

  override componentWillReceiveProps(nextProps: VirtualListProps) {
    if (nextProps.data.length !== this.props.data.length) {
      this.#scrollHeight = nextProps.data.length * nextProps.itemHeight;
      this.#scroll(0);
    }
  }

  override componentDidMount() {
    const rect = this.#containerRef.current!.getBoundingClientRect();
    this.#containerHeight = rect.height;
    this.#scrollHeight = this.props.data.length * this.props.itemHeight;
    this.#resizeObserver.observe(this.#containerRef.current!);
  }

  override componentWillUnmount() {
    this.#resizeObserver.disconnect();
  }

  #handleWheelEvent = (evt: JSX.TargetedWheelEvent<HTMLDivElement>) => {
    this.#scroll(evt.deltaY, evt);
  };

  #scroll(deltaY: number, evt?: JSX.TargetedWheelEvent<HTMLDivElement>) {
    const scrollable = this.#scrollHeight - this.#containerHeight + 64;
    let nextScrollTop: number;
    if (scrollable < 0) {
      nextScrollTop = 0;
    } else {
      nextScrollTop = Math.max(
        -scrollable,
        Math.min(this.#scrollTop - deltaY, 0),
      );
    }

    if (nextScrollTop === this.#scrollTop) {
      return;
    }
    evt?.preventDefault();

    this.#scrollTop = nextScrollTop;
    this.#contentRef.current!.style.transform = `translateY(${nextScrollTop}px)`;
  }

  render(props: VirtualListProps) {
    let cls = "cuby-virtual-list";
    if (props.flex) {
      cls += " flex";
    }
    return (
      <div
        className={cls}
        ref={this.#containerRef}
        onWheel={this.#handleWheelEvent}
      >
        <div className="cuby-virtual-list-content" ref={this.#contentRef}>
          {props.data.map((item) =>
            props.itemRenderer(item, {
              height: props.itemHeight,
            }),
          )}
        </div>
      </div>
    );
  }
}
