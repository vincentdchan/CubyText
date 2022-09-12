import { Component } from "preact";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import "./pageNotFound.scss";

class PageNotFound extends Component {
  render() {
    return (
      <div className="cuby-page-not-found">
        <div className="icon">
          <FontAwesomeIcon icon={faExclamationCircle} />
        </div>
        <p>Page not found</p>
      </div>
    );
  }
}

export default PageNotFound;
