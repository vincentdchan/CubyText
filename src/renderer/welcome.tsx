import { render, type ComponentChildren } from "preact";
import { memo } from "preact/compat";
import ThemeProvider from "./components/themeProvider";
import { FontAwesomeIcon } from "./components/fontAwesomeIcon";
import { openNotebook } from "@pkg/common/message";
import {
  faFolderOpen,
  faAdd,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import IconImage from "./images/icons.png";
import "./app.scss";
import "./welcome.scss";

interface SelectItemProps {
  icon: any;
  children?: ComponentChildren;
}

const SelectItem = memo((props: SelectItemProps) => {
  return (
    <div className="cuby-welcome-item">
      <div className="icon">
        <FontAwesomeIcon icon={props.icon} />
      </div>
      <div className="content">{props.children}</div>
    </div>
  );
});

const MainContent = memo(() => {
  return (
    <div className="cuby-main-content cuby-cm-noselect">
      <div className="logo-container">
        <img src={IconImage} />
        <h2>Welcome to CubyText</h2>
      </div>
      <div className="items">
        <SelectItem icon={faAdd}>Create a new notebook</SelectItem>
        <SelectItem icon={faFolderOpen}>Open an existing notebook</SelectItem>
      </div>
    </div>
  );
});

interface FileListItemProps {
  title?: string;
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
        <div className="title">{props.title}</div>
        <div className="path">C:/xxxxxxxxxx</div>
      </div>
    </div>
  );
};

const FileList = memo(() => {
  const handleFileDbClick = async () => {
    await openNotebook.request({ path: "" });
  };
  return (
    <div className="cuby-file-list">
      <FileListItem onDblClick={handleFileDbClick} title="Default" />
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
