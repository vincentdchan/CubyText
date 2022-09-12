import type { BrowserWindow } from "electron";

interface Singleton {
  browserWindow: BrowserWindow | undefined;
  appDataDir: string | undefined;
  userDataDir: string | undefined;
  logsDir: string | undefined;
}

const singleton: Singleton = {
  browserWindow: undefined,
  appDataDir: undefined,
  userDataDir: undefined,
  logsDir: undefined,
};

export default singleton;
