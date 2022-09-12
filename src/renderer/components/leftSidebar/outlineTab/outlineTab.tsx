import { JSX } from "preact";
import { PureComponent } from "preact/compat";
import {
  TabUI,
  PanePlaceholder,
} from "@pkg/renderer/components/leftSidebar/tabUI";
import { PanelTitle } from "@pkg/renderer/components/paneTitle";
import mainController from "@pkg/renderer/mainController";
import DocOutline from "@pkg/renderer/components/docOutline";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import { isUndefined } from "lodash-es";
import { TabsManager } from "@pkg/renderer/view/tabsManager";

interface OutlineTabState {
  docId?: string;
}

function getDocIdByTabId(tabId: string | undefined): string | undefined {
  let docId: string | undefined;
  if (tabId) {
    const tab = TabsManager.instance!.tabsMap.get(tabId);
    docId = tab?.docId;
  }
  return docId;
}

class OutlineTab extends PureComponent<unknown, OutlineTabState> {
  private disposables: IDisposable[] = [];
  constructor() {
    super();
    this.disposables.push(
      mainController.focusedTabId.changed.on((tabId: string | undefined) => {
        const docId: string | undefined = getDocIdByTabId(tabId);
        if (docId === this.state.docId) {
          return;
        }
        this.setState({
          docId,
        });
      }),
    );
    this.state = {
      docId: getDocIdByTabId(mainController.focusedTabId.get()),
    };
  }

  override componentWillUnmount() {
    flattenDisposable(this.disposables).dispose();
  }

  #renderContent(): JSX.Element | undefined {
    const { docId } = this.state;
    if (isUndefined(docId)) {
      return (
        <PanePlaceholder>Click on a doc to show the outline</PanePlaceholder>
      );
    }
    return <DocOutline docId={docId} />;
  }

  render() {
    return (
      <TabUI>
        <PanelTitle content="OUTLINE" />
        {this.#renderContent()}
      </TabUI>
    );
  }
}

export default OutlineTab;
