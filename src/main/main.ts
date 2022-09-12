import {
  app,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  dialog,
  shell,
  type BrowserWindowConstructorOptions,
} from "electron";
import {
  type OpenDocumentRequest,
  type ApplyChangesetRequest,
  type SearchDocumentsRequest,
  type RecentDocumentsRequest,
  type CreateDocumentRequest,
  openDocumentMessage,
  createDocumentMessage,
  applyChangeset,
  searchDocuments,
  recentDocuments,
  fetchOutline,
  FetchOutlineRequest,
  fetchCurrentTheme,
  subscribeDocChanged,
  unsubscribeDocChanged,
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
} from "@pkg/common/message";
import { changesetFromMessage } from "blocky-data";
import { makeDefaultIdGenerator } from "@pkg/main/helpers/idHelper";
import singleton from "./singleton";
import * as path from "path";
import * as fs from "fs";
import * as yaml from "js-yaml";
import { performance } from "perf_hooks";
import { DbService } from "./services/dbService";
import { DocumentService } from "./services/documentService";
import { SearchService } from "./services/searchService";
import { SubscriptionService } from "./services/subscriptionService";
import { BlobStorageService } from "./services/blobStorageService";
import { BlockyDocument } from "blocky-data";
import logger, { configure as configureLog } from "./services/logService";
import { homeId } from "@pkg/common/constants";

const appName = "CubyText";

app.setName(appName);

const createWindow = () => {
  const options: BrowserWindowConstructorOptions = {
    title: appName,
    width: 1024,
    height: 620,
    webPreferences: {
      preload: path.join(__dirname, "..", "preload", "preload.js"),
    },
  };

  if (process.platform === "win32") {
    options.titleBarStyle = "hidden";
  } else if (process.platform === "darwin") {
    options.titleBarStyle = "hidden";
    options.trafficLightPosition = { x: 10, y: 16 };
  }

  singleton.browserWindow = new BrowserWindow(options);

  if (import.meta.env.PROD) {
    singleton.browserWindow.loadFile(
      path.join(__dirname, "..", "renderer", "index.html"),
    );
  } else {
    singleton.browserWindow.loadURL("http://localhost:8666");
  }
};

function getAndPrintSystemInfos() {
  const logsDir = app.getPath("logs");

  if (import.meta.env.PROD) {
    const logFilename = path.join(logsDir, "cuby-text.txt");
    createDirIfNotExist(logsDir);
    configureLog(logFilename);
  }

  logger.info("app ready");
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

app.whenReady().then(async () => {
  getAndPrintSystemInfos();
  const { userDataDir } = singleton;
  if (!userDataDir) {
    logger.error("Can not get appDataDir");
    app.exit(1);
    return;
  }
  createDirIfNotExist(userDataDir);
  const dbPath = path.join(userDataDir, "notebook.db");
  logger.info(`Database: ${dbPath}`);
  await DbService.initLocal(dbPath);
  listenMessages();
  createWindow();
  await SearchService.get().init();
});

app.on("before-quit", () => {
  logger.info("prepare to quit");
  DbService.get().dispose();
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

function listenMessages() {
  const idHelper = makeDefaultIdGenerator();
  openDocumentMessage.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: OpenDocumentRequest) => {
      const documentService = DocumentService.get();
      const document = await documentService.openDocById(req.id);
      logger.info(`open document: ${req.id}`);

      return document;
    },
  );

  createDocumentMessage.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: CreateDocumentRequest) => {
      const db = DbService.get();
      const newId = idHelper.mkDocId();
      const now = new Date().getTime();
      const document = new BlockyDocument({
        title: req.title,
      });
      const snapshot = JSON.stringify(document.toJSON());
      await db.run(
        `INSERT INTO document(id, snapshot, snapshot_version, accessed_at, created_at, modified_at) VALUES
      (?, ?, ?, ?, ?, ?)`,
        [newId, snapshot, 0, now, now, now],
      );
      logger.info(
        `create new page: ${newId} with title: "${req.title ?? ""}" ~`,
      );
      return {
        id: newId,
      };
    },
  );

  // TODO: check document
  applyChangeset.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: ApplyChangesetRequest) => {
      const documentService = DocumentService.get();
      const id = await documentService.applyChangeset(
        req.documentId,
        changesetFromMessage(req.changeset),
      );
      return {
        changesetId: id,
      };
    },
  );

  searchDocuments.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: SearchDocumentsRequest) => {
      const searchService = SearchService.get();
      const data = searchService.search(req.content);
      return { data };
    },
  );

  recentDocuments.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: RecentDocumentsRequest) => {
      const db = DbService.get();
      const limit = Math.min(100, req.limit ?? 10);
      const rows = await db.all(
        `SELECT
            id as key, title,
            created_at as createdAt, modified_at as modifiedAt
          FROM document
          WHERE trashed_at is NULL
          ORDER BY modified_at DESC LIMIT ?`,
        [limit],
      );
      return {
        data: rows.map((item) => {
          if (!item.title) {
            item.title = "Untitled document";
          }
          return item;
        }),
      };
    },
  );

  fetchOutline.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: FetchOutlineRequest) => {
      const documentService = DocumentService.get();
      return {
        outline: await documentService.getOutlineById(req.docId),
      };
    },
  );

  fetchCurrentTheme.listenMainIpc(ipcMain, async () => {
    const themePath = path.join(
      __dirname,
      "..",
      "..",
      "themes",
      "default-theme.yml",
    );
    // This method is called when the app is started.
    // It must response as fast as possible.
    // I am sorry to use the sync version to block the process.
    const themeContent = fs.readFileSync(themePath, "utf8");
    return yaml.load(themeContent) as any;
  });

  subscribeDocChanged.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: SubscribeDocChangedRequest) => {
      const service = SubscriptionService.get();
      service.subscribe(req.subId, req.docId);
    },
  );

  unsubscribeDocChanged.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: UnsubscribeDocChangedRequest) => {
      const service = SubscriptionService.get();
      service.unsubscribe(req.subId);
    },
  );

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
      const blobStorageService = BlobStorageService.get();
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
  );

  getBlob.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: GetBlobRequest) => {
      const blobStorageService = BlobStorageService.get();
      const data = await blobStorageService.get(req.id);
      return { data };
    },
  );

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
      const documentService = DocumentService.get();
      await documentService.movetoTrash(req.id);
      return { done: true };
    },
  );

  fetchTrash.listenMainIpc(ipcMain, async () => {
    const documentService = DocumentService.get();
    const data = await documentService.fetchTrash();
    return {
      data,
    };
  });

  recoverDocument.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: RecoverDocumentRequest) => {
      const documentService = DocumentService.get();
      await documentService.recoverDocument(req.id);
    },
  );

  // TODO: optimize
  getDocInfo.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: GetDocInfoRequest) => {
      const begin = performance.now();
      const documentService = DocumentService.get();
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
  );

  deletePermanently.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: DeletePermanentlyRequest) => {
      const dbService = DbService.get();

      const row = await dbService.get(
        `SELECT title FROM document
      WHERE id=? AND trashed_at IS NOT NULL`,
        [req.id],
      );

      if (!row) {
        logger.error(`${req.id} not found, can not delete permanently`);
        return { canceled: true };
      }

      const documentService = DocumentService.get();

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
      return {
        canceled: false,
      };
    },
  );

  getGraphInfo.listenMainIpc(ipcMain, async () => {
    const documentService = DocumentService.get();
    return documentService.computeGraph();
  });

  executeGlobalCommand.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: ExecuteGlobalCommandRequest) => {
      if (req.command.key === "reload-window") {
        singleton.browserWindow?.reload();
      }
      return undefined;
    },
  );

  launchURL.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: LaunchURLRequest) => {
      logger.info(`Open ${req.url} externally`);
      shell.openExternal(req.url);
      return undefined;
    },
  );

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
  );

  exportSnapshot.listenMainIpc(
    ipcMain,
    async (evt: IpcMainInvokeEvent, req: ExportSnapshotRequest) => {
      const documentService = DocumentService.get();
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
  );

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
  );
}
