import type { IpcMain, IpcMainInvokeEvent, BrowserWindow } from "electron";
import type { JSONNode, ChangesetMessage } from "blocky-data";
import type { OutlineNode } from "./outlineTree";
import type { IDisposable } from "blocky-common/es/disposable";
import type { Theme } from "./themeDefinition";
import { type GlobalCommand } from "./globalCommands";

export class MessageDefinition<ReqT, RespT> {
  constructor(readonly name: string, readonly isPush: boolean = false) {}

  listenMainIpc(
    ipcMain: IpcMain,
    handler: (evt: IpcMainInvokeEvent, req: ReqT) => RespT | Promise<RespT>,
  ): IDisposable {
    ipcMain.handle(this.name, handler);
    return {
      dispose: () => {
        ipcMain.removeHandler(this.name);
      },
    };
  }

  request(req: ReqT): Promise<RespT> {
    return (window as any).electronAPI[this.name](req);
  }

  push(win: BrowserWindow | undefined, req: ReqT) {
    if (!this.isPush) {
      throw new Error(`${this.name} is not a push message`);
    }
    win?.webContents.send(this.name, req);
  }

  on(callback: (req: ReqT) => void): IDisposable {
    return (window as any).electronAPI[this.name](callback);
  }
}

export interface OpenDocumentRequest {
  id: string;
}

export interface OpenDocumentResponse {
  id: string;
  snapshot?: JSONNode;
  snapshotVersion: number;
  changesets?: ChangesetMessage[];
  accessedAt: number;
  createdAt: number;
  modifiedAt: number;
}

export const openDocumentMessage = new MessageDefinition<
  OpenDocumentRequest,
  OpenDocumentResponse
>("openDocumentDetail");

export interface CreateDocumentRequest {
  title?: string;
}

export interface CreateDocumentResponse {
  id: string;
}

export const createDocumentMessage = new MessageDefinition<
  CreateDocumentRequest,
  CreateDocumentResponse
>("createDocument");

export interface ApplyChangesetRequest {
  documentId: string;
  changeset: ChangesetMessage;
}

export interface ApplyChangesetResponse {
  changesetId?: string;
}

export const applyChangeset = new MessageDefinition<
  ApplyChangesetRequest,
  ApplyChangesetResponse
>("applyChangeset");

export interface SearchDocumentsRequest {
  content: string;
}

export interface SearchItem {
  key: string;
  title: string;
  description?: string;
  createdAt: number;
  modifiedAt: number;
}

export interface SearchDocumentsResponse {
  data: SearchItem[];
}

export const searchDocuments = new MessageDefinition<
  SearchDocumentsRequest,
  SearchDocumentsResponse
>("searchDocuments");

export interface RecentDocumentsRequest {
  limit?: number;
}

export interface RecentDocumentsResponse {
  data: SearchItem[];
}

export const recentDocuments = new MessageDefinition<
  RecentDocumentsRequest,
  RecentDocumentsResponse
>("recentDocuments");

export interface FetchOutlineRequest {
  docId: string;
}

export interface FetchOutlineResponse {
  outline?: OutlineNode;
}

export const fetchOutline = new MessageDefinition<
  FetchOutlineRequest,
  FetchOutlineResponse
>("fetchOutline");

export interface PushOutlineChangedMessage {
  docId: string;
  outline: OutlineNode;
}

export const pushOutlineChanged = new MessageDefinition<
  PushOutlineChangedMessage,
  unknown
>("pushOutlineChanged", true);

export const fetchCurrentTheme = new MessageDefinition<unknown, Theme>(
  "fetchCurrentTheme",
);

export interface SubscribeDocChangedRequest {
  subId: string;
  docId: string;
}

export const subscribeDocChanged = new MessageDefinition<
  SubscribeDocChangedRequest,
  unknown
>("subscribeDocChanged");

export interface UnsubscribeDocChangedRequest {
  subId: string;
}

export const unsubscribeDocChanged = new MessageDefinition<
  UnsubscribeDocChangedRequest,
  unknown
>("unsubscribeDocChanged");

export interface PushSubscriptionMessage {
  subId: string;
  changeset?: ChangesetMessage;
  trashed?: boolean;
}

export const pushSubscriptionMessage = new MessageDefinition<
  PushSubscriptionMessage,
  unknown
>("pushSubscriptionMessage", true);

export interface SelectAndUploadImageRequest {
  ownerId: string;
}

export interface SelectAndUploadMessageResponse {
  id?: string;
}

export const selectAndUploadImageMessage = new MessageDefinition<
  SelectAndUploadImageRequest,
  SelectAndUploadMessageResponse
>("selectAndUploadImageMessage");

export interface GetBlobRequest {
  id: string;
}

export interface GetBlobResponse {
  data: ArrayBuffer;
}

export const getBlob = new MessageDefinition<GetBlobRequest, GetBlobResponse>(
  "getBlob",
);

export interface MoveToTrashRequest {
  id: string;
}

export interface MoveToTrashResponse {
  done: boolean;
}

export const moveToTrash = new MessageDefinition<
  MoveToTrashRequest,
  MoveToTrashResponse
>("moveToTrash");

export interface FetchTrashResponse {
  data: SearchItem[];
}

export const fetchTrash = new MessageDefinition<unknown, FetchTrashResponse>(
  "fetchTrash",
);

export interface RecoverDocumentRequest {
  id: string;
}

export const recoverDocument = new MessageDefinition<
  RecoverDocumentRequest,
  unknown
>("recoverDocument");

export interface GetDocInfoRequest {
  ids: string[];
}

export interface GetDocInfoResponse {
  data: SearchItem[];
}

export const getDocInfo = new MessageDefinition<
  GetDocInfoRequest,
  GetDocInfoResponse
>("getDocInfo");

export interface DeletePermanentlyRequest {
  id: string;
}

export interface DeletePermanentlyResponse {
  canceled: boolean;
}

export const deletePermanently = new MessageDefinition<
  DeletePermanentlyRequest,
  DeletePermanentlyResponse
>("deletePermanently");

export interface GetGraphInfoResponse {
  nodes: any[];
  links: any[];
}

export const getGraphInfo = new MessageDefinition<
  unknown,
  GetGraphInfoResponse
>("getGraphInfo");

export interface ExecuteGlobalCommandRequest {
  command: GlobalCommand;
}

export const executeGlobalCommand = new MessageDefinition<
  ExecuteGlobalCommandRequest,
  undefined
>("executeGlobalCommand");

export interface LaunchURLRequest {
  url: string;
}

export const launchURL = new MessageDefinition<LaunchURLRequest, undefined>(
  "launchURL",
);

export type WindowsActions = "maximize" | "autoMaximize" | "close" | "minimize";

export interface WindowsActionRequest {
  action: WindowsActions;
}

export const windowAction = new MessageDefinition<
  WindowsActionRequest,
  undefined
>("windowAction");

export interface ExportSnapshotRequest {
  docId: string;
  space?: number;
}

export const exportSnapshot = new MessageDefinition<
  ExportSnapshotRequest,
  undefined
>("exportSnapshot");

export interface DocumentOopsRequest {
  docId: string;
  message: string;
  name: string;
  stack?: string;
}

export const documentOops = new MessageDefinition<
  DocumentOopsRequest,
  undefined
>("documentOops");

export enum OpenNotebookFlag {
  Create = 0x01,
  OpenPath = 0x02,
  SelectFile = 0x03,
}

export interface OpenNotebookRequest {
  path?: string;
  flags: OpenNotebookFlag;
}

export const openNotebook = new MessageDefinition<
  OpenNotebookRequest,
  undefined
>("openNotebook");

export interface ReportRecentNotebookRequest {
  localPath?: string;
}

export const reportRecentNotebook = new MessageDefinition<
  ReportRecentNotebookRequest,
  undefined
>("reportRecentNotebook");

export interface RecentNotebook {
  id: number;
  title: string;
  localPath?: string;
  lastOpenedAt: number;
}

export interface FetchRecentNotebooksResponse {
  data: RecentNotebook[];
}

export const fetchRecentNotebooks = new MessageDefinition<
  unknown,
  FetchRecentNotebooksResponse
>("fetchRecentNotebooks");

/**
 * This array is used to register callbacks.
 * Consider using decorator to do this.
 */
export const messages: MessageDefinition<any, any>[] = [
  createDocumentMessage,
  openDocumentMessage,
  applyChangeset,
  searchDocuments,
  recentDocuments,
  fetchOutline,
  pushOutlineChanged,
  fetchCurrentTheme,
  subscribeDocChanged,
  unsubscribeDocChanged,
  pushSubscriptionMessage,
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
  fetchRecentNotebooks,
  reportRecentNotebook,
];
