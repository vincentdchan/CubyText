import { Component } from "preact";
import "./notebookSelector.scss";

class NotebookSelector extends Component {
  render() {
    return (
      <div className="cuby-notebook-selector cuby-hover-bg cuby-cm-noselect">
        <div className="title">My notebook</div>
        <div className="last-modified">2022-8-2</div>
      </div>
    );
  }
}

export default NotebookSelector;
