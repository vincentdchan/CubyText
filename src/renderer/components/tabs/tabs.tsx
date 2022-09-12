import { PureComponent, createRef } from "preact/compat";
import { TabsManager } from "@pkg/renderer/view/tabsManager";
import "./tabs.scss";

class Tabs extends PureComponent {
  #tabsManager: TabsManager = new TabsManager();
  #containerRef = createRef();

  override componentDidMount() {
    this.#tabsManager.mount(this.#containerRef.current);
  }

  override componentWillUnmount() {
    this.#tabsManager.dispose();
  }

  render() {
    return <div className="cuby-tabs-container" ref={this.#containerRef}></div>;
  }
}

export default Tabs;
