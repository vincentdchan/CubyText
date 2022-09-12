import { JSX, PureComponent } from "preact/compat";
import { VirtualList } from "@pkg/renderer/components/virtualList";
import { TabItemUI } from "@pkg/renderer/components/leftSidebar/tabUI";
import { ReactComponent as TextIcon } from "./icons/textIcon.svg";
import { ReactComponent as H1Icon } from "./icons/h1.svg";
import { ReactComponent as H2Icon } from "./icons/h2.svg";
import { ReactComponent as H3Icon } from "./icons/h3.svg";
import { TextType } from "blocky-data";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { faLink, faFileLines } from "@fortawesome/free-solid-svg-icons";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import {
  fetchOutline,
  pushOutlineChanged,
  type PushOutlineChangedMessage,
} from "@pkg/common/message";
import type { OutlineNode } from "@pkg/common/outlineTree";
import mainController from "@pkg/renderer/mainController";

interface OutlineItem {
  key: string;
  title: string;
  level: number;
  nodeType: string;
  icon?: JSX.Element;
  isLeaf?: boolean;
  expanded?: boolean;
}

export interface DocOutlineProps {
  docId: string;
}

interface DocOutlineState {
  items: OutlineItem[];
  outlineNode?: OutlineNode;
}

class DocOutline extends PureComponent<DocOutlineProps, DocOutlineState> {
  private disposables: IDisposable[] = [];
  #collapsedKey: Set<string> = new Set();
  constructor(props: DocOutlineProps) {
    super(props);
    this.state = {
      items: [],
    };
  }

  override componentDidMount() {
    this.disposables.push(pushOutlineChanged.on(this.#handleOutlineChanged));
    this.#fetchOutline(this.props.docId);
  }

  #handleOutlineChanged = (msg: PushOutlineChangedMessage) => {
    const { docId } = this.props;
    if (msg.docId !== docId) {
      return;
    }
    this.#updateOutline(msg.outline);
  };

  override componentDidUpdate(prevProps: DocOutlineProps) {
    if (prevProps.docId !== this.props.docId) {
      this.#fetchOutline(this.props.docId);
    }
  }

  override componentWillUnmount() {
    flattenDisposable(this.disposables).dispose();
  }

  async #fetchOutline(docId: string) {
    const { outline } = await fetchOutline.request({ docId });
    if (!outline) {
      return;
    }
    this.#updateOutline(outline);
  }

  #toggleItem(key: string) {
    if (this.#collapsedKey.has(key)) {
      this.#collapsedKey.delete(key);
    } else {
      this.#collapsedKey.add(key);
    }
    const { outlineNode } = this.state;
    if (outlineNode) {
      this.#updateOutline(outlineNode);
    }
  }

  #updateOutline(outline: OutlineNode) {
    const items: OutlineItem[] = [];
    this.#flattenOutlineNode(outline, 0, items);
    this.setState({
      items,
      outlineNode: outline,
    });
  }

  #flattenOutlineNode(node: OutlineNode, level: number, result: OutlineItem[]) {
    const isLeaf = (node.children?.length ?? 0) === 0;
    let expanded = false;
    if (!isLeaf) {
      expanded = !this.#collapsedKey.has(node.id);
    }
    result.push({
      key: node.id,
      title: node.title,
      level,
      icon: this.#getIconByTextType(node.nodeType),
      nodeType: node.nodeType,
      isLeaf: (node.children?.length ?? 0) === 0,
      expanded,
    });

    if (!expanded) {
      return;
    }

    node.children?.forEach((child) => {
      this.#flattenOutlineNode(child, level + 1, result);
    });
  }

  #getIconByTextType(textType: string): JSX.Element {
    if (textType === "normal") {
      return (
        <FontAwesomeIcon icon={faFileLines} style={{ width: 14, height: 14 }} />
      );
    }
    if (textType === TextType.Heading1) {
      return <H1Icon width={20} height={20} />;
    }
    if (textType === TextType.Heading2) {
      return <H2Icon width={20} height={20} />;
    }
    if (textType === TextType.Heading3) {
      return <H3Icon width={20} height={20} />;
    }

    if (textType === "reference") {
      return (
        <FontAwesomeIcon icon={faLink} style={{ width: 14, height: 14 }} />
      );
    }

    return <TextIcon width={20} height={20} />;
  }

  #itemRenderer = (item: any, style: JSX.CSSProperties) => {
    return (
      <TabItemUI
        key={item.key}
        nodeType={item.nodeType}
        style={style}
        content={item.title}
        level={item.level}
        isLeaf={item.isLeaf}
        expanded={item.expanded}
        icon={item.icon}
        onClick={(e: JSX.TargetedMouseEvent<HTMLDivElement>) => {
          e.preventDefault();
          mainController.jumpTo(item.key);
        }}
        onDbClickContent={() => {
          const key = item.key as string;
          if (key.startsWith("Ref-")) {
            const docId = key.slice("Ref-".length);
            mainController.openDocOnActiveTab(docId);
          }
        }}
        onToggleClicked={(e) => {
          e.preventDefault();
          e.stopPropagation();
          this.#toggleItem(item.key);
        }}
      />
    );
  };

  render() {
    const { items } = this.state;
    return (
      <VirtualList
        data={items}
        flex
        itemRenderer={this.#itemRenderer}
        itemHeight={24}
      />
    );
  }
}

export default DocOutline;
