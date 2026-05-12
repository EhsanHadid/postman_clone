import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopApi,
  LocalHistoryCreateInput,
  LocalHistoryFilters,
  LocalRequestInput,
} from "@postman-clone/shared-types";

const desktopApi: DesktopApi = {
  executeRequest: (input: LocalRequestInput) =>
    ipcRenderer.invoke("request:execute", input),
  cancelRequest: (requestId: string) =>
    ipcRenderer.invoke("request:cancel", requestId),
  saveLocalHistory: (entry: LocalHistoryCreateInput) =>
    ipcRenderer.invoke("history:create", entry),
  getLocalHistory: (filters?: LocalHistoryFilters) =>
    ipcRenderer.invoke("history:list", filters),
  deleteLocalHistory: (id: string) =>
    ipcRenderer.invoke("history:delete", id),
  clearLocalHistory: () =>
    ipcRenderer.invoke("history:clear"),
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
