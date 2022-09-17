import { render, type ComponentChildren } from "preact";
import { memo, useCallback, useEffect, useState, useRef } from "preact/compat";
import ThemeProvider from "./components/themeProvider";
import { FontAwesomeIcon } from "./components/fontAwesomeIcon";
import {
  openNotebook,
  OpenNotebookFlag,
  fetchRecentNotebooks,
  showContextMenuForRecentNotebook,
  pushRecentNotebooksChanged,
  type RecentNotebook,
} from "@pkg/common/message";
import {
  faFolderOpen,
  faAdd,
  faDatabase,
  faMartiniGlassEmpty,
} from "@fortawesome/free-solid-svg-icons";
import IconImage from "./images/icons.png";
import { listenWindow } from "blocky-common/es/dom";
import { isUndefined } from "lodash-es";
import "./app.scss";
import "./welcome.scss";

interface SelectItemProps {
  icon: any;
  onClick?: JSX.MouseEventHandler<HTMLDivElement>;
  children?: ComponentChildren;
}

const SelectItem = memo((props: SelectItemProps) => {
  return (
    <div onClick={props.onClick} className="cuby-welcome-item">
      <div className="icon">
        <FontAwesomeIcon icon={props.icon} />
      </div>
      <div className="content">{props.children}</div>
    </div>
  );
});

const MainContent = memo(() => {
  const handleCreateNewNotebook = useCallback(async () => {
    await openNotebook.request({
      flags: OpenNotebookFlag.Create,
    });
  }, []);

  const handleOpenAnExistingNotebook = useCallback(async () => {
    await openNotebook.request({
      flags: OpenNotebookFlag.SelectFile,
    });
  }, []);

  return (
    <div className="cuby-main-content cuby-cm-noselect">
      <div className="logo-container">
        <img src={IconImage} />
        <h2>Welcome to CubyText</h2>
      </div>
      <div className="items">
        <SelectItem onClick={handleCreateNewNotebook} icon={faAdd}>
          Create a new notebook
        </SelectItem>
        <SelectItem onClick={handleOpenAnExistingNotebook} icon={faFolderOpen}>
          Open an existing notebook
        </SelectItem>
      </div>
    </div>
  );
});

interface FileListItemProps {
  title: string;
  path: string;
  selected?: boolean;
  onClick?: JSX.MouseEventHandler<HTMLDivElement>;
  onDblClick?: JSX.MouseEventHandler<HTMLDivElement>;
  onContextMenu?: JSX.MouseEventHandler<HTMLDivElement>;
  children?: ComponentChildren;
}

const FileListItem = (props: FileListItemProps) => {
  let cls = "cuby-file-list-item cuby-cm-noselect";
  if (props.selected) {
    cls += " selected";
  }
  return (
    <div
      className={cls}
      onClick={props.onClick}
      onDblClick={props.onDblClick}
      onContextMenu={props.onContextMenu}
    >
      <div className="icon">
        <FontAwesomeIcon icon={faDatabase} />
      </div>
      <div className="detail">
        <div className="title">
          <div className="cuby-cm-oneline content">{props.title}</div>
        </div>
        <div className="path">
          <div className="cuby-cm-oneline content">{props.path}</div>
        </div>
      </div>
    </div>
  );
};

interface SelectablePanelProps {
  length: number;
  onSelect?: (index: number) => void;
}

export function useSelectable(
  props: SelectablePanelProps,
): [number, (index: number) => void] {
  const { length, onSelect } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const keyboardHandler = useRef<((e: KeyboardEvent) => void) | undefined>(
    undefined,
  );

  useEffect(() => {
    keyboardHandler.current = (e: KeyboardEvent) => {
      let currentIndex = selectedIndex;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (++currentIndex >= length) {
          currentIndex = 0;
        }
        setSelectedIndex(currentIndex);
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (--currentIndex < 0) {
          currentIndex = length - 1;
        }
        setSelectedIndex(currentIndex);
        return;
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect?.(currentIndex);
        return;
      }
    };
    return () => (keyboardHandler.current = undefined);
  }, [length, onSelect]);

  useEffect(() => {
    const disposable = listenWindow("keydown", (e: KeyboardEvent) => {
      keyboardHandler.current?.(e);
    });

    return () => disposable.dispose();
  }, []);

  return [selectedIndex, setSelectedIndex];
}

const FileList = memo(() => {
  const [recentList, setRecentList] = useState<RecentNotebook[] | undefined>(
    undefined,
  );
  const [selectedIndex, setSelectedIndex] = useSelectable({
    length: recentList?.length ?? 0,
    onSelect: async (index: number) => {
      if (isUndefined(recentList)) {
        return;
      }
      const item = recentList[index];
      await openNotebook.request({
        path: item.localPath!,
        flags: OpenNotebookFlag.OpenPath,
      });
    },
  });
  const fetchData = async () => {
    const resp = await fetchRecentNotebooks.request({});
    setRecentList(resp.data);
  };
  useEffect(() => {
    const disposable = pushRecentNotebooksChanged.on(() => {
      fetchData();
    });

    return () => disposable.dispose();
  }, []);
  useEffect(() => {
    fetchData();
  }, []);
  const handleFileDbClick = (path: string) => async () => {
    await openNotebook.request({
      path,
      flags: OpenNotebookFlag.OpenPath,
    });
  };
  if (isUndefined(recentList)) {
    return <div className="cuby-file-list"></div>;
  }
  if (recentList.length === 0) {
    return (
      <div className="cuby-file-list">
        <div className="cuby-file-list-empty-placeholder cuby-cm-noselect">
          <div className="icon">
            <FontAwesomeIcon icon={faMartiniGlassEmpty} />
          </div>
          <div>Empty content</div>
        </div>
      </div>
    );
  }
  return (
    <div className="cuby-file-list">
      <div className="cuby-file-scroll">
        <div className="cuby-file-scroll-relative">
          {recentList.map((item, index) => (
            <FileListItem
              key={item.id.toString()}
              selected={selectedIndex === index}
              onClick={() => setSelectedIndex(index)}
              onDblClick={handleFileDbClick(item.localPath!)}
              onContextMenu={async () => {
                await showContextMenuForRecentNotebook.request({
                  localPath: item.localPath,
                });
              }}
              title={item.title}
              path={item.localPath!}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

render(
  <ThemeProvider>
    <div className="cuby-welcome-container">
      <MainContent />
      <FileList />
    </div>
  </ThemeProvider>,
  document.getElementById("cuby-welcome")!,
);
