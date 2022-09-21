import { Component } from "preact";
import { fetchCurrentTheme } from "@pkg/common/message";
import type { Theme } from "@pkg/common/themeDefinition";
import { themeSingleton } from "@pkg/renderer/styles";
import { isString, isUndefined } from "lodash-es";

interface ThemeProviderState {
  theme?: Theme;
}

export interface ThemeProviderProps {
  children?: any;
}

function setCssVariable(theme: Theme) {
  const { app, tooltip, modal, button, menu } = theme;
  // App style
  setPropertyIfExist("--app-bg-color", app.backgroundColor);
  setPropertyIfExist("--app-sidebar-bg-color", app.sidebarBackgroundColor);
  setPropertyIfExist("--app-color", app.color);
  setPropertyIfExist("--app-description-color", app.descriptionColor);
  setPropertyIfExist("--app-gray-color", app.grayTextColor);
  setPropertyIfExist("--app-icon-color", app.iconColor);
  setPropertyIfExist("--app-hover-bg-color", app.hoverBackgroundColor);
  setPropertyIfExist(
    "--app-hover-bg-color-deeper",
    app.hoverBackgroundColorDeeper,
  );
  setPropertyIfExist("--app-border-color", app.borderColor);
  setPropertyIfExist("--app-danger-color", app.dangerColor);

  setPropertyIfExist("--tooltip-bg-color", tooltip.backgroundColor);
  setPropertyIfExist("--tooltip-text-color", tooltip.color);

  // Modal style
  setPropertyIfExist("--modal-bg-color", modal?.backgroundColor);
  setPropertyIfExist("--modal-color", modal?.color);

  // Button style
  setPropertyIfExist("--button-color", button?.color);
  setPropertyIfExist("--button-bg-color", button?.backgroundColor);
  setPropertyIfExist("--button-hover-bg-color", button?.hoverBackgroundColor);

  // Menu style
  setPropertyIfExist("--menu-color", menu.color);
}

function setPropertyIfExist(name: string, value: string | undefined) {
  if (!isString(value)) {
    document.documentElement.style.removeProperty(name);
    return;
  }
  document.documentElement.style.setProperty(name, value);
}

class ThemeProvider extends Component<ThemeProviderProps, ThemeProviderState> {
  constructor(props: ThemeProviderProps) {
    super(props);
    this.state = {};
  }

  override componentDidMount() {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.#fetchTheme(dark);

    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", this.#handleDarkModeChanged);
  }

  override componentWillUnmount(): void {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .removeEventListener("change", this.#handleDarkModeChanged);
  }

  #handleDarkModeChanged = () => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    this.#fetchTheme(dark);
  };

  async #fetchTheme(dark: boolean) {
    const theme = await fetchCurrentTheme.request({ dark });
    themeSingleton.set(theme);
    setCssVariable(theme);
    this.setState({ theme });
  }

  render(props: ThemeProviderProps) {
    if (isUndefined(this.state.theme)) {
      return undefined;
    }
    return props.children;
  }
}

export default ThemeProvider;
