import { ComponentChildren, JSX } from "preact";
import { useCallback, useState, useEffect } from "preact/hooks";
import { PureComponent } from "preact/compat";
import { type BlockElement, Changeset } from "blocky-data";
import { type EditorController } from "blocky-core";
import DocumentList, {
  type SourceKeys,
} from "@pkg/renderer/components/documentList";
import { DataProvider } from "@pkg/renderer/blocks/explorerBlock/dataProviders";
import { isUndefined } from "lodash-es";
import { RecentDataProvider, TrashDataProvider } from "./dataProviders";
import { faTrash, faFileLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import "./explorerBlock.scss";

export interface ExplorerBlockProps {
  blockElement: BlockElement;
  controller: EditorController;
}

export function ExplorerBlock(props: ExplorerBlockProps) {
  const nextSource = props.blockElement.getAttribute("source");
  const [dataProvider, setDataProvider] = useState<DataProvider | undefined>(
    undefined,
  );
  const blockId = props.blockElement.id;

  useEffect(() => {
    let newDataProvider: DataProvider;
    if (nextSource === "recent") {
      newDataProvider = new RecentDataProvider(blockId);
    } else if (nextSource === "trash") {
      newDataProvider = new TrashDataProvider(blockId);
    } else {
      return;
    }
    setDataProvider(newDataProvider);
    return () => newDataProvider.dispose();
  }, [nextSource, blockId]);

  const handleSelectProvider = useCallback(
    (key?: SourceKeys) => {
      new Changeset(props.controller.state)
        .updateAttributes(props.blockElement, {
          source: key,
        })
        .apply();
    },
    [props.controller, props.blockElement],
  );

  if (isUndefined(dataProvider)) {
    return <ExplorerSelector onSelect={handleSelectProvider} />;
  }
  return (
    <DocumentList
      style={{
        height: 260,
      }}
      dataProvider={dataProvider}
      source={nextSource}
    />
  );
}

interface ExplorerSelectorProps {
  onSelect?: (key: SourceKeys) => void;
}

export class ExplorerSelector extends PureComponent<ExplorerSelectorProps> {
  render(props: ExplorerSelectorProps) {
    return (
      <div className="cuby-explorer-data-source">
        <header className="cuby-cm-noselect cuby-border-bottom">
          <div className="title">Data sources</div>
        </header>
        <div>
          <DataSourceItem
            onClick={() => props.onSelect?.("recent")}
            title="Recent documents"
            description="Recent documents"
            icon={<FontAwesomeIcon icon={faFileLines} />}
          />
          <DataSourceItem
            onClick={() => props.onSelect?.("trash")}
            title="Trash"
            description="Trash"
            icon={<FontAwesomeIcon icon={faTrash} />}
          />
        </div>
      </div>
    );
  }
}

interface DataSourceItemProps {
  onClick?: JSX.MouseEventHandler<HTMLElement>;
  title?: string;
  description?: string;
  icon?: any;
  children?: ComponentChildren;
}

function DataSourceItem(props: DataSourceItemProps) {
  return (
    <div
      className="item cuby-hover-bg cuby-cm-noselect"
      onClick={props.onClick}
    >
      <div className="icon cuby-border">{props.icon}</div>
      <div className="content">
        <div className="title">{props.title}</div>
        <div className="description">{props.description}</div>
      </div>
    </div>
  );
}

export interface RecentBlockProps {
  blockId: string;
}

export class RecentBlock extends PureComponent<RecentBlockProps> {
  #provider: RecentDataProvider;

  constructor(props: RecentBlockProps) {
    super(props);
    this.#provider = new RecentDataProvider(props.blockId);
  }

  render() {
    return <DocumentList source="recent" dataProvider={this.#provider} />;
  }

  componentWillUnmount(): void {
    this.#provider.dispose();
  }
}
