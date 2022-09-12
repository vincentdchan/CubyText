import { memo } from "preact/compat";
import { NavbarButton } from "@pkg/renderer/components/navbar/navbarButton";
import {
  faWindowClose,
  faWindowMaximize,
  faWindowMinimize,
} from "@fortawesome/free-solid-svg-icons";
import { windowAction } from "@pkg/common/message";
import "./windowsTitleBar.scss";

function WindowsTitleBar() {
  return (
    <div className="cuby-title-bar">
      <span style={{ width: 16, height: "100%" }}></span>
      <span className="left-border" style={{ width: 16, height: 16 }}></span>
      <NavbarButton
        icon={faWindowMinimize}
        onClick={() => windowAction.request({ action: "minimize" })}
      />
      <NavbarButton
        icon={faWindowMaximize}
        onClick={() => windowAction.request({ action: "autoMaximize" })}
      />
      <NavbarButton
        icon={faWindowClose}
        onClick={() => windowAction.request({ action: "close" })}
      />
    </div>
  );
}

export default memo(WindowsTitleBar);
