import { render, type ComponentChildren } from "preact";
import { memo, useCallback, useEffect, useState } from "preact/compat";
import ThemeProvider from "./components/themeProvider";
import { FontAwesomeIcon } from "./components/fontAwesomeIcon";
import {
  openNotebook,
  OpenNotebookFlag,
  fetchRecentNotebooks,
  type RecentNotebook,
} from "@pkg/common/message";
import {
  faFolderOpen,
  faAdd,
  faDatabase,
  faMartiniGlassEmpty,
} from "@fortawesome/free-solid-svg-icons";
import IconImage from "./images/icons.png";
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
  onClick?: JSX.MouseEventHandler<HTMLDivElement>;
  onDblClick?: JSX.MouseEventHandler<HTMLDivElement>;
  children?: ComponentChildren;
}

const FileListItem = (props: FileListItemProps) => {
  return (
    <div
      className="cuby-file-list-item cuby-cm-noselect"
      onClick={props.onClick}
      onDblClick={props.onDblClick}
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

const FileList = memo(() => {
  const [recentList, setRecentList] = useState<RecentNotebook[]>([]);
  const fetchData = async () => {
    const resp = await fetchRecentNotebooks.request({});
    setRecentList(resp.data);
  };
  useEffect(() => {
    fetchData();
  });
  const handleFileDbClick = (path: string) => async () => {
    await openNotebook.request({
      path,
      flags: OpenNotebookFlag.OpenPath,
    });
  };
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
          {recentList.map((item) => (
            <FileListItem
              key={item.id.toString()}
              onDblClick={handleFileDbClick(item.localPath!)}
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
