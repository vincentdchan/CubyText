import { Component } from "preact";
import Button from "@pkg/renderer/components/button";
import { RecentBlock } from "@pkg/renderer/blocks/explorerBlock";
import { keys } from "@pkg/renderer/platforms";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { faHouse } from "@fortawesome/free-solid-svg-icons";
import Tooltip from "@pkg/renderer/components/tooltip";
import "./tabPlaceholder.scss";

export interface TabPlaceholderProps {
  tabId: string;
  onGoHome?: () => void;
  onCreatePage?: () => void;
  onOpenPage?: () => void;
}

interface KeySpanProps {
  children?: any;
}

function KeySpan(props: KeySpanProps) {
  return <span className="cuby-key-span">{props.children}</span>;
}

class TabPlaceholder extends Component<TabPlaceholderProps> {
  render(props: TabPlaceholderProps) {
    return (
      <div className="cuby-tab-placeholder">
        <div className="cuby-tab-placeholder-content">
          <h2>Welcome to Cuby Text</h2>
          <h3>Actions</h3>
          <div className="cuby-tab-placeholder-desp">
            <p>
              Press <KeySpan>{keys.superKey}</KeySpan>&nbsp;
              <KeySpan>P</KeySpan> to search documents
            </p>
            <p>
              Press <KeySpan>{keys.superKey}</KeySpan>&nbsp;
              <KeySpan>{keys.shiftKey}</KeySpan>&nbsp;<KeySpan>P</KeySpan> to
              execute command
            </p>
            <p>You can:</p>
          </div>
          <div className="button-group">
            <Tooltip content="Go home" direction="bottomLeftAligned">
              <Button onClick={props.onGoHome}>
                <FontAwesomeIcon icon={faHouse} />
              </Button>
            </Tooltip>
            <div style={{ width: "12px", display: "inline-block" }}></div>
            <Button onClick={props.onOpenPage} style={{ flex: 1 }}>
              Open an existing page
            </Button>
            <div style={{ width: "12px", display: "inline-block" }}></div>
            <Button
              onClick={props.onCreatePage}
              type="primary"
              style={{ flex: 1 }}
            >
              Create a new page
            </Button>
          </div>
          <h3>Recent documents</h3>
          <div className="recent-container">
            <RecentBlock blockId={props.tabId} />
          </div>
        </div>
      </div>
    );
  }
}

export default TabPlaceholder;
