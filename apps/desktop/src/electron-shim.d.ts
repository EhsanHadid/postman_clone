declare module "electron" {
  export const app: {
    isPackaged: boolean;
    getPath(name: "userData"): string;
    whenReady(): Promise<void>;
    on(event: "activate" | "window-all-closed", listener: () => void): void;
    quit(): void;
  };

  export class BrowserWindow {
    constructor(options: Record<string, unknown>);
    loadURL(url: string): Promise<void>;
    static getAllWindows(): BrowserWindow[];
  }

  export const ipcMain: {
    handle(channel: string, listener: (event: unknown, ...args: never[]) => unknown): void;
  };

  export const contextBridge: {
    exposeInMainWorld(key: string, value: unknown): void;
  };

  export const ipcRenderer: {
    invoke(channel: string, ...args: unknown[]): Promise<any>;
  };
}
