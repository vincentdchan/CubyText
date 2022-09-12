import { useEffect, useState, memo } from "preact/compat";
import { type EditorController, TextBlock } from "blocky-core";
import { Delta } from "blocky-data";
import {
  createDocumentMessage,
  searchDocuments,
  recentDocuments,
  SearchItem,
} from "@pkg/common/message";
import {
  Menu,
  IconMenuItem,
  MenuItem,
  Divider,
} from "@pkg/renderer/components/menu";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { useSelectable } from "@pkg/renderer/hooks/selectable";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { isString } from "lodash-es";
import { useAutoTopDown } from "@pkg/renderer/hooks/autoTopDown";
import "./docReferencesPanel.scss";

const maxHeight = 240;

export interface DocReferencesPanelProps {
  controller: EditorController;
  editingValue: string;
  atTop?: boolean;
  closeWidget: () => void;
}

function DocReferencesPanel(props: DocReferencesPanelProps) {
  const { editingValue } = props;
  const [searchedItems, setSearchedItems] = useState<SearchItem[]>([]);

  const fetchRecentDocuments = async () => {
    const result = await recentDocuments.request({});
    setSearchedItems(result.data);
  };

  const searchDocByName = async (content: string) => {
    const result = await searchDocuments.request({
      content,
    });
    setSearchedItems(result.data);
  };

  useEffect(() => {
    const searchValue = editingValue.slice(1);
    if (searchValue.length === 0) {
      fetchRecentDocuments();
      return;
    }
    searchDocByName(searchValue);
  }, [editingValue]);

  const createNewDocumentAndInsertReferences = async () => {
    const title = editingValue;
    const resp = await createDocumentMessage.request({
      title,
    });
    if (isString(resp.id)) {
      props.controller.applyDeltaAtCursor((index) =>
        new Delta()
          .retain(Math.max(index - editingValue.length - 2, 0))
          .delete(editingValue.length + 2)
          .insert({
            type: "reference",
            docId: resp.id,
          }),
      );
    }
  };

  const handleSelect = async (selectedIndex: number) => {
    if (selectedIndex === 0) {
      await createNewDocumentAndInsertReferences();
    }
    const searchItem = searchedItems[selectedIndex - 1];
    if (!searchItem) {
      return;
    }
    if (!isString(searchItem.key)) {
      return;
    }
    const { controller } = props;
    const element = controller.getBlockElementAtCursor();

    if (!element || element.nodeName !== TextBlock.Name) {
      return;
    }

    const textModel = element.getTextModel("textContent");
    const currentLength = textModel?.length ?? 0;

    props.controller.applyDeltaAtCursor((index) => {
      return new Delta()
        .retain(Math.max(index - editingValue.length - 2, 0))
        .delete(Math.min(editingValue.length + 2, currentLength))
        .insert({
          type: "reference",
          docId: searchItem.key,
        });
    });
  };

  const handleClose = () => props.closeWidget();

  const [selectableIndex, setSelectedIndex] = useSelectable({
    onClose: handleClose,
    onSelect: handleSelect,
    controller: props.controller,
    length: searchedItems.length + 1,
  });

  const renderSearchItems = () => {
    if (searchedItems.length === 0) {
      return (
        <MenuItem
          selected={selectableIndex === 1}
          onMouseEnter={() => setSelectedIndex(1)}
          onClick={() => handleSelect(1)}
        >
          Nothing
        </MenuItem>
      );
    }

    return searchedItems.map((item, index) => (
      <IconMenuItem
        key={item.key}
        selected={index + 1 === selectableIndex}
        onMouseEnter={() => setSelectedIndex(index + 1)}
        onClick={() => handleSelect(index + 1)}
        icon={<FontAwesomeIcon icon={faFileLines} />}
      >
        {item.title}
      </IconMenuItem>
    ));
  };

  const transform = useAutoTopDown({
    atTop: !!props.atTop,
    length: searchedItems.length,
    heightPerItem: 32,
    maxHeight,
  });
  return (
    <Menu style={{ maxHeight, transform }}>
      <MenuItem
        selected={selectableIndex === 0}
        onMouseEnter={() => setSelectedIndex(0)}
        onClick={() => handleSelect(0)}
      >
        Create: {editingValue || "Empty document"}
      </MenuItem>
      <Divider />
      {renderSearchItems()}
    </Menu>
  );
}

export default memo(DocReferencesPanel);
