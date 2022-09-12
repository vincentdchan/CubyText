import { Component, JSX } from "preact";
import { BlockElement } from "blocky-data";
import { type EditorController } from "blocky-core";
import Dropdown, {
  type ChildRenderOptions,
} from "@pkg/renderer/components/dropdown";
import SlashCommandPanel from "@pkg/renderer/components/slashCommandPanel";
import "./bannerMenu.scss";

export interface BannerProps {
  editorController: EditorController;
  focusedNode?: BlockElement;
}

const BannerIcon = `
<svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M16 17L48 17" stroke="#CAC4C4" stroke-width="6" stroke-linecap="round"/>
<path d="M16 32L48 32" stroke="#CAC4C4" stroke-width="6" stroke-linecap="round"/>
<path d="M16 47L48 47" stroke="#CAC4C4" stroke-width="6" stroke-linecap="round"/>
</svg>
`;

class BannerMenu extends Component<BannerProps> {
  constructor(props: BannerProps) {
    super(props);
    this.state = {
      showDropdown: false,
      menuX: 0,
      menuY: 0,
    };
  }

  #renderMenu = (style: JSX.CSSProperties) => {
    return (
      <SlashCommandPanel
        focusedNode={this.props.focusedNode}
        controller={this.props.editorController}
        style={style}
      />
    );
  };

  render() {
    return (
      <Dropdown overlay={this.#renderMenu}>
        {(options: ChildRenderOptions) => (
          <div
            ref={options.ref}
            className="blocky-example-banner-button"
            onClick={options.show}
            dangerouslySetInnerHTML={{
              __html: BannerIcon,
            }}
          />
        )}
      </Dropdown>
    );
  }
}

export default BannerMenu;
