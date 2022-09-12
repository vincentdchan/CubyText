import { PureComponent } from "preact/compat";
import {
  TabUI,
  PanePlaceholder,
} from "@pkg/renderer/components/leftSidebar/tabUI";
import { PanelTitle } from "@pkg/renderer/components/paneTitle";

class ExtensionsTab extends PureComponent {
  render() {
    return (
      <TabUI>
        <PanelTitle content="EXTENSIONS" />
        <PanePlaceholder>Work in progress</PanePlaceholder>
      </TabUI>
    );
  }
}

export default ExtensionsTab;
