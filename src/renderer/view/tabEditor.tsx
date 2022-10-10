import {
  CursorState,
  changesetToMessage,
  type FinalizedChangeset,
  BlockyDocument,
  documentFromJsonNode,
} from "blocky-data";
import { $on, elem } from "blocky-common/es/dom";
import { Editor, EditorController, type IPlugin } from "blocky-core";
import {
  makePreactBanner,
  makePreactToolbar,
  type BannerRenderProps,
} from "blocky-preact";
import {
  openDocumentMessage,
  applyChangeset,
  launchURL,
  documentOops,
  type OpenDocumentResponse,
} from "@pkg/common/message";
import BannerMenu from "@pkg/renderer/bannerMenu";
import ToolbarMenu from "@pkg/renderer/toolbarMenu";
import commandPanelPlugin from "@pkg/renderer/plugins/commandPanelPlugin";
import referencePanelPlugin from "@pkg/renderer/plugins/referencePanelPlugin";
import { makeExplorerBlockPlugin } from "@pkg/renderer/plugins/explorerBlockPlugin";
import { makeImageBlockPlugin } from "@pkg/renderer/plugins/imageBlockPlugin";
import makeStyledTextPlugin from "blocky-core/dist/plugins/styledTextPlugin";
import makeCodeTextPlugin from "blocky-core/dist/plugins/codeTextPlugin";
import makeBulletListPlugin from "blocky-core/dist/plugins/bulletListPlugin";
import makeHeadingsPlugin from "blocky-core/dist/plugins/headingsPlugin";
import { DocChangeObserver } from "@pkg/renderer/helpers/docChangeObserver";
import { TabDelegate } from "./tabDelegate";
import { homeId } from "@pkg/common/constants";
import { TabsManager } from "./tabsManager";
import { SearchBoxRenderer } from "./searchBoxRenderer";
import "blocky-core/css/styled-text-plugin.css";
import "blocky-core/css/blocky-core.css";

function makeEditorPlugins(): IPlugin[] {
  return [
    makeStyledTextPlugin(),
    makeCodeTextPlugin(),
    makeBulletListPlugin(),
    makeHeadingsPlugin(),
    commandPanelPlugin(),
    referencePanelPlugin(),
    makeExplorerBlockPlugin(),
    makeImageBlockPlugin(),
  ];
}

const User1Color = "rgb(235 100 52)";
const User2Color = "rgb(246 187 80)";

function urlLauncher(url: string) {
  launchURL.request({ url }).catch((err) => console.error(err));
}

/**
 * The controller is used to control the editor.
 */
function makeController(
  userId: string,
  resp: OpenDocumentResponse,
  titleEditable: boolean,
  onError: (err: unknown) => void,
  scrollContainer?: HTMLElement,
): EditorController {
  let document: BlockyDocument;
  if (resp.snapshot) {
    document = documentFromJsonNode(resp.snapshot) as BlockyDocument;
  } else {
    document = new BlockyDocument();
  }

  return new EditorController(userId, {
    document,
    initVersion: resp.snapshotVersion,

    collaborativeCursorFactory: (id: string) => ({
      get name() {
        return id;
      },
      get color() {
        if (id === "User-1") {
          return User1Color;
        }
        return User2Color;
      },
    }),

    scrollContainer,

    padding: {
      top: 12,
      right: 36,
      bottom: 72,
      left: 36,
    },
    /**
     * Define the plugins to implement customize features.
     */
    plugins: makeEditorPlugins(),
    /**
     * Tell the editor how to render the banner.
     * We use a banner written in Preact here.
     */
    bannerFactory: makePreactBanner(
      ({ editorController, focusedNode }: BannerRenderProps) => (
        <BannerMenu
          editorController={editorController}
          focusedNode={focusedNode}
        />
      ),
    ),
    /**
     * Tell the editor how to render the banner.
     * We use a toolbar written in Preact here.
     */
    toolbarFactory: makePreactToolbar(
      (editorController: EditorController) => {
        return <ToolbarMenu editorController={editorController} />;
      },
      { yOffset: -22 },
    ),

    emptyPlaceholder: "Type '/' for commands",

    titleEditable,
    spellcheck: false,
    urlLauncher,
    onError,
  });
}

// TODO: loading?
export class TabEditor extends TabDelegate {
  #scrollContainer: HTMLDivElement;
  #docChangeObserver: DocChangeObserver;
  #searchBoxRenderer: SearchBoxRenderer | undefined;
  editorController: EditorController | undefined;
  editor: Editor | undefined;

  constructor(readonly tabId: string, readonly docId: string) {
    super(tabId, "cuby-tab-editor");
    this.#scrollContainer = elem("div", "cuby-tab-editor-scroll");
    this.container.appendChild(this.#scrollContainer);
    this.#docChangeObserver = new DocChangeObserver(tabId, docId);
    this.#docChangeObserver.changesetReceived.on(
      (changeset: FinalizedChangeset) => {
        this.editorController?.state.apply({
          ...changeset,
          afterCursor: undefined,
          options: {
            ...changeset.options,
            updateView: true,
          },
        });
      },
    );
    this.#docChangeObserver.trashed.pipe(this.trashed);
    this.disposables.push(this.#docChangeObserver);
    $on(this.container, "click", this.#handleClick);
  }

  #handleClick = (e: MouseEvent) => {
    if (e.target !== this.container) {
      return;
    }
    this.focus.emit();
  };

  toggleSearchBox() {
    this.#searchBoxRenderer?.toggle();
  }

  async #readDataFromBackend() {
    try {
      const data = await openDocumentMessage.request({
        id: this.docId,
      });
      console.log("Data:", data);
      this.#initEditor(data);
      await this.#docChangeObserver.start();
    } catch (err) {
      // TODO: show error
      console.error(err);
    }
  }

  jumpTo(blockId: string) {
    const element = this.editorController?.state.domMap.get(blockId) as
      | HTMLElement
      | undefined;
    element?.scrollIntoView({
      behavior: "smooth",
    });
  }

  #handleError = async (err: unknown) => {
    if (err instanceof Error) {
      await documentOops.request({
        docId: this.docId,
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
    }

    const tab = TabsManager.instance?.tabsMap.get(this.id);
    tab?.refresh();
  };

  #initEditor(resp: OpenDocumentResponse) {
    this.editorController = makeController(
      this.tabId,
      resp,
      this.docId !== homeId,
      this.#handleError,
      this.#scrollContainer.parentElement!,
    );
    this.editorController.state.changesetApplied.on(
      this.#handleChangesetApplied,
    );
    this.editorController.state.cursorStateChanged.on((evt) => {
      if (evt.prevState === null && evt.state !== null) {
        this.focus.emit();
      }
    });

    this.#searchBoxRenderer = new SearchBoxRenderer(
      this.container.parentElement!,
      this.editorController,
    );

    this.editor = Editor.fromController(
      this.#scrollContainer,
      this.editorController,
    );
    this.editor.initFirstEmptyBlock();
    this.editor.render(() => {
      this.editorController!.setCursorState(CursorState.collapse("title", 0));
      const title =
        this.editorController!.state.document.title.getTextModel(
          "textContent",
        )!.toString();
      this.title.set(title);
    });
  }

  #handleChangesetApplied = async (changeset: FinalizedChangeset) => {
    try {
      await applyChangeset.request({
        documentId: this.docId,
        changeset: changesetToMessage(changeset),
      });
      const title =
        this.editorController!.state.document.title.getTextModel(
          "textContent",
        )!.toString();
      if (title !== this.title.get()) {
        this.title.set(title);
      }
    } catch (err) {
      console.error(err);
      this.#handleError(err);
    }
  };

  mount(parent: HTMLElement): void {
    super.mount(parent);
    this.#readDataFromBackend();
  }
}
