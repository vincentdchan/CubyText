import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { MessageDefinition, messages } from "@pkg/common/message";

function messagesToExposeObj(definitions: MessageDefinition<any, any>[]): any {
  return definitions.reduce<any>((prev, msg) => {
    if (msg.isPush) {
      prev[msg.name] = (callback: any) => {
        const handler = (evt: IpcRendererEvent, req: any) => callback(req);
        ipcRenderer.on(msg.name, handler);
        return {
          dispose() {
            ipcRenderer.removeListener(msg.name, handler);
          },
        };
      };
    } else {
      prev[msg.name] = (...args: any[]) =>
        ipcRenderer.invoke(msg.name, ...args);
    }
    return prev;
  }, {});
}

contextBridge.exposeInMainWorld("electronAPI", messagesToExposeObj(messages));
