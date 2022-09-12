import { Component, ComponentChildren, JSX } from "preact";
import Tabs from "@pkg/renderer/components/tabs";
import {
  SidebarNav,
  SidebarNavItem,
} from "@pkg/renderer/components/leftSidebar/sidebarNav";
import OutlineTab from "@pkg/renderer/components/leftSidebar/outlineTab";
import HomeTab from "@pkg/renderer/components/leftSidebar/homeTab";
import ExtensionsTab from "@pkg/renderer/components/leftSidebar/extensionsTab";
import { icon } from "@fortawesome/fontawesome-svg-core";
import { VerticalSplit } from "./verticalSplit";
import type { Theme } from "@pkg/common/themeDefinition";
import {
  // faHouse,
  faFolderTree,
  faPuzzlePiece,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { themeSingleton } from "@pkg/renderer/styles";
import { isUndefined } from "lodash-es";
import "./mainSplitLayout.scss";

const homeTabKey = "home";
const outlineTabKey = "outline";
const extensionsTabKey = "extensions";
const fixedSidebarWidth = 24;
const defaultSidebarWidth = 230;
const tabContentMinSize = 100;

function iconToElement(
  theme: Theme,
  iconDef: IconDefinition,
): HTMLImageElement {
  const container = document.createElement("img");
  const renderedIcon = icon(iconDef);
  const encodedSvg = encodeURIComponent(
    renderedIcon.html[0].replaceAll(
      /"currentColor"/g,
      `"${theme.app.iconColor}"`,
    ),
  );
  container.src = `data:image/svg+xml,${encodedSvg}`;
  return container;
}

function generateItems(theme: Theme): SidebarNavItem[] {
  return [
    // {
    //   id: homeTabKey,
    //   name: "Home",
    //   icon: iconToElement(theme, faHouse),
    // },
    {
      id: outlineTabKey,
      name: "Outline",
      icon: iconToElement(theme, faFolderTree),
    },
    {
      id: extensionsTabKey,
      name: "Extensions",
      icon: iconToElement(theme, faPuzzlePiece),
    },
  ];
}

interface MainSplitLayoutState {
  sidebarWidth: number;
  selectedKey: string | undefined;
  navItems: SidebarNavItem[];
}

class MainSplitLayout extends Component<unknown, MainSplitLayoutState> {
  constructor(props: unknown) {
    super(props);
    themeSingleton.changed.on((theme) => this.#setTheme(theme));
    this.state = {
      selectedKey: undefined,
      sidebarWidth: defaultSidebarWidth,
      navItems: [],
    };
  }

  override componentDidMount() {
    const theme = themeSingleton.get()!;
    this.#setTheme(theme);
  }

  #setTheme(theme?: Theme) {
    if (!theme) {
      this.setState({ navItems: [] });
      return;
    }
    this.setState({
      navItems: generateItems(theme),
    });
  }

  #handleSelected = (item: SidebarNavItem | null) => {
    let width = this.state.sidebarWidth;
    if (
      this.state.sidebarWidth - fixedSidebarWidth < tabContentMinSize &&
      item?.id === this.state.selectedKey
    ) {
      width = defaultSidebarWidth;
      this.setState({
        sidebarWidth: width,
      });
      return;
    }
    if (item === null || item.id === this.state.selectedKey) {
      this.setState({
        selectedKey: undefined,
      });
      return;
    }
    if (this.state.sidebarWidth - fixedSidebarWidth < tabContentMinSize) {
      width = defaultSidebarWidth;
    }
    this.setState({
      selectedKey: item.id,
      sidebarWidth: width,
    });
  };

  #startX = 0;

  #handleSplitMouseDown = (e: JSX.TargetedMouseEvent<HTMLElement>) => {
    e.preventDefault();
    this.#startX = e.clientX;
    window.addEventListener("mousemove", this.#handleResizeMouseMove);
    window.addEventListener("mouseup", this.#handleResizeMouseUp);
  };

  #handleResizeMouseMove = (e: MouseEvent) => {
    e.preventDefault();
    const offset = e.clientX - this.#startX;
    this.#startX = e.clientX;
    this.setState({
      sidebarWidth: this.state.sidebarWidth + offset,
    });
  };

  #handleResizeMouseUp = () => {
    window.removeEventListener("mousemove", this.#handleResizeMouseMove);
    window.removeEventListener("mouseup", this.#handleResizeMouseUp);
  };

  #renderTab(): ComponentChildren {
    if (!this.showTabContent) {
      return undefined;
    }
    const { selectedKey } = this.state;

    switch (selectedKey) {
      case homeTabKey:
        return <HomeTab />;
      case outlineTabKey:
        return <OutlineTab />;
      case extensionsTabKey:
        return <ExtensionsTab />;
    }
  }

  get showTabContent(): boolean {
    if (isUndefined(this.state.selectedKey)) {
      return false;
    }

    if (this.state.sidebarWidth - fixedSidebarWidth < tabContentMinSize) {
      return false;
    }

    return true;
  }

  render() {
    const { sidebarWidth } = this.state;
    const showTabContent = this.showTabContent;
    return (
      <div className="cuby-main-horizontal">
        <SidebarNav
          data={this.state.navItems}
          selectedKey={this.state.selectedKey}
          onSelect={this.#handleSelected}
          style={{
            width: fixedSidebarWidth,
          }}
        />
        <div
          className="cuby-tab-content"
          style={{
            left: fixedSidebarWidth,
            width: showTabContent ? sidebarWidth - fixedSidebarWidth : 0,
          }}
        >
          {this.#renderTab()}
        </div>
        <VerticalSplit
          left={sidebarWidth - 2}
          show={showTabContent}
          onMouseDown={this.#handleSplitMouseDown}
        />
        <div className="cuby-main-content">
          <Tabs />
        </div>
      </div>
    );
  }
}

export default MainSplitLayout;
