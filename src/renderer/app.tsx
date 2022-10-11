import { Component, ComponentChild } from "preact";
import { listenWindow } from "blocky-common/es/dom";
import { isHotkey } from "is-hotkey";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import QuickSearchPanel from "@pkg/renderer/components/quickSearchPanel";
import GlobalCommandPanel from "@pkg/renderer/components/globalCommandPanel";
import MainSplitLayout from "@pkg/renderer/components/mainSplitLayout";
import ThemeProvider from "./components/themeProvider";
import Navbar from "./components/navbar";
import mainController from "./mainController";
import "./winPatch";
import "./app.scss";

interface AppState {
  showQuickSearchPanel: boolean;
  showGlobalCommandPanel: boolean;
}

class App extends Component<unknown, AppState> {
  private disposables: IDisposable[] = [];

  constructor(props: unknown) {
    super(props);
    this.state = {
      showQuickSearchPanel: false,
      showGlobalCommandPanel: false,
    };

    mainController.bind(this, ["openQuickSearchPanel"]);
  }

  openQuickSearchPanel() {
    this.setState({
      showQuickSearchPanel: true,
    });
  }

  override componentWillMount() {
    this.disposables.push(listenWindow("keydown", this.#handleKeydown));
  }

  override componentWillUnmount() {
    flattenDisposable(this.disposables).dispose();
  }

  #handleKeydown = (e: KeyboardEvent) => {
    if (isHotkey("mod+p", e)) {
      e.preventDefault();
      this.setState({
        showQuickSearchPanel: true,
      });
    } else if (isHotkey("mod+shift+p", e)) {
      e.preventDefault();
      this.setState({
        showGlobalCommandPanel: true,
      });
    }
  };

  #handleQuickSearchPanelClosed = () => {
    this.setState({
      showQuickSearchPanel: false,
    });
  };

  #handleGlobalCommandPanelClosed = () => {
    this.setState({
      showGlobalCommandPanel: false,
    });
  };

  #handleSearchClicked = () => {
    this.setState({
      showQuickSearchPanel: true,
    });
  };

  #handleDocSelected = (docId: string) => {
    mainController.openDocOnActiveTab(docId);
    this.setState({
      showQuickSearchPanel: false,
    });
  };

  render(): ComponentChild {
    const { showQuickSearchPanel, showGlobalCommandPanel } = this.state;
    return (
      <ThemeProvider>
        <div className="cuby-app-container">
          <div className="cuby-floating-container">
            {showQuickSearchPanel && (
              <QuickSearchPanel
                onSelect={this.#handleDocSelected}
                onClose={this.#handleQuickSearchPanelClosed}
              />
            )}
            {showGlobalCommandPanel && (
              <GlobalCommandPanel
                onClose={this.#handleGlobalCommandPanelClosed}
              />
            )}
          </div>
          <Navbar onSearchClicked={this.#handleSearchClicked} />
          <MainSplitLayout />
        </div>
      </ThemeProvider>
    );
  }
}

export default App;
