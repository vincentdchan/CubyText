import { PureComponent } from "preact/compat";
import { TabUI } from "@pkg/renderer/components/leftSidebar/tabUI";
import { PanelTitle } from "@pkg/renderer/components/paneTitle";
// import { faFolderOpen } from "@fortawesome/free-solid-svg-icons";
// import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
// import Tooltip from "@pkg/renderer/components/tooltip";
import { homeId } from "@pkg/common/constants";
import DocOutline from "@pkg/renderer/components/docOutline";
// import mainController from "@pkg/renderer/mainController";

class HomeTab extends PureComponent {
  // #handleOpenHome = () => {
  //   mainController.openDocOnActiveTab(homeId);
  // };

  render() {
    return (
      <TabUI>
        <PanelTitle
          content="HOME"
          // right={
          //   <Tooltip content="Open Home">
          //     <PaneButton onClick={this.#handleOpenHome}>
          //       <FontAwesomeIcon icon={faFolderOpen} />
          //     </PaneButton>
          //   </Tooltip>
          // }
        />
        <DocOutline docId={homeId} />
      </TabUI>
    );
  }
}

export default HomeTab;
