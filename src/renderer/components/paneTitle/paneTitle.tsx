import { PureComponent, forwardRef, Ref } from "preact/compat";
import "./paneTitle.scss";

export interface PanelTitleProps {
  content: string;
  right?: JSX.Element;
}

export class PanelTitle extends PureComponent<PanelTitleProps> {
  render({ content, right }: PanelTitleProps) {
    return (
      <div className="cuby-pane-title cuby-cm-noselect">
        <div className="content">{content}</div>
        {right ? <div className="right">{right}</div> : null}
      </div>
    );
  }
}

export interface PaneButtonProps {
  btnRef: Ref<HTMLButtonElement>;
  onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
  children?: any;
}

class PaneButtonInternal extends PureComponent<PaneButtonProps> {
  override render(props: PaneButtonProps) {
    return (
      <button
        ref={props.btnRef}
        className="cuby-pane-button cuby-hover-bg"
        onClick={props.onClick}
      >
        {props.children}
      </button>
    );
  }
}

export const PaneButton = forwardRef<
  HTMLButtonElement,
  Omit<PaneButtonProps, "btnRef">
>((props, ref) => <PaneButtonInternal btnRef={ref} {...props} />);
