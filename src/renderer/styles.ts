import { Cell } from "blocky-common/es/cell";
import type { Theme } from "@pkg/common/themeDefinition";

export const themeSingleton: Cell<Theme | undefined> = new Cell(undefined);
