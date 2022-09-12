import { ComponentChildren, JSX } from "preact";
import { useMemo, useCallback } from "preact/hooks";
import { PureComponent } from "preact/compat";
import { type BlockElement, Changeset } from "blocky-data";
import { type EditorController } from "blocky-core";
import DocumentList, {
  type DataProvider,
  type SourceKeys,
} from "@pkg/renderer/components/documentList";
import { isUndefined } from "lodash-es";
import { RecentDataProvider, TrashDataProvider } from "./dataProviders";
import { faTrash, faFileLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import "./explorerBlock.scss";
import { useBlockActive } from "blocky-preact";

export interface ExplorerBlockProps {
  blockElement: BlockElement;
  controller: EditorController;
}

export function ExplorerBlock(props: ExplorerBlockProps) {
  const nextSource = props.blockElement.getAttribute("source");
  const blockActive = useBlockActive({
    blockId: props.blockElement.id,
    controller: props.controller,
  });
  const dataProvider = useMemo<DataProvider | undefined>(() => {
    if (nextSource === "recent") return new RecentDataProvider();
    if (nextSource === "trash") return new TrashDataProvider();
    return undefined;
  }, [nextSource]);

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
      active={blockActive}
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

export class RecentBlock extends PureComponent {
  #provider = new RecentDataProvider();

  render() {
    return (
      <DocumentList source="recent" dataProvider={this.#provider} active />
    );
  }
}
