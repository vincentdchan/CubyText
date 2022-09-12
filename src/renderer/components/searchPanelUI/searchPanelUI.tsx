import { Component, createRef, JSX } from "preact";
import Mask from "@pkg/renderer/components/mask";
import "./searchPanelUI.scss";

export interface SearchPanelItem {
  key: string;
  title: string;
}

export interface SearchPanelUIProps {
  placeholder?: string;
  searchedItems: SearchPanelItem[];
  onSelect?: (index: number) => void;
  onChanged?: (content: string) => void;
  onClose?: () => void;
}

interface SearchPanelUIState {
  selectedIndex: number;
}

class SearchPanelUI extends Component<SearchPanelUIProps, SearchPanelUIState> {
  #inputRef = createRef<HTMLInputElement>();

  constructor(props: SearchPanelUIProps) {
    super(props);
    this.state = {
      selectedIndex: 0,
    };
  }

  override componentDidMount() {
    this.#inputRef.current?.focus();
  }

  componentWillReceiveProps(nextProps: Readonly<SearchPanelUIProps>): void {
    const nextLength = nextProps.searchedItems.length;
    if (
      nextLength !== this.props.searchedItems.length &&
      this.state.selectedIndex >= nextLength
    ) {
      this.setState({
        selectedIndex: nextLength - 1,
      });
    }
  }

  #handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      const { selectedIndex } = this.state;
      if (
        selectedIndex >= 0 &&
        selectedIndex < this.props.searchedItems.length
      ) {
        this.props.onSelect?.(this.state.selectedIndex);
      } else {
        this.props.onClose?.();
      }
    } else if (e.key === "Escape") {
      this.props.onClose?.();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.state.selectedIndex <= 0) {
        this.setState({
          selectedIndex: Math.max(this.props.searchedItems.length - 1, 0),
        });
        return;
      }
      this.setState({
        selectedIndex: this.state.selectedIndex - 1,
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.state.selectedIndex === this.props.searchedItems.length - 1) {
        this.setState({
          selectedIndex: 0,
        });
        return;
      }
      this.setState({
        selectedIndex: this.state.selectedIndex + 1,
      });
    }
  };

  #itemRenderer = (item: SearchPanelItem, index: number) => {
    return (
      <SearchRenderItem
        key={item.key}
        content={item.title}
        selected={this.state.selectedIndex === index}
        onMouseEnter={() => this.setState({ selectedIndex: index })}
        onClick={() => this.props.onSelect?.(index)}
      />
    );
  };

  #handleInput = (e: JSX.TargetedEvent<HTMLInputElement>) => {
    const content = (e.target! as HTMLInputElement).value;
    this.props.onChanged?.(content);
  };

  #handleMouseClicked = () => {
    this.props.onClose?.();
  };

  render(props: SearchPanelUIProps) {
    return (
      <Mask onClick={this.#handleMouseClicked}>
        <div className="cuby-search-panel">
          <div className="cuby-input-container">
            <input
              ref={this.#inputRef}
              onKeyDown={this.#handleKeyDown}
              onInput={this.#handleInput}
              placeholder={props.placeholder}
            />
          </div>
          <div className="cuby-search-content">
            <div className="cuby-search-content-scroll">
              {props.searchedItems.map(this.#itemRenderer)}
            </div>
          </div>
        </div>
      </Mask>
    );
  }
}

interface SearchRenderItemProps {
  content: string;
  selected?: boolean;
  onMouseEnter?: JSX.MouseEventHandler<HTMLDivElement>;
  onClick?: JSX.MouseEventHandler<HTMLDivElement>;
}

class SearchRenderItem extends Component<SearchRenderItemProps> {
  render(props: SearchRenderItemProps) {
    let cls = "cuby-search-render-item cuby-cm-fonts";
    if (props.selected) {
      cls += " selected";
    }
    return (
      <div
        className={cls}
        onClick={props.onClick}
        onMouseEnter={props.onMouseEnter}
      >
        {props.content}
      </div>
    );
  }
}

export default SearchPanelUI;
