import { Component } from "preact";
import "./mask.scss";

export interface MaskProps {
  children?: any;
  onClick?: JSX.MouseEventHandler<HTMLDivElement>;
}

class Mask extends Component<MaskProps> {
  override render({ children, onClick }: MaskProps) {
    return (
      <div className="cuby-mask" onClick={onClick}>
        {children}
      </div>
    );
  }
}

export default Mask;
