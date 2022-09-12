import { JSX, PureComponent } from "preact/compat";
import { NavbarButton } from "./navbarButton";
import { keys } from "@pkg/renderer/platforms";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import mainController from "@pkg/renderer/mainController";
import { isUndefined } from "lodash-es";
import { TabsManager } from "@pkg/renderer/view/tabsManager";
import Dropdown, {
  type ChildRenderOptions,
} from "@pkg/renderer/components/dropdown";
import {
  flattenDisposable,
  type IDisposable,
} from "blocky-common/es/disposable";
import HistoryDropdown from "./historyDropdown";
import { listenWindow } from "blocky-common/es/dom";
import isHotkey from "is-hotkey";

interface BackButtonState {
  tabId?: string;
  hasBackHistory: boolean;
}

class BackButton extends PureComponent<unknown, BackButtonState> {
  private disposables: IDisposable[] = [];
  #stackListener: IDisposable | undefined = undefined;

  constructor(props: unknown) {
    super(props);
    this.state = {
      tabId: undefined,
      hasBackHistory: false,
    };
  }

  #handleGoBack = () => {
    if (isUndefined(this.state.tabId)) {
      return;
    }
    const tabsManager = TabsManager.instance;
    const tab = tabsManager?.tabsMap.get(this.state.tabId);
    tab?.goBack();
  };

  #handleFocusedTabChanged = (v: string | undefined) => {
    if (isUndefined(v)) {
      this.setState({
        tabId: undefined,
        hasBackHistory: false,
      });
      return;
    }

    const tabsManager = TabsManager.instance;
    if (!tabsManager) {
      if (this.state.hasBackHistory) {
        this.setState({
          tabId: undefined,
          hasBackHistory: false,
        });
      }
      return;
    }

    const tab = tabsManager.tabsMap.get(v);
    if (!tab) {
      this.setState({
        tabId: undefined,
        hasBackHistory: false,
      });
      return;
    }

    this.setState({
      tabId: tab.id,
      hasBackHistory: !tab.docHistory.isEmpty,
    });

    this.#stackListener?.dispose();
    this.#stackListener = tab.docHistory.changed.on(() => {
      this.setState({
        hasBackHistory: !tab.docHistory.isEmpty,
      });
    });
  };

  override componentDidMount() {
    this.disposables.push(
      mainController.focusedTabId.changed.on(this.#handleFocusedTabChanged),
    );
    this.disposables.push(
      listenWindow("keydown", (e: KeyboardEvent) => {
        if (isHotkey("mod+[", e)) {
          this.#handleGoBack();
        }
      }),
    );
  }

  override componentWillUnmount() {
    flattenDisposable(this.disposables).dispose();
    this.#stackListener?.dispose();
    this.#stackListener = undefined;
  }

  #overlayBuilder = (style: JSX.CSSProperties) => {
    return <HistoryDropdown style={style} tabId={this.state.tabId} />;
  };

  render() {
    return (
      <Dropdown overlay={this.#overlayBuilder}>
        {(options: ChildRenderOptions) => (
          <NavbarButton
            childRef={options.ref}
            tooltipContent={`Click to go back (${keys.superKey}[), right click to see history`}
            icon={faArrowLeft}
            onClick={this.#handleGoBack}
            onContextMenu={() => options.show()}
            disable={!this.state.hasBackHistory}
            tooltipDirection="bottomLeftAligned"
          />
        )}
      </Dropdown>
    );
  }
}

export default BackButton;
