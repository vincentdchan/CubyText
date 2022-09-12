import { Component, JSX } from "preact";
import { SearchItem } from "@pkg/common/message";
import { MoreButton } from "./moreButton";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import type { SourceKeys } from "./documentList";
import Tooltip from "@pkg/renderer/components/tooltip";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export interface DocItemProps {
  searchItem: SearchItem;
  style: JSX.CSSProperties;
  modifiedAtColumnWidth: number;
  moreButtonWidth: number;
  source: SourceKeys;
  onRefresh?: () => void;
  onClick?: JSX.MouseEventHandler<HTMLDivElement>;
  onDblClick?: JSX.MouseEventHandler<HTMLDivElement>;
}

interface DocItemState {
  hover: boolean;
}

export class DocItem extends Component<DocItemProps, DocItemState> {
  constructor(props: DocItemProps) {
    super(props);
    this.state = {
      hover: false,
    };
  }

  #handleMouseEnter = () => this.setState({ hover: true });
  #handleMouseLeave = () => this.setState({ hover: false });

  override render(props: DocItemProps, state: DocItemState) {
    return (
      <div
        className="cuby-doc-item cuby-hover-bg cuby-cm-noselect"
        style={props.style}
        onMouseEnter={this.#handleMouseEnter}
        onMouseLeave={this.#handleMouseLeave}
        onClick={props.onClick}
        onDblClick={props.onDblClick}
      >
        <div className="icon">
          <FontAwesomeIcon icon={faFileLines} />
        </div>
        <div className="title">
          <Tooltip content="Double click to open" direction="topLeftAligned">
            <div className="title-content cuby-text-ellipsis">
              {props.searchItem.title}
            </div>
          </Tooltip>
        </div>
        <div
          className="modified-at cuby-text-ellipsis"
          style={{ width: props.modifiedAtColumnWidth }}
        >
          {dayjs(props.searchItem.modifiedAt).fromNow()}
        </div>
        <div className="more-btn" style={{ width: props.moreButtonWidth }}>
          <MoreButton
            docId={props.searchItem.key}
            visible={state.hover}
            source={props.source}
            onRefresh={props.onRefresh}
          />
        </div>
      </div>
    );
  }
}
