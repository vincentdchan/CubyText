/// <reference types="vite/client" />

declare module '*.svg' {
  import * as Preact from "preact";

  export const ReactComponent: Preact.FunctionComponent<
    Preact.JSX.SVGAttributes & { title?: string }
  >
}
