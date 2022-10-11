import { isMac } from "@pkg/renderer/platforms"

if (!isMac) {
  import("./winPatch.scss");
}
