import { useMemo, memo, useEffect, useRef } from "preact/compat";
import {
  BlockElement,
  TextType,
  Changeset,
  Delta,
  CursorState,
} from "blocky-data";
import { ImageBlockName } from "@pkg/renderer/plugins/imageBlockPlugin";
import { ExplorerBlockName } from "@pkg/renderer/plugins/explorerBlockPlugin";
import { EditorController, TextBlock } from "blocky-core";
import { isString, isUndefined } from "lodash-es";
import {
  Divider,
  Menu,
  MenuItem,
  TallMenuItem,
} from "@pkg/renderer/components/menu";
import { useSelectable } from "@pkg/renderer/hooks/selectable";
import { useAutoTopDown } from "@pkg/renderer/hooks/autoTopDown";
import Fuse from "fuse.js";
import {
  type OriginalCommands,
  type CommandOptions,
  type CommandCategory,
  commands,
  categories,
} from "./commands";

export interface SlashCommandPanelProps {
  controller: EditorController;
  style?: JSX.CSSProperties;
  atTop?: boolean;
  editingValue?: string;
  focusedNode?: BlockElement | null;
  closeWidget?: () => void;
  onClose?: () => void;
}

interface CommandItem {
  key: string;
  index: number;
  content: string;
  description?: string;
  imgUrl?: string;
  color?: string;
}

interface OriginalCommandsWithIndex extends OriginalCommands {
  index: number;
}

type MenuCommand = CommandItem | "divider";

interface SearchResult {
  commands: MenuCommand[];
  originals: OriginalCommands[];
  length: number;
}

export class CommandSearcher {
  #filteredList: OriginalCommands[];
  #fuse: Fuse<OriginalCommands>;

  constructor(options: CommandOptions) {
    this.#filteredList = commands.filter((command) => {
      if (isUndefined(command.valid)) {
        return true;
      }
      return command.valid(options);
    });
    this.#fuse = new Fuse(this.#filteredList, {
      keys: ["content"],
    });
  }

  search(content?: string): SearchResult {
    if (!content) {
      const commands = this.#filteredList.map((item, index) => {
        return {
          ...item,
          index,
        };
      });
      return {
        commands: this.#commandsToMenu(commands),
        originals: this.#filteredList,
        length: commands.length,
      };
    }
    const searchedItems = this.#fuse.search(content);
    const commands = searchedItems.map((item, index) => {
      return { ...item.item, index };
    });
    return {
      commands: this.#commandsToMenu(commands),
      originals: searchedItems.map((item) => item.item),
      length: commands.length,
    };
  }

  #commandsToMenu(
    originalCommands: OriginalCommandsWithIndex[],
  ): MenuCommand[] {
    const result: MenuCommand[] = [];
    const categoryMaps = this.#commandsToMap(originalCommands);

    for (const category of categories) {
      this.#addCategoryToMenu(category, result, categoryMaps);
    }

    return result;
  }

  #commandsToMap(
    originalCommands: OriginalCommandsWithIndex[],
  ): Map<string, OriginalCommandsWithIndex[]> {
    const result = new Map<string, OriginalCommandsWithIndex[]>();

    for (const command of originalCommands) {
      const commandArrays = result.get(command.category.key);
      if (commandArrays) {
        commandArrays.push(command);
      } else {
        result.set(command.category.key, [command]);
      }
    }

    return result;
  }

  #addCategoryToMenu(
    category: CommandCategory,
    menu: MenuCommand[],
    categoryMaps: Map<string, OriginalCommandsWithIndex[]>,
  ) {
    const array = categoryMaps.get(category.key);
    if (!array || array.length === 0) {
      return;
    }
    if (menu.length > 0) {
      menu.push("divider");
    }
    menu.push(...array);
  }
}

function SlashCommandPanel(props: SlashCommandPanelProps) {
  const { editingValue, controller } = props;

  const searcher = useMemo(() => {
    const { document } = controller.state;
    const second = document.body.firstChild?.nextSibling;
    const showDelete = !!second;
    return new CommandSearcher({
      showDelete,
    });
  }, []);

  const searchResult = useMemo<SearchResult>(() => {
    if (!editingValue) {
      return searcher.search();
    }
    return searcher.search(editingValue);
  }, [editingValue]);

  const [selectedIndex, setSelectedIndex] = useSelectable({
    controller,
    length: searchResult.length,
    onClose: props.onClose,
    onSelect: (index) => {
      const command = searchResult.originals[index];
      handleCommand(command.key);
    },
  });

  const scroller = useRef<HTMLDivElement>();

  useEffect(() => {
    const command = searchResult.originals[selectedIndex];
    if (isUndefined(command)) {
      return;
    }
    const selectedMenu = document.getElementById(`slash-menu-${command.key}`);
    if (!selectedMenu) {
      return;
    }
    const container = scroller.current!;
    const height = container.clientHeight;
    const menuItemOffsetTop = selectedMenu.offsetTop;
    const scrollTop = container.scrollTop;

    if (menuItemOffsetTop - scrollTop + selectedMenu.clientHeight > height) {
      container.scrollTop =
        menuItemOffsetTop + height - selectedMenu.clientHeight;
      return;
    } else if (scrollTop > menuItemOffsetTop) {
      container.scrollTop = menuItemOffsetTop;
    }
  }, [selectedIndex]);

  const transform = useAutoTopDown({
    atTop: !!props.atTop,
    length: searchResult.commands.length,
    heightPerItem: 52,
    maxHeight: 240,
  });

  function handleCommand(key: string) {
    try {
      switch (key) {
        case "text": {
          insertOrChangeText(TextType.Normal);
          break;
        }
        case "heading1": {
          insertOrChangeText(TextType.Heading1);
          break;
        }
        case "heading2": {
          insertOrChangeText(TextType.Heading2);
          break;
        }
        case "heading3": {
          insertOrChangeText(TextType.Heading3);
          break;
        }
        case "todo-list": {
          insertOrChangeText(TextType.Checkbox);
          break;
        }
        case "image": {
          insertImage();
          break;
        }
        case "delete": {
          deleteBlock();
          break;
        }
        case "documents-explorer": {
          insertDocumentsExplorer();
          break;
        }
        default: {
          console.error(`Unknown key: ${key}`);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    }
    props.onClose?.();
  }

  function insertOrChangeText(textType: TextType) {
    const { focusedNode } = props;
    if (!focusedNode) {
      return;
    }
    const { cursorState } = controller.state;
    const cursorOffset = cursorState?.offset ?? 0;

    // cursor is at the beginning, turn this line into textType
    if (
      isString(editingValue) &&
      cursorOffset - editingValue.length === 1 &&
      focusedNode.nodeName === TextBlock.Name
    ) {
      // delete the slash
      new Changeset(controller.state)
        .textEdit(focusedNode, "textContent", () => {
          return new Delta().delete(editingValue.length + 1);
        })
        .updateAttributes(focusedNode, {
          textType,
        })
        .setCursorState(CursorState.collapse(focusedNode.id, 0))
        .apply({
          refreshCursor: true,
        });
      return;
    }

    const textElement = controller.state.createTextElement(undefined, {
      textType,
    });
    const changeset = new Changeset(controller.state);

    if (!isUndefined(editingValue) && focusedNode.nodeName === TextBlock.Name) {
      changeset.textEdit(focusedNode, "textContent", () => {
        return new Delta()
          .retain(cursorOffset - editingValue.length)
          .delete(editingValue.length);
      });
    }

    changeset
      .insertChildrenAfter(focusedNode.parent!, [textElement], focusedNode)
      .setCursorState(CursorState.collapse(textElement.id, 0))
      .apply();
  }

  function insertImage() {
    const { focusedNode } = props;
    if (!focusedNode) {
      return;
    }
    const newId = controller.editor!.idGenerator.mkBlockId();
    const imgElement = new BlockElement(ImageBlockName, newId);
    deleteEditingContentAndInsertAfterId(imgElement, focusedNode.id);
  }

  function deleteEditingContentAndInsertAfterId(
    element: BlockElement,
    afterId: string,
  ) {
    const currentNode = props.focusedNode;
    if (!currentNode) {
      return;
    }
    const { cursorState } = controller.state;
    const cursorOffset = cursorState?.offset ?? 0;

    const prevNode = controller.state.getBlockElementById(afterId)!;
    const parentNode = prevNode.parent!;

    const changeset = new Changeset(controller.state);

    if (!isUndefined(editingValue) && currentNode.nodeName === TextBlock.Name) {
      changeset.textEdit(currentNode, "textContent", () => {
        return new Delta()
          .retain(cursorOffset - 1 - editingValue.length)
          .delete(editingValue.length + 1);
      });
    }

    changeset
      .insertChildrenAfter(parentNode, [element], prevNode)
      .setCursorState(CursorState.collapse(element.id, 0))
      .apply();
  }

  function deleteBlock() {
    const { focusedNode } = props;
    if (!focusedNode) {
      return;
    }
    controller.deleteBlock(focusedNode.id);
  }

  function insertDocumentsExplorer() {
    const { focusedNode } = props;
    if (!focusedNode) {
      return;
    }
    const newId = controller.editor!.idGenerator.mkBlockId();
    const recentDocumentsElement = new BlockElement(ExplorerBlockName, newId);
    deleteEditingContentAndInsertAfterId(
      recentDocumentsElement,
      focusedNode.id,
    );
  }

  return (
    <Menu
      style={{
        ...props.style,
        transform,
      }}
      ref={scroller as any}
    >
      {searchResult.commands.map((command) => {
        if (command === "divider") {
          return <Divider />;
        }
        if (isString(command.imgUrl)) {
          return (
            <TallMenuItem
              onClick={() => handleCommand(command.key)}
              selected={command.index === selectedIndex}
              onMouseEnter={() => setSelectedIndex(command.index)}
              imgUrl={command.imgUrl}
              description={command.description}
              style={
                isString(command.color) ? { color: command.color } : undefined
              }
              id={`slash-menu-${command.key}`}
            >
              {command.content}
            </TallMenuItem>
          );
        }
        return (
          <MenuItem
            onClick={() => handleCommand(command.key)}
            selected={command.index === selectedIndex}
            onMouseEnter={() => setSelectedIndex(command.index)}
            style={
              isString(command.color) ? { color: command.color } : undefined
            }
            id={`slash-menu-${command.key}`}
          >
            {command.content}
          </MenuItem>
        );
      })}
    </Menu>
  );
}

export default memo(SlashCommandPanel);
