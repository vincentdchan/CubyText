import { Component } from "preact";
import { fetchCurrentTheme } from "@pkg/common/message";
import type { Theme } from "@pkg/common/themeDefinition";
import { themeSingleton } from "@pkg/renderer/styles";
import { isUndefined } from "lodash-es";

interface ThemeProviderState {
  theme?: Theme;
}

export interface ThemeProviderProps {
  children?: any;
}

function setCssVariable(theme: Theme) {
  const { documentElement } = document;
  const { app, tooltip, modal } = theme;
  documentElement.style.setProperty("--app-bg-color", app.backgroundColor);
  documentElement.style.setProperty("--app-sidebar-bg-color", app.sidebarBackgroundColor);
  documentElement.style.setProperty("--app-color", app.color);
  documentElement.style.setProperty(
    "--app-description-color",
    app.descriptionColor,
  );
  documentElement.style.setProperty("--app-gray-color", app.grayTextColor);
  documentElement.style.setProperty("--app-icon-color", app.iconColor);
  documentElement.style.setProperty(
    "--app-hover-bg-color",
    app.hoverBackgroundColor,
  );
  documentElement.style.setProperty(
    "--app-hover-bg-color-deeper",
    app.hoverBackgroundColorDeeper,
  );
  documentElement.style.setProperty("--app-border-color", app.borderColor);
  documentElement.style.setProperty("--app-danger-color", app.dangerColor);

  documentElement.style.setProperty(
    "--tooltip-bg-color",
    tooltip.backgroundColor,
  );
  documentElement.style.setProperty(
    "--tooltip-text-color",
    tooltip.color,
  );

  documentElement.style.setProperty(
    "--modal-bg-color",
    modal.backgroundColor,
  );
  documentElement.style.setProperty(
    "--modal-color",
    modal.color,
  );
}

class ThemeProvider extends Component<ThemeProviderProps, ThemeProviderState> {
  constructor(props: ThemeProviderProps) {
    super(props);
    this.state = {};
  }

  override componentDidMount() {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.#fetchTheme(dark);

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener("change", this.#handleDarkModeChanged);
  }

  override componentWillUnmount(): void {
    window.matchMedia('(prefers-color-scheme: dark)').removeEventListener("change", this.#handleDarkModeChanged);
  }

  #handleDarkModeChanged = () => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.#fetchTheme(dark);
  }

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
