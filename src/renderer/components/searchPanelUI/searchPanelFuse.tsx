import { Component } from "preact";
import SearchPanelUI, { type SearchPanelItem } from "./searchPanelUI";
import Fuse from "fuse.js";

export interface SearchPanelUIProps {
  placeholder?: string;
  data: SearchPanelItem[];
  onSelect?: (index: number) => void;
  onClose?: () => void;
}

interface SearchPanelUIState {
  searchedItems: SearchPanelItem[];
}

export class SearchPanelFuse extends Component<
  SearchPanelUIProps,
  SearchPanelUIState
> {
  private fuse: Fuse<SearchPanelItem> | undefined;

  constructor(props: SearchPanelUIProps) {
    super(props);
    this.state = {
      searchedItems: [],
    };
  }

  componentDidMount() {
    this.fuse = new Fuse(this.props.data, {
      keys: ["title"],
    });
  }

  #handleChange = (content: string) => {
    const result = this.fuse!.search(content, {
      limit: 10,
    });
    this.setState({
      searchedItems: result.map((item) => item.item),
    });
  };

  render(props: SearchPanelUIProps) {
    if (this.state.searchedItems.length === 0) {
      return (
        <SearchPanelUI
          placeholder={props.placeholder}
          searchedItems={this.props.data}
          onChanged={this.#handleChange}
          onSelect={this.props.onSelect}
          onClose={props.onClose}
        />
      );
    }
    return (
      <SearchPanelUI
        placeholder={props.placeholder}
        searchedItems={this.state.searchedItems}
        onChanged={this.#handleChange}
        onSelect={this.props.onSelect}
        onClose={props.onClose}
      />
    );
  }
}
