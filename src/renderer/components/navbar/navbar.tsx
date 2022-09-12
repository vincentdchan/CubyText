import { PureComponent, JSX } from "preact/compat";
import {
  faPlus,
  faSearch,
  faTableColumns,
  faEarthAsia,
} from "@fortawesome/free-solid-svg-icons";
import { TabsManager } from "@pkg/renderer/view/tabsManager";
import mainController from "@pkg/renderer/mainController";
import { isMac, isWindows, keys } from "@pkg/renderer/platforms";
import WindowsTitleBar from "@pkg/renderer/components/windowsTitleBar";
import { windowAction } from "@pkg/common/message";
import { NavbarButton } from "./navbarButton";
import Navigator from "./navigator";
import "./navbar.scss";

export interface NavbarProps {
  onSearchClicked?: () => void;
}

class Navbar extends PureComponent<NavbarProps> {
  #handleSplit = (e: JSX.TargetedEvent<HTMLElement>) => {
    e.preventDefault();
    TabsManager.instance?.splitTab();
  };

  #handleCreatingNewDoc = () => {
    mainController.createANewDoc();
  };

  #openGraphView = () => {
    mainController.openGraphTab();
  };

  #handleDbClick = async () => {
    if (!isMac) {
      return;
    }
    await windowAction.request({ action: "autoMaximize" });
  };

  render(props: NavbarProps) {
    return (
      <div
        className="cuby-navbar cuby-border-bottom"
        onDblClick={this.#handleDbClick}
      >
        <div style={{ width: isMac ? "80px" : "0px" }}></div>
        <Navigator />
        <div className="right">
          <NavbarButton
            tooltipContent={`Create a new doc (${keys.superKey} T)`}
            icon={faPlus}
            onClick={this.#handleCreatingNewDoc}
          />
          <NavbarButton
            tooltipContent={`Search (${keys.superKey} P)`}
            icon={faSearch}
            onClick={props.onSearchClicked}
          />
          <NavbarButton
            tooltipContent="Graph"
            icon={faEarthAsia}
            onClick={this.#openGraphView}
          />
          <NavbarButton
            tooltipContent={`Split (${keys.superKey} \\)`}
            tooltipDirection="bottomRightAligned"
            icon={faTableColumns}
            onClick={this.#handleSplit}
          />
          {isWindows && <WindowsTitleBar />}
        </div>
      </div>
    );
  }
}

export default Navbar;
