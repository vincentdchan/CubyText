import { PureComponent } from "preact/compat";
import { NavbarButton } from "./navbarButton";
import mainController from "@pkg/renderer/mainController";
import { homeId } from "@pkg/common/constants";
import { faHouse } from "@fortawesome/free-solid-svg-icons";
import BackButton from "./backButton";

class Navigator extends PureComponent {
  #handleOpenHome = () => {
    mainController.openDocOnActiveTab(homeId);
  };

  override render() {
    return (
      <div className="cuby-navigator">
        <BackButton />
        <NavbarButton
          tooltipContent={`Home`}
          icon={faHouse}
          onClick={this.#handleOpenHome}
        />
      </div>
    );
  }
}

export default Navigator;
