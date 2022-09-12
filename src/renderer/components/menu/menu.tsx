import { Component, forwardRef, type Ref, type JSX } from "preact/compat";
import "./menu.scss";

export interface MenuProps {
  style?: JSX.CSSProperties;
  children?: any;
}

export const Menu = forwardRef<HTMLDivElement, MenuProps>(
  (props: MenuProps, ref: Ref<HTMLDivElement>) => (
    <div
      ref={ref}
      className="blocky-menu blocky-default-fonts"
      style={props.style}
    >
      {props.children}
    </div>
  ),
);

export interface MenuItemProps {
  id?: string;
  style?: JSX.CSSProperties;
  selected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  flex?: boolean;
  children?: any;
}

export class MenuItem extends Component<MenuItemProps> {
  override render({
    style,
    onClick,
    onMouseEnter,
    children,
    selected,
    flex,
    id,
  }: MenuItemProps) {
    let cls = "blocky-menu-item cuby-hover-bg blocky-cm-noselect";
    if (selected) {
      cls += " selected";
    }
    if (flex) {
      cls += " flex";
    }
    return (
      <div
        className={cls}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        style={style}
        id={id}
      >
        {children}
      </div>
    );
  }
}

export interface IconMenuItemProps extends MenuItemProps {
  icon: any;
}

export class IconMenuItem extends Component<IconMenuItemProps> {
  override render(props: IconMenuItemProps) {
    const { icon, children, ...respProps } = props;
    return (
      <MenuItem {...respProps} flex>
        <div className="icon">{icon}</div>
        <div className="content">{children}</div>
      </MenuItem>
    );
  }
}

export interface TallMenuItemProps {
  id?: string;
  imgUrl: string;
  description?: string;
  style?: JSX.CSSProperties;
  selected?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  children?: any;
}

export class TallMenuItem extends Component<TallMenuItemProps> {
  override render({
    imgUrl,
    style,
    onClick,
    onMouseEnter,
    children,
    selected,
    description,
    id,
  }: TallMenuItemProps) {
    let cls = "blocky-menu-item tall cuby-hover-bg blocky-cm-noselect";
    if (selected) {
      cls += " selected";
    }
    return (
      <div
        className={cls}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        style={style}
        id={id}
      >
        <div className="icon cuby-shadow">
          <img src={imgUrl} alt="" />
        </div>
        <div className="text-container">
          <div className="text-content">
            <div className="title cuby-cm-oneline">{children}</div>
            <div className="description cuby-cm-oneline">{description}</div>
          </div>
        </div>
      </div>
    );
  }
}

export function Divider() {
  return <div className="blocky-menu-divider"></div>;
}
