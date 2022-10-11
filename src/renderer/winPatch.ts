import { isWindows } from "@pkg/renderer/platforms"

if (isWindows) {
  import("./winPatch.scss");
}
