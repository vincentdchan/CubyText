import { Component } from "preact";
import { SearchPanelFuse } from "@pkg/renderer/components/searchPanelUI";
import globalCommands from "@pkg/common/globalCommands";
import { executeGlobalCommand } from "@pkg/common/message";

export interface GlobalCommandPanelProps {
  onClose?: () => void;
}

class GlobalCommandPanel extends Component<GlobalCommandPanelProps> {
  #handleSelect = async (index: number) => {
    const item = globalCommands[index];
    await executeGlobalCommand.request({
      command: item,
    });
    this.props.onClose?.();
  };

  render(props: GlobalCommandPanelProps) {
    return (
      <SearchPanelFuse
        placeholder="Command"
        onSelect={this.#handleSelect}
        onClose={props.onClose}
        data={globalCommands}
      />
    );
  }
}

export default GlobalCommandPanel;
