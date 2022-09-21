import { Component, createRef } from "preact";
import { SidebarPainter } from "./sidebarPainter";
import "./sidebarNav.scss";

export interface SidebarNavItem {
  id: string;
  name: string;
  icon?: HTMLImageElement;
}

export interface SidebarNavProps {
  style?: JSX.CSSProperties;
  data?: SidebarNavItem[];
  selectedKey?: string;
  onSelect?: (item: SidebarNavItem) => void;
}

interface SidebarNavState {
  width: number;
  height: number;
}

export class SidebarNav extends Component<SidebarNavProps, SidebarNavState> {
  private painter: SidebarPainter | undefined;
  #containerRef = createRef<HTMLDivElement>();
  #canvasRef = createRef<HTMLCanvasElement>();
  #resizeObserver: ResizeObserver;
  constructor(props: SidebarNavProps) {
    super(props);
    this.#resizeObserver = new ResizeObserver(() => {
      this.#enqueueRender();
    });
  }

  override componentDidMount() {
    this.#resetPainter();
    this.#resizeObserver.observe(this.#containerRef.current!);
  }

  #resetPainter() {
    console.log("sidebar painter reset");
    const ctx = this.#canvasRef.current!.getContext("2d")!;
    this.painter = new SidebarPainter(
      this.#canvasRef.current!,
      ctx,
      this.props.data ?? [],
    );
    const rect = this.#containerRef.current!.getBoundingClientRect();
    this.painter.width = rect.width;
    this.painter.height = rect.height;
    this.painter.layout();
    this.#enqueueRender();
  }

  override componentWillUnmount() {
    this.#resizeObserver.disconnect();
  }

  override componentDidUpdate(prevProps: SidebarNavProps) {
    if (prevProps.data !== this.props.data) {
      this.#resetPainter();
      return;
    }
    if (prevProps.selectedKey !== this.props.selectedKey) {
      this.painter!.selectedKey = this.props.selectedKey;
      this.#enqueueRender();
    }
  }

  #handleMouseMoved = (evt: MouseEvent) => {
    const x = evt.offsetX;
    const y = evt.offsetY;

    const item = this.painter?.hitTest(x, y);
    if (item) {
      item.isHover = true;
    }
    this.#enqueueRender();
  };

  #handleMouseLeaved = () => {
    this.painter!.clearHoverStates();
    this.#enqueueRender();
  };

  #enqueueRender() {
    window.requestAnimationFrame(() => {
      this.painter!.render();
    });
  }

  #handleClicked = (evt: MouseEvent) => {
    const x = evt.offsetX;
    const y = evt.offsetY;

    const item = this.painter?.hitTest(x, y);
    if (!item) {
      return;
    }
    this.props.onSelect?.(item.data);
  };

  render(props: SidebarNavProps) {
    return (
      <div
        className="cuby-global-sidebar"
        style={props.style}
        ref={this.#containerRef}
      >
        <canvas
          onMouseMove={this.#handleMouseMoved}
          onMouseLeave={this.#handleMouseLeaved}
          onClick={this.#handleClicked}
          ref={this.#canvasRef}
        />
      </div>
    );
  }
}
