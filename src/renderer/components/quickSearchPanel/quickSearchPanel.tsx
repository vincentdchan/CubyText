import { Component } from "preact";
import SearchPanelUI from "@pkg/renderer/components/searchPanelUI";
import {
  type SearchItem,
  searchDocuments,
  recentDocuments,
} from "@pkg/common/message";

export interface QuickSearchPanelProps {
  onSelect?: (docId: string) => void;
  onClose?: () => void;
}

export interface QuickSearchPanelState {
  searchedItems: SearchItem[];
}

class QuickSearchPanel extends Component<
  QuickSearchPanelProps,
  QuickSearchPanelState
> {
  constructor(props: QuickSearchPanelProps) {
    super(props);
    this.state = {
      searchedItems: [],
    };
  }

  override componentDidMount() {
    this.#fetchRecent();
  }

  async #fetchRecent() {
    const resp = await recentDocuments.request({});
    this.setState({
      searchedItems: resp.data,
    });
  }

  #onChange = async (content: string) => {
    if (content.length === 0) {
      return this.#fetchRecent();
    }
    const results = await searchDocuments.request({ content });
    this.setState({
      searchedItems: results.data,
    });
  };

  #onSelect = (index: number) => {
    this.props.onSelect?.(this.state.searchedItems[index].key);
  };

  render(props: QuickSearchPanelProps) {
    return (
      <SearchPanelUI
        placeholder="Search docs by name"
        onClose={props.onClose}
        onChanged={this.#onChange}
        onSelect={this.#onSelect}
        searchedItems={this.state.searchedItems}
      />
    );
  }
}

export default QuickSearchPanel;
