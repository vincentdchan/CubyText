import { Component, type RefObject, createRef } from "preact";
import Button from "@pkg/renderer/components/button";
import "./anchorToolbar.scss";

interface AnchorToolbarProps {
  style?: JSX.CSSProperties;
  onSubmitLink?: (link: string) => void;
}

interface AnchorToolbarState {
  content: string;
  valid: boolean;
}

function isUrl(text: string): boolean {
  try {
    const url = new URL(text);
    const { protocol } = url;
    return protocol === "http:" || protocol === "https:";
  } catch (e) {
    return false;
  }
}

class AnchorToolbar extends Component<AnchorToolbarProps, AnchorToolbarState> {
  #inputRef: RefObject<HTMLInputElement> = createRef();

  constructor(props: AnchorToolbarProps) {
    super(props);
    this.state = {
      content: "",
      valid: false,
    };
  }

  #handleClicked = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  #handleConfirmed = () => {
    this.props.onSubmitLink?.(this.state.content);
  };

  #handleContentChanged = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const content = (e.target! as any).value as string;
    const valid = isUrl(content);
    this.setState({
      content,
      valid,
    });
  };

  #handleKeydown = (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!this.state.valid) {
        return;
      }
      this.#handleConfirmed();
    }
  };

  override componentDidMount() {
    this.#inputRef.current?.focus();
  }

  override render(props: AnchorToolbarProps, state: AnchorToolbarState) {
    const { style } = props;
    return (
      <div
        onClick={this.#handleClicked}
        style={style}
        className="cuby-anchor-toolbar"
      >
        <input
          ref={this.#inputRef}
          placeholder="Link"
          value={state.content}
          onChange={this.#handleContentChanged}
          onKeyDown={this.#handleKeydown}
        />
        <Button disabled={!state.valid} onClick={this.#handleConfirmed}>
          Confirm
        </Button>
      </div>
    );
  }
}

export default AnchorToolbar;
