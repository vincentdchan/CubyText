import type { BrowserWindow } from "electron";

interface Singleton {
  welcomeWindow: BrowserWindow | undefined;
  browserWindow: BrowserWindow | undefined;
  appDataDir: string | undefined;
  userDataDir: string | undefined;
  logsDir: string | undefined;
}

const singleton: Singleton = {
  welcomeWindow: undefined,
  browserWindow: undefined,
  appDataDir: undefined,
  userDataDir: undefined,
  logsDir: undefined,
};

export default singleton;
