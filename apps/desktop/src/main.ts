import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  LocalHistoryCreateInput,
  LocalHistoryFilters,
  LocalRequestInput,
} from "@postman-clone/shared-types";
import { LocalHistoryStore } from "./history-store";
import { LocalRequestExecutor } from "./request-executor";

let historyStore: LocalHistoryStore;
const requestExecutor = new LocalRequestExecutor();

function getRendererUrl() {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL ?? "http://localhost:5173";

  if (!app.isPackaged) {
    return devServerUrl;
  }

  return pathToFileURL(join(__dirname, "renderer/index.html")).toString();
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  await loadRenderer(window);
}

async function loadRenderer(window: BrowserWindow, attempt = 1): Promise<void> {
  try {
    await window.loadURL(getRendererUrl());
  } catch (error) {
    if (app.isPackaged || attempt >= 30) {
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    await loadRenderer(window, attempt + 1);
  }
}

function registerIpcHandlers() {
  ipcMain.handle("request:execute", (_event, input: LocalRequestInput) =>
    requestExecutor.execute(input));

  ipcMain.handle("request:cancel", (_event, requestId: string) =>
    requestExecutor.cancel(requestId));

  ipcMain.handle("history:create", (_event, entry: LocalHistoryCreateInput) =>
    historyStore.create(entry));

  ipcMain.handle("history:list", (_event, filters?: LocalHistoryFilters) =>
    historyStore.list(filters));

  ipcMain.handle("history:delete", (_event, id: string) =>
    historyStore.delete(id));

  ipcMain.handle("history:clear", () => historyStore.clear());
}

app.whenReady().then(async () => {
  historyStore = new LocalHistoryStore(app.getPath("userData"));
  registerIpcHandlers();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
