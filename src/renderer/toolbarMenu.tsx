import type { CursorState } from "blocky-data";
import type { EditorController } from "blocky-core";
import { Component, JSX, createRef, RefObject } from "preact";
import { memo } from "preact/compat";
import Mask from "@pkg/renderer/components/mask";
import AnchorToolbar from "@pkg/renderer/components/anchorToolbar";
import "./toolbarMenu.scss";

const ToolbarMenuItem = memo((props: JSX.HTMLAttributes<HTMLButtonElement>) => {
  const { className = "", ...restProps } = props;
  return (
    <button
      className={`blocky-toolbar-menu-button ${className}`}
      {...restProps}
    />
  );
});

interface ToolbarMenuProps {
  editorController: EditorController;
}

interface ToolbarMenuState {
  showAnchorToolbar: boolean;
  anchorToolbarX: number;
  anchorToolbarY: number;
}

class ToolbarMenu extends Component<ToolbarMenuProps, ToolbarMenuState> {
  #containerRef: RefObject<HTMLDivElement> = createRef();
  #cursorState: CursorState | null = null;

  constructor(props: ToolbarMenuProps) {
    super(props);
    this.state = {
      showAnchorToolbar: false,
      anchorToolbarX: 0,
      anchorToolbarY: 0,
    };
  }

  private handleBold = () => {
    const { editorController } = this.props;
    editorController.formatTextOnSelectedText({
      bold: true,
    });
  };

  private handleItalic = () => {
    const { editorController } = this.props;
    editorController.formatTextOnSelectedText({
      italic: true,
    });
  };

  private handleUnderline = () => {
    const { editorController } = this.props;
    editorController.formatTextOnSelectedText({
      underline: true,
    });
  };

  private handleLinkClicked = () => {
    const { editorController } = this.props;
    // save the cursor state
    this.#cursorState = editorController.editor?.state.cursorState ?? null;

    const container = this.#containerRef.current!;
    const rect = container.getBoundingClientRect();
    this.setState({
      showAnchorToolbar: true,
      anchorToolbarX: rect.x,
      anchorToolbarY: rect.y - 36,
    });
  };

  private handleMaskClicked = () => {
    this.setState({
      showAnchorToolbar: false,
    });
  };

  private handleSubmitLink = (link: string) => {
    this.setState(
      {
        showAnchorToolbar: false,
      },
      () => {
        if (!this.#cursorState) {
          return;
        }
        const { editorController } = this.props;
        editorController.formatTextOnCursor(this.#cursorState, {
          href: link,
        });
      },
    );
  };

  override render() {
    const { showAnchorToolbar, anchorToolbarX, anchorToolbarY } = this.state;
    return (
      <>
        <div
          ref={this.#containerRef}
          className="blocky-example-toolbar-container"
        >
          <ToolbarMenuItem className="bold rect" onClick={this.handleBold}>
            B
          </ToolbarMenuItem>
          <ToolbarMenuItem className="italic rect" onClick={this.handleItalic}>
            I
          </ToolbarMenuItem>
          <ToolbarMenuItem
            className="underline rect"
            onClick={this.handleUnderline}
          >
            U
          </ToolbarMenuItem>
          <ToolbarMenuItem onClick={this.handleLinkClicked}>
            Link
          </ToolbarMenuItem>
        </div>
        {showAnchorToolbar && (
          <Mask onClick={this.handleMaskClicked}>
            <AnchorToolbar
              onSubmitLink={this.handleSubmitLink}
              style={{
                top: anchorToolbarY + "px",
                left: anchorToolbarX + "px",
              }}
            />
          </Mask>
        )}
      </>
    );
  }
}

export default ToolbarMenu;
