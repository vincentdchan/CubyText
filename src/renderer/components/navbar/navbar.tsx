import { PureComponent, JSX } from "preact/compat";
import {
  faPlus,
  faSearch,
  faTableColumns,
  faEarthAsia,
  faCircleUp,
} from "@fortawesome/free-solid-svg-icons";
import { TabsManager } from "@pkg/renderer/view/tabsManager";
import mainController from "@pkg/renderer/mainController";
import { isMac, keys } from "@pkg/renderer/platforms";
import {
  pushNewAppVersion,
  windowAction,
  quitAndInstallUpgrade,
  type PushNewAppVersionRequest,
} from "@pkg/common/message";
import { isString } from "lodash-es";
import { NavbarButton } from "./navbarButton";
import Navigator from "./navigator";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import "./navbar.scss";

export interface NavbarProps {
  onSearchClicked?: () => void;
}

export interface NavbarState {
  newVersion?: string;
}

class Navbar extends PureComponent<NavbarProps, NavbarState> {
  private disposables: IDisposable[] = [];

  constructor(props: NavbarProps) {
    super(props);
    this.state = {};
  }

  override componentDidMount(): void {
    this.disposables.push(
      pushNewAppVersion.on((req: PushNewAppVersionRequest) => {
        this.setState({
          newVersion: req.version,
        });
      }),
    );
  }

  override componentWillUnmount(): void {
    flattenDisposable(this.disposables).dispose();
  }

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

  #quickAndInstallUpdate = () => quitAndInstallUpgrade.request({});

  render(props: NavbarProps, { newVersion }: NavbarState) {
    return (
      <div
        className="cuby-navbar cuby-border-bottom"
        onDblClick={this.#handleDbClick}
      >
        <div style={{ width: isMac ? "80px" : "0px" }}></div>
        <Navigator />
        <div className="right">
          {isString(newVersion) && (
            <NavbarButton
              icon={faCircleUp}
              tooltipContent={`Upgrade CubyText to ${newVersion}`}
              onClick={this.#quickAndInstallUpdate}
              className="update-icon"
            />
          )}
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
        </div>
      </div>
    );
  }
}

export default Navbar;
