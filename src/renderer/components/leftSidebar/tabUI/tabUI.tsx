import { isUndefined } from "lodash-es";
import { Component, JSX } from "preact";
import { PureComponent } from "preact/compat";
import Tooltip from "@pkg/renderer/components/tooltip";
import { ReactComponent as ArrowIcon } from "./arrow.svg";
import "./tabUI.scss";

export interface TabUIProps {
  children?: any;
}

export class TabUI extends Component<TabUIProps> {
  render(props: TabUIProps) {
    return <div className="cuby-sidebar-tab">{props.children}</div>;
  }
}

export interface TabItemUIProps {
  nodeType: string;
  level?: number;
  content?: string;
  style?: JSX.CSSProperties;
  icon?: JSX.Element;
  isLeaf?: boolean;
  expanded?: boolean;
  onClick?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
  onDbClickContent?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
  onToggleClicked?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
}

interface TabItemUIState {
  emoji?: string;
  content?: string;
}

/**
 * Dedent emoji to icon
 */
export class TabItemUI extends Component<TabItemUIProps, TabItemUIState> {
  constructor(props: TabItemUIProps) {
    super(props);
    if (props.content) {
      const testEmoji = this.#testEmoji(props.content);
      if (testEmoji) {
        const { emoji, content } = testEmoji;
        this.state = {
          emoji,
          content,
        };
        return;
      }
    }
    this.state = {
      content: props.content,
    };
  }

  override componentWillReceiveProps(nextProps: TabItemUIProps) {
    if (
      nextProps.content === this.props.content &&
      nextProps.isLeaf === this.props.isLeaf
    ) {
      return;
    }

    if (nextProps.content) {
      const testEmoji = this.#testEmoji(nextProps.content);
      if (testEmoji) {
        const { emoji, content } = testEmoji;
        this.setState({
          emoji,
          content,
        });
        return;
      }
    }

    this.setState({
      emoji: undefined,
      content: nextProps.content,
    });
  }

  #testEmoji(content: string): { emoji: string; content: string } | undefined {
    const testEmoji = /^\p{Emoji}/u.exec(content);
    if (testEmoji != null) {
      const emoji = testEmoji[0];
      content = content.slice(emoji.length);
      return {
        emoji,
        content,
      };
    }
  }

  #renderSpans(): JSX.Element[] | undefined {
    if (!this.props.level) {
      return;
    }
    const result: JSX.Element[] = [];

    for (let i = 0; i < this.props.level; i++) {
      result.push(<div className="std-width-span" />);
    }

    return result;
  }

  #renderToggle(icon?: JSX.Element | string): JSX.Element {
    return (
      <ToggleButton
        onClick={this.props.onToggleClicked}
        isLeaf={this.props.isLeaf}
        expanded={this.props.expanded}
        icon={icon ?? this.props.icon}
      />
    );
  }

  #renderContent() {
    if (this.props.nodeType === "reference") {
      return (
        <Tooltip content="Double click to open" direction="bottomLeftAligned">
          <div
            className="text-content"
            onDblClick={this.props.onDbClickContent}
          >
            {this.state.content}
          </div>
        </Tooltip>
      );
    }
    return <div className="text-content">{this.state.content}</div>;
  }

  render(props: TabItemUIProps, state: TabItemUIState) {
    return (
      <div
        className="cuby-tab-item cuby-hover-bg cuby-cm-noselect"
        style={props.style}
        onClick={props.onClick}
        data-type={props.nodeType}
      >
        {this.#renderSpans()}
        {this.#renderToggle(state.emoji)}
        {this.#renderContent()}
      </div>
    );
  }
}

interface ToggleButtonProps {
  onClick?: (e: JSX.TargetedMouseEvent<HTMLDivElement>) => void;
  expanded?: boolean;
  isLeaf?: boolean;
  icon?: JSX.Element | string;
}

interface ToggleButtonState {
  hover: boolean;
}

class ToggleButton extends PureComponent<ToggleButtonProps, ToggleButtonState> {
  constructor(props: ToggleButtonProps) {
    super(props);
    this.state = {
      hover: false,
    };
  }

  #handleMouseEnter = () => {
    this.setState({
      hover: true,
    });
  };

  #handleMouseLeave = () => {
    this.setState({
      hover: false,
    });
  };

  #handleClicked = (e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
    if (this.props.isLeaf) {
      return;
    }
    this.props.onClick?.(e);
  };

  // true for arrow
  // false for icon
  #renderArrowOrIcon(): boolean {
    const { icon, isLeaf } = this.props;
    if (isLeaf) {
      return false;
    }
    if (isUndefined(icon) || this.state.hover) {
      return true;
    }
    return false;
  }

  render(props: ToggleButtonProps) {
    let cls = "cuby-tab-item-toggle";
    const renderArrow = this.#renderArrowOrIcon();
    if (props.expanded && renderArrow) {
      cls += " expanded";
    }
    if (!props.isLeaf) {
      cls += " branch cuby-hover-bg-deeper";
    }
    return (
      <div
        onClick={this.#handleClicked}
        onMouseEnter={this.#handleMouseEnter}
        onMouseLeave={this.#handleMouseLeave}
        className={cls}
      >
        {renderArrow ? <ArrowIcon /> : props.icon}
      </div>
    );
  }
}

export interface PanePlaceholderProps {
  children?: any;
}

export class PanePlaceholder extends PureComponent<PanePlaceholderProps> {
  render(props: PanePlaceholderProps) {
    return <div className="cuby-panel-placeholder">{props.children}</div>;
  }
}
