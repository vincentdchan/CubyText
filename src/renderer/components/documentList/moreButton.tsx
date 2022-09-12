import { JSX, PureComponent } from "preact/compat";
import { FontAwesomeIcon } from "@pkg/renderer/components/fontAwesomeIcon";
import Dropdown, {
  type ChildRenderOptions,
  DropdownDirection,
} from "@pkg/renderer/components/dropdown";
import { Menu, IconMenuItem, MenuItem } from "@pkg/renderer/components/menu";
import {
  moveToTrash,
  recoverDocument,
  deletePermanently,
} from "@pkg/common/message";
import type { SourceKeys } from "./documentList";
import { faEllipsis, faTrash } from "@fortawesome/free-solid-svg-icons";

export interface MoreButtonProps {
  docId: string;
  source: SourceKeys;
  visible: boolean;
  onRefresh?: () => void;
}

export class MoreButton extends PureComponent<MoreButtonProps> {
  #handleRecover = async () => {
    await recoverDocument.request({ id: this.props.docId });
    this.props.onRefresh?.();
  };

  #handleDeletePermanently = async () => {
    console.log("delete permanently");
    await deletePermanently.request({
      id: this.props.docId,
    });
    this.props.onRefresh?.();
  };

  #moveToTrash = async () => {
    await moveToTrash.request({ id: this.props.docId });
    this.props.onRefresh?.();
  };

  #menuBuilder = (style: JSX.CSSProperties) => {
    if (this.props.source === "trash") {
      return (
        <Menu style={style}>
          <MenuItem onClick={this.#handleRecover}>Recover</MenuItem>
          <MenuItem onClick={this.#handleDeletePermanently}>
            Delete permanently
          </MenuItem>
        </Menu>
      );
    }
    return (
      <Menu style={style}>
        <IconMenuItem
          icon={<FontAwesomeIcon icon={faTrash} />}
          onClick={this.#moveToTrash}
        >
          Move to Trash
        </IconMenuItem>
      </Menu>
    );
  };

  override render(props: MoreButtonProps) {
    return (
      <Dropdown
        direction={DropdownDirection.BottomWithRightAligned}
        overlay={this.#menuBuilder}
      >
        {(options: ChildRenderOptions) => (
          <div
            ref={options.ref}
            className="cuby-more-button cuby-hover-bg-deeper"
            style={{
              visibility: props.visible ? "visible" : "hidden",
            }}
            onClick={options.show}
          >
            <FontAwesomeIcon icon={faEllipsis} />
          </div>
        )}
      </Dropdown>
    );
  }
}
