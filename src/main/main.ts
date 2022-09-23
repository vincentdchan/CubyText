import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  dialog,
  shell,
  Menu,
  autoUpdater,
  type BrowserWindowConstructorOptions,
  type MenuItemConstructorOptions,
} from "electron";
import { setupAutoUpdate } from "./autoUpdate";
import {
  openDocumentMessage,
  createDocumentMessage,
  applyChangeset,
  searchDocuments,
  recentDocuments,
  fetchOutline,
  fetchCurrentTheme,
  subscribeDocContentChanged,
  unsubscribeDocContentChanged,
  subscribeDocListChanged,
  unsubscribeDocListChanged,
  selectAndUploadImageMessage,
  getBlob,
  moveToTrash,
  fetchTrash,
  recoverDocument,
  getDocInfo,
  deletePermanently,
  getGraphInfo,
  executeGlobalCommand,
  launchURL,
  windowAction,
  exportSnapshot,
  documentOops,
  openNotebook,
  OpenNotebookFlag,
  fetchRecentNotebooks,
  showContextMenuForRecentNotebook,
  pushRecentNotebooksChanged,
  quitAndInstallUpgrade,
  type OpenDocumentRequest,
  type ApplyChangesetRequest,
  type SearchDocumentsRequest,
  type RecentDocumentsRequest,
  type CreateDocumentRequest,
  type FetchOutlineRequest,
  type WindowsActionRequest,
  type RecoverDocumentRequest,
  type MoveToTrashRequest,
  type SelectAndUploadImageRequest,
  type SubscribeDocChangedRequest,
  type UnsubscribeDocChangedRequest,
  type GetBlobRequest,
  type GetDocInfoRequest,
  type SearchItem,
  type DeletePermanentlyRequest,
  type ExecuteGlobalCommandRequest,
  type LaunchURLRequest,
  type ExportSnapshotRequest,
  type DocumentOopsRequest,
  type OpenNotebookRequest,
  type RecentNotebook,
  type ShowContextMenuForRecentNotebookProps,
  type SubscribeDocListChanged,
  FetchCurrentThemeRequest,
} from "@pkg/common/message";
import { changesetFromMessage } from "blocky-data";
import { makeDefaultIdGenerator } from "@pkg/main/helpers/idHelper";
import singleton from "./singleton";
import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { performance } from "perf_hooks";
import { NotebookDbService, AppDbService } from "./services/dbService";
import {
  DocumentService,
  FullDatabaseSnapshot,
} from "./services/documentService";
import { SearchService } from "./services/searchService";
import {
  DocContentSubscriptionService,
  DocListSubscriptionService,
} from "./services/subscriptionService";
import { BlobStorageService } from "./services/blobStorageService";
import { BlockyDocument } from "blocky-data";
import logger, { configure as configureLog } from "./services/logService";
import { homeId } from "@pkg/common/constants";
import { flattenDisposable, IDisposable } from "blocky-common/es/disposable";
import { isString } from "lodash-es";

const appName = "CubyText";

app.setName(appName);

function isFile(path: string): boolean {
  try {
    const stat = fs.statSync(path);
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

function insertLegacyNotebookToRecentNotebooks(
  userDataDir: string,
  appDbService: AppDbService,
) {
  const legacyDbPath = path.join(userDataDir, "notebook.db");
  if (!isFile(legacyDbPath)) {
    return;
  }
  const exist = appDbService.db
    .prepare(`SELECT id FROM recent_notebooks WHERE local_path=?`)
    .get(legacyDbPath);
  if (exist) {
    return;
  }
  const now = new Date().getTime();
  appDbService.db
    .prepare(
      `INSERT INTO recent_notebooks(local_path, last_opened_at)
    VALUES (?, ?)`,
    )
    .run(legacyDbPath, now);
}

const createWelcomeWindow = async () => {
  const options: BrowserWindowConstructorOptions = {
    title: appName,
    width: 720,
    height: 420,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
    },
  };

  const { userDataDir } = singleton;
  if (!userDataDir) {
    logger.error("Can not get appDataDir");
    app.exit(1);
    return;
  }
  createDirIfNotExist(userDataDir);

  const dbPath = path.join(userDataDir, "app_data.db");
  logger.info(`App database: ${dbPath}`);
  const dbService = await AppDbService.init(dbPath);
  await insertLegacyNotebookToRecentNotebooks(userDataDir, dbService);

  if (process.platform === "darwin") {
    options.titleBarStyle = "hidden";
    options.trafficLightPosition = { x: 10, y: 16 };
  }

  const win = new BrowserWindow(options);
  singleton.welcomeWindow = win;

  if (process.platform === "linux" || process.platform === "win32") {
    win.setMenu(null);
  }

  if (import.meta.env.PROD) {
    win.loadFile(path.join(__dirname, "..", "renderer", "welcome.html"));
  } else {
    win.loadURL("http://localhost:8666/welcome.html");
  }

  const disposables: IDisposable[] = [];

  logger.info("Ready to show welcome window");
  disposables.push(listenWelcomeWindowEvents(dbService));

  win.on("close", () => {
    singleton.welcomeWindow = undefined;
    flattenDisposable(disposables).dispose();
  });

  win.on("closed", async () => {
    await dbService.close();
    logger.info("Welcome window closed");
    if (!singleton.browserWindow) {
      app.quit();
    }
  });
};

function listenWelcomeWindowEvents(appDbService: AppDbService): IDisposable {
  const disposables: IDisposable[] = [];

  const reportNotebook = (dbPath: string) => {
    const exist = appDbService.db
      .prepare(`SELECT id FROM recent_notebooks WHERE local_path=?`)
      .get(dbPath);
    const now = new Date().getTime();
    if (exist) {
      appDbService.db
        .prepare(
          `UPDATE recent_notebooks
            SET last_opened_at=?
            WHERE local_path=?`,
        )
        .run(now, dbPath);
    } else {
      appDbService.db
        .prepare(
          `INSERT INTO
        recent_notebooks(local_path, last_opened_at) VALUES (?, ?)`,
        )
        .run(dbPath, now);
    }
  };

  const deleteNotebookRecord = (dbPath: string) => {
    appDbService.db
      .prepare("DELETE FROM recent_notebooks WHERE local_path=?")
      .run(dbPath);
  };

  const reportAndOpenDb = async ({
    dbPath,
    createIfNotExist,
  }: {
    dbPath: string;
    createIfNotExist: boolean;
  }) => {
    try {
      await createNotebookWindow(dbPath, createIfNotExist);
      reportNotebook(dbPath);
      logger.info("Notebook reported:", dbPath);
    } catch (err) {
      deleteNotebookRecord(dbPath);
      throw err;
    }
  };

  disposables.push(
    openNotebook.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: OpenNotebookRequest) => {
        switch (req.flags) {
          case OpenNotebookFlag.Create: {
            const result = await dialog.showSaveDialog(
              singleton.welcomeWindow!,
              {
                filters: [
                  {
                    name: "Database",
                    extensions: ["sqlite", "db"],
                  },
                ],
              },
            );
            if (result.canceled || !result.filePath) {
              return;
            }
            await reportAndOpenDb({
              dbPath: result.filePath,
              createIfNotExist: true,
            });
            break;
          }
          case OpenNotebookFlag.OpenPath: {
            await reportAndOpenDb({
              dbPath: req.path!,
              createIfNotExist: false,
            });
            break;
          }
          case OpenNotebookFlag.SelectFile: {
            const result = await dialog.showOpenDialog(
              singleton.welcomeWindow!,
              {
                filters: [
                  {
                    name: "Database",
                    extensions: ["sqlite", "db"],
                  },
                ],
              },
            );
            if (result.canceled || result.filePaths.length === 0) {
              return;
            }
            await reportAndOpenDb({
              dbPath: result.filePaths[0],
              createIfNotExist: false,
            });
            break;
          }
        }
        singleton.welcomeWindow?.close();
        return undefined;
      },
    ),
    fetchRecentNotebooks.listenMainIpc(ipcMain, async () => {
      logger.debug(`fetching recent notebook`);
      const rows = appDbService.db
        .prepare(
          `SELECT id, local_path as localPath, last_opened_at as lastOpenedAt
          FROM recent_notebooks
          ORDER BY last_opened_at DESC
          LIMIT 20`,
        )
        .all();
      const data: RecentNotebook[] = rows.map((row) => {
        let title = "Unnamed";
        if (isString(row.localPath)) {
          title = path.basename(row.localPath);
        }
        return {
          ...row,
          title,
        };
      });
      return {
        data,
      };
    }),
    showContextMenuForRecentNotebook.listenMainIpc(
      ipcMain,
      async (
        event: IpcMainInvokeEvent,
        req: ShowContextMenuForRecentNotebookProps,
      ) => {
        const removePath = async () => {
          const { localPath } = req;
          if (!localPath) {
            return;
          }
          logger.info(`Remove recent path: ${localPath}`);
          appDbService.db
            .prepare(`DELETE FROM recent_notebooks WHERE local_path=?`)
            .run(req.localPath);
          pushRecentNotebooksChanged.push(singleton.welcomeWindow!, {});
        };

        const template: MenuItemConstructorOptions[] = [
          {
            label: "Open",
            click: async () => {
              await reportAndOpenDb({
                dbPath: req.localPath!,
                createIfNotExist: false,
              });
              singleton.welcomeWindow?.close();
            },
          },
          {
            label: "Open the folder",
            click: () => {
              const { localPath } = req;
              if (!localPath) {
                return;
              }
              shell.showItemInFolder(localPath);
            },
          },
          { type: "separator" },
          {
            label: "Remove item",
            click: async () => {
              await removePath();
            },
          },
        ];
        const menu = Menu.buildFromTemplate(template);
        menu.popup({
          window: BrowserWindow.fromWebContents(event.sender)!,
        });
        return undefined;
      },
    ),
  );

  return flattenDisposable(disposables);
}

const createNotebookWindow = async (
  dbPath: string,
  createIfNotExist: boolean,
) => {
  if (!createIfNotExist && !isFile(dbPath)) {
    await dialog.showErrorBox("Error", "File doesn't exist:" + dbPath);
    throw new Error("File doesn't exist:" + dbPath);
  }

  const options: BrowserWindowConstructorOptions = {
    title: appName,
    width: 1024,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
    },
  };

  logger.info(`Notebook opening: ${dbPath}`);
  const dbService = await NotebookDbService.initLocal(dbPath);
  const searchService = new SearchService();
  const docContentSubscriptionService = new DocContentSubscriptionService();
  const docListSubscriptionService = new DocListSubscriptionService();
  const documentService = new DocumentService({
    dbService,
    searchService,
    docContentSubscriptionService,
    docListSubscriptionService,
  });
  const blobStorageService = new BlobStorageService({
    dbService,
  });

  const initSnapshot = async () => {
    try {
      const fullSnapshot = await FullDatabaseSnapshot.init({
        dbService,
        documentService,
        searchService,
      });
      await searchService.init(fullSnapshot);
    } catch (err) {
      logger.error("init snapshot failed:", err);
    }
  };

  initSnapshot();

  if (process.platform === "darwin") {
    options.titleBarStyle = "hidden";
    options.trafficLightPosition = { x: 10, y: 16 };
  }

  const win = new BrowserWindow(options);
  singleton.browserWindow = win;

  if (import.meta.env.PROD) {
    win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  } else {
    win.loadURL("http://localhost:8666");
  }

  const disposables: IDisposable[] = [];

  logger.info("Bind events to Notebook window");
  disposables.push(
    listenNotebookMessages({
      dbService,
      documentService,
      searchService,
      blobStorageService,
      docContentSubscriptionService,
      docListSubscriptionService,
    }),
  );

  win.on("ready-to-show", () => {
    setupAutoUpdate();
  });

  win.on("close", () => {
    logger.info("Notebook window closing");
    singleton.browserWindow = undefined;
    flattenDisposable(disposables).dispose();
  });

  win.on("closed", async () => {
    await dbService.close();
    logger.info("Notebook window closed");
  });
};

function getAndPrintSystemInfos() {
  const logsDir = app.getPath("logs");

  if (import.meta.env.PROD) {
    const logFilename = path.join(logsDir, "cuby-text.txt");
    createDirIfNotExist(logsDir);
    configureLog(logFilename);
  }

  logger.info("app ready");
  logger.info("app version:", app.getVersion());
  logger.info("versions:", process.versions);
  const appDataDir = app.getPath("appData");
  logger.info(`appDataDir: ${appDataDir}`);
  const userDataDir = app.getPath("userData");
  logger.info(`userDataDir: ${userDataDir}`);
  logger.info(`logsDir: ${logsDir}`);

  singleton.appDataDir = appDataDir;
  singleton.userDataDir = userDataDir;
  singleton.logsDir = logsDir;
}

/**
 * This is called when the app started,
 * using sync version is faster.
 */
function createDirIfNotExist(path: string) {
  let exist = false;
  try {
    const stat = fs.statSync(path);
    if (stat.isDirectory()) {
      exist = true;
    }
  } catch (err) {
    exist = false;
  }

  if (exist) {
    return;
  }
  logger.info(`${path} doesn't exist, create a new one`);

  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (err) {
    logger.error(`Can not create app data path: ${path}`);
    app.exit(1);
  }
}

app.whenReady().then(() => {
  getAndPrintSystemInfos();
  listenAppMessages();
  createWelcomeWindow();
});

if (process.platform === "darwin") {
  app.on("window-all-closed", (e: Event) => {
    logger.debug("window all closed");
    e.preventDefault();
  });
  app.on("activate", () => {
    logger.debug("activate app");
    if (!singleton.welcomeWindow && !singleton.browserWindow) {
      createWelcomeWindow();
    }
  });
}

app.on("before-quit", () => {
  logger.info("prepare to quit");
  logger.info("bye bye~");
});

let flushTaskTimeout: any;
const flushTimeout = 5 * 60 * 1000; // 5 minutes

app.on("browser-window-blur", () => {
  logger.debug("window blur");
  if (typeof flushTaskTimeout !== "undefined") {
    clearTimeout(flushTaskTimeout);
    flushTaskTimeout = undefined;
  }
  flushTaskTimeout = setTimeout(() => {
    logger.info("flush");
    flushTaskTimeout = undefined;
  }, flushTimeout);
});

app.on("browser-window-focus", () => {
  logger.debug("window focus");
  if (typeof flushTaskTimeout !== "undefined") {
    clearTimeout(flushTaskTimeout);
    flushTaskTimeout = undefined;
  }
});

function listenAppMessages(): IDisposable {
  const disposables: IDisposable[] = [];

  disposables.push(
    fetchCurrentTheme.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: FetchCurrentThemeRequest) => {
        let themePath: string;
        if (req.dark) {
          themePath = path.join(
            __dirname,
            "..",
            "..",
            "themes",
            "default-dark-theme.yml",
          );
        } else {
          themePath = path.join(
            __dirname,
            "..",
            "..",
            "themes",
            "default-theme.yml",
          );
        }
        logger.debug("fetch theme path:", themePath);
        // This method is called when the app is started.
        // It must response as fast as possible.
        // I am sorry to use the sync version to block the process.
        const themeContent = fs.readFileSync(themePath, "utf8");
        return yaml.load(themeContent) as any;
      },
    ),
    windowAction.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: WindowsActionRequest) => {
        const win = singleton.browserWindow!;
        switch (req.action) {
          case "autoMaximize": {
            if (win.isMaximized()) {
              win.unmaximize();
              return;
            }
            win.maximize();
            break;
          }
          case "maximize": {
            win.maximize();
            break;
          }
          case "close": {
            win.close();
            break;
          }
          case "minimize": {
            win.minimize();
            break;
          }
        }
        return undefined;
      },
    ),
    launchURL.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: LaunchURLRequest) => {
        logger.info(`Open ${req.url} externally`);
        shell.openExternal(req.url);
        return undefined;
      },
    ),
  );

  return flattenDisposable(disposables);
}

interface NotebookMessagesOptions {
  dbService: NotebookDbService;
  documentService: DocumentService;
  searchService: SearchService;
  blobStorageService: BlobStorageService;
  docContentSubscriptionService: DocContentSubscriptionService;
  docListSubscriptionService: DocListSubscriptionService;
}

function listenNotebookMessages({
  dbService,
  documentService,
  searchService,
  blobStorageService,
  docContentSubscriptionService,
  docListSubscriptionService,
}: NotebookMessagesOptions): IDisposable {
  const disposables: IDisposable[] = [];
  const idHelper = makeDefaultIdGenerator();

  disposables.push(
    openDocumentMessage.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: OpenDocumentRequest) => {
        const document = await documentService.openDocById(req.id);
        logger.info(`open document: ${req.id}`);

        return document;
      },
    ),
    createDocumentMessage.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: CreateDocumentRequest) => {
        const newId = idHelper.mkDocId();
        const now = new Date().getTime();
        const document = new BlockyDocument({
          title: req.title,
        });
        const snapshot = JSON.stringify(document.toJSON());
        dbService.db
          .prepare(
            `INSERT INTO document(id, snapshot, snapshot_version, accessed_at, created_at, modified_at) VALUES
            (?, ?, ?, ?, ?, ?)`,
          )
          .run(newId, snapshot, 0, now, now, now);
        logger.info(
          `create new page: ${newId} with title: "${req.title ?? ""}" ~`,
        );
        docListSubscriptionService.broadcast();
        return {
          id: newId,
        };
      },
    ),
    // TODO: check document
    applyChangeset.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: ApplyChangesetRequest) => {
        const id = await documentService.applyChangeset(
          req.documentId,
          changesetFromMessage(req.changeset),
        );
        return {
          changesetId: id,
        };
      },
    ),
    searchDocuments.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: SearchDocumentsRequest) => {
        const data = searchService.search(req.content);
        return { data };
      },
    ),
    recentDocuments.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: RecentDocumentsRequest) => {
        const limit = Math.min(100, req.limit ?? 10);
        const rows = dbService.db
          .prepare(
            `SELECT
              id as key, title,
              created_at as createdAt, modified_at as modifiedAt
            FROM document
            WHERE trashed_at is NULL
            ORDER BY modified_at DESC LIMIT ?`,
          )
          .all(limit);
        return {
          data: rows.map((item) => {
            if (!item.title) {
              item.title = "Untitled document";
            }
            return item;
          }),
        };
      },
    ),
    fetchOutline.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: FetchOutlineRequest) => {
        return {
          outline: await documentService.getOutlineById(req.docId),
        };
      },
    ),
    subscribeDocContentChanged.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: SubscribeDocChangedRequest) => {
        docContentSubscriptionService.subscribe(req.subId, req.docId);
      },
    ),
    unsubscribeDocContentChanged.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: UnsubscribeDocChangedRequest) => {
        docContentSubscriptionService.unsubscribe(req.subId);
      },
    ),
    subscribeDocListChanged.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: SubscribeDocListChanged) => {
        docListSubscriptionService.subscribe(req.subId);
        return undefined;
      },
    ),
    unsubscribeDocListChanged.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: SubscribeDocListChanged) => {
        docListSubscriptionService.unsubscribe(req.subId);
        return undefined;
      },
    ),
    selectAndUploadImageMessage.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: SelectAndUploadImageRequest) => {
        const resp = await dialog.showOpenDialog(singleton.browserWindow!, {
          filters: [
            {
              name: "Images",
              extensions: ["jpg", "png", "gif", "jpeg", "bmp", "tif", "tiff"],
            },
          ],
        });
        if (resp.canceled || resp.filePaths.length === 0) {
          return {};
        }
        const filePath = resp.filePaths[0];
        const filename = path.basename(filePath);
        const begin = performance.now();
        const fileBuffer = await fs.promises.readFile(filePath);
        logger.info(
          `Read ${filename} from disk in ${performance.now() - begin}ms`,
        );
        const id = await blobStorageService.store(req.ownerId, fileBuffer);
        return { id };
      },
    ),
    getBlob.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: GetBlobRequest) => {
        const data = await blobStorageService.get(req.id);
        return { data };
      },
    ),
    moveToTrash.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: MoveToTrashRequest) => {
        if (req.id === homeId) {
          logger.warn(`The Home page can't be move to trashed`);
          await dialog.showMessageBox(singleton.browserWindow!, {
            message: "The Home page can't be move to trashed",
          });
          return { done: false };
        }
        await documentService.movetoTrash(req.id);
        docListSubscriptionService.broadcast();
        return { done: true };
      },
    ),
    fetchTrash.listenMainIpc(ipcMain, async () => {
      const data = await documentService.fetchTrash();
      return {
        data,
      };
    }),
    recoverDocument.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: RecoverDocumentRequest) => {
        await documentService.recoverDocument(req.id);
        docListSubscriptionService.broadcast();
      },
    ),
    // TODO: optimize
    getDocInfo.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: GetDocInfoRequest) => {
        const begin = performance.now();
        const data: SearchItem[] = [];
        for (const id of req.ids) {
          const item = await documentService.getDocInfo(id);
          data.push(item);
        }

        if (req.ids.length > 1) {
          const end = performance.now();
          logger.info(`Query ${req.ids.length} documents in ${end - begin}ms`);
        }

        return { data };
      },
    ),
    deletePermanently.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: DeletePermanentlyRequest) => {
        const row = dbService.db
          .prepare(
            `SELECT title FROM document
            WHERE id=? AND trashed_at IS NOT NULL`,
          )
          .get(req.id);

        if (!row) {
          logger.error(`${req.id} not found, can not delete permanently`);
          return { canceled: true };
        }

        const resp = await dialog.showMessageBox(singleton.browserWindow!, {
          message: `Are you sure to delete "${row.title}" permanently?`,
          type: "question",
          buttons: ["Delete permanently", "Cancel"],
          cancelId: 1,
        });
        if (resp.response !== 0) {
          return { canceled: true };
        }
        logger.debug(`delete ${req.id} resp:`, resp);
        documentService.deletePermanently(req.id);
        docListSubscriptionService.broadcast();
        return {
          canceled: false,
        };
      },
    ),
    getGraphInfo.listenMainIpc(ipcMain, async () => {
      return documentService.computeGraph();
    }),
    executeGlobalCommand.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: ExecuteGlobalCommandRequest) => {
        if (req.command.key === "reload-window") {
          singleton.browserWindow?.reload();
        }
        return undefined;
      },
    ),
    exportSnapshot.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: ExportSnapshotRequest) => {
        const state = await documentService.getDocumentStateById(req.docId);
        if (!state) {
          return undefined;
        }

        try {
          const resp = await dialog.showSaveDialog(singleton.browserWindow!, {
            filters: [
              {
                name: "JSON",
                extensions: ["json", "txt"],
              },
            ],
          });
          if (resp.canceled || !resp.filePath) {
            return undefined;
          }
          const begin = performance.now();
          const response = state.generateResponse();
          const data = JSON.stringify(response.snapshot ?? "", null, req.space);
          await fs.promises.writeFile(resp.filePath, data);
          logger.info(
            `Exported ${data.length} length to ${resp.filePath} in ${
              performance.now() - begin
            }ms`,
          );
        } catch (err) {
          logger.error(err);
        } finally {
          documentService.closeDoc(req.docId);
        }

        return undefined;
      },
    ),
    documentOops.listenMainIpc(
      ipcMain,
      async (evt: IpcMainInvokeEvent, req: DocumentOopsRequest) => {
        logger.error(`Document oops: ${req.docId}`);
        logger.error(req);

        await dialog.showErrorBox(
          "Oops",
          "Something went wrong, the tab will be refreshed",
        );

        return undefined;
      },
    ),
    quitAndInstallUpgrade.listenMainIpc(ipcMain, async () => {
      autoUpdater.quitAndInstall();
    }),
  );

  return flattenDisposable(disposables);
}
