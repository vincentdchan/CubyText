import { PureComponent } from "preact/compat";

interface VerticalSplitProps {
  left: number;
  show?: boolean;
  onMouseDown?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
}

export class VerticalSplit extends PureComponent<VerticalSplitProps> {
  render(props: VerticalSplitProps) {
    return (
      <div
        className="cuby-vertical-split"
        onMouseDown={props.onMouseDown}
        style={{
          display: props.show ? "" : "none",
          left: props.left,
        }}
      >
        <div className="central"></div>
      </div>
    );
  }
}
