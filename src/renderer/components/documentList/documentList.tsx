import { SearchItem } from "@pkg/common/message";
import { useState, memo, useEffect } from "preact/compat";
import { VirtualList, Data } from "@pkg/renderer/components/virtualList";
import mainController from "@pkg/renderer/mainController";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { faWineGlassEmpty } from "@fortawesome/free-solid-svg-icons";
import { DocItem } from "./docItem";
import type { DataProvider } from "@pkg/renderer/blocks/explorerBlock/dataProviders";
import "./documentList.scss";

export type SourceKeys = "recent" | "trash";

export interface DocumentListProps {
  source: SourceKeys;
  dataProvider: DataProvider;
  style?: JSX.CSSProperties;
}

const modifiedAtColumnWidth = 108;
const moreButtonWidth = 20;
const horizontalPadding = 12;

function DocumentList(props: DocumentListProps) {
  const [documents, setDocuments] = useState<SearchItem[]>([]);

  const fetchRecentDocuments = async () => {
    const documents = await props.dataProvider.request();
    setDocuments(documents);
  };

  const { dataProvider } = props;

  useEffect(() => {
    fetchRecentDocuments();
    dataProvider.observer.updated.on(() => fetchRecentDocuments());
  }, [dataProvider]);

  const openSearchItem = (item: SearchItem) => {
    mainController.openDocOnActiveTab(item.key);
  };

  const handleRefresh = () => {
    fetchRecentDocuments();
  };

  const itemRenderer = (item: Data, style: JSX.CSSProperties) => {
    return (
      <DocItem
        key={item.key}
        source={props.source}
        searchItem={item as SearchItem}
        style={{
          padding: `0px ${horizontalPadding}px`,
          ...style,
        }}
        moreButtonWidth={moreButtonWidth}
        modifiedAtColumnWidth={modifiedAtColumnWidth}
        onDblClick={() => openSearchItem(item as SearchItem)}
        onRefresh={handleRefresh}
      />
    );
  };

  const renderListContainer = () => {
    if (documents.length === 0) {
      return (
        <div className="empty-placeholder">
          <FontAwesomeIcon icon={faWineGlassEmpty} />
          <p className="cuby-cm-noselect">Empty content</p>
        </div>
      );
    }
    return (
      <div className="list-container">
        <VirtualList
          itemHeight={28}
          data={documents}
          itemRenderer={itemRenderer}
        />
      </div>
    );
  };

  return (
    <div className="cuby-documents" style={props.style}>
      <div
        className="title-row cuby-border-bottom"
        style={{
          padding: `0px ${horizontalPadding}px`,
        }}
      >
        <div className="column flex-grow cuby-cm-noselect">
          {props.dataProvider.name}
        </div>
        <div
          className="column cuby-cm-noselect"
          style={{
            width: modifiedAtColumnWidth,
            marginRight: moreButtonWidth,
            paddingLeft: 8,
          }}
        >
          Modified at
        </div>
      </div>
      {renderListContainer()}
    </div>
  );
}

export default memo(DocumentList);
