import { memo, useState, useEffect } from "preact/compat";
import { isUndefined } from "lodash-es";
import { Menu, MenuItem, IconMenuItem } from "@pkg/renderer/components/menu";
import { getDocInfo, SearchItem } from "@pkg/common/message";
import { TabsManager } from "@pkg/renderer/view/tabsManager";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import mainController from "@pkg/renderer/mainController";

export interface HistoryDropdownProps {
  tabId?: string;
  style: JSX.CSSProperties;
}

function HistoryDropdown(props: HistoryDropdownProps) {
  const [history, setHistory] = useState<SearchItem[]>([]);

  const fetchNames = async (ids: string[]) => {
    const list = await getDocInfo.request({
      ids,
    });
    setHistory(list.data);
  };

  useEffect(() => {
    if (isUndefined(props.tabId)) {
      setHistory([]);
      return;
    }

    const tabsManager = TabsManager.instance;
    const tab = tabsManager?.tabsMap.get(props.tabId);
    if (!tab) {
      return;
    }
    const ids = [...tab.docHistory.data];
    ids.reverse();
    fetchNames(ids);
  }, [props.tabId]);

  return (
    <Menu style={props.style}>
      {history.length === 0 ? (
        <MenuItem>Empty</MenuItem>
      ) : (
        history.map((item) => {
          return (
            <IconMenuItem
              key={item.key}
              icon={<FontAwesomeIcon icon={faFileLines} />}
              onClick={() => mainController.openDocOnActiveTab(item.key)}
            >
              {item.title || "Untitled document"}
            </IconMenuItem>
          );
        })
      )}
    </Menu>
  );
}

export default memo(HistoryDropdown);
