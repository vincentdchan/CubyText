import type { ThemeData as EditorTheme } from "blocky-core";

export interface TooltipTheme {
  color: string /** text color */;
  backgroundColor: string;
}

export interface NavbarTheme {
  backgroundColor: string;
}

export interface ModalTheme {
  color: string /** text color */;
  backgroundColor: string;
}

export interface AppTheme {
  color: string /** text color */;
  descriptionColor: string;
  backgroundColor: string;
  sidebarBackgroundColor: string;
  hoverBackgroundColor: string;
  hoverBackgroundColorDeeper: string;
  borderColor: string;
  iconColor: string;
  grayTextColor: string;
  dangerColor: string;
}

export interface ButtonTheme {
  color: string;
  backgroundColor: string;
  hoverBackgroundColor: string;
}

export interface MenuTheme {
  color: string;
}

export interface Theme {
  name: string;
  app: AppTheme;
  editor: EditorTheme;
  tooltip: TooltipTheme;
  navbar: NavbarTheme;
  menu: MenuTheme;
  modal?: Partial<ModalTheme>;
  button?: Partial<ButtonTheme>;
}
