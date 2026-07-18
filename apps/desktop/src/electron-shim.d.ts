declare module "electron" {
  export const app: {
    isPackaged: boolean;
    getPath(name: "userData" | "temp"): string;
    getVersion(): string;
    whenReady(): Promise<void>;
    on(event: "activate" | "window-all-closed", listener: () => void): void;
    quit(): void;
  };

  export class BrowserWindow {
    constructor(options: Record<string, unknown>);
    loadURL(url: string): Promise<void>;
    setProgressBar(progress: number): void;
    show(): void;
    close(): void;
    isDestroyed(): boolean;
    once(event: "ready-to-show" | "closed", listener: () => void): void;
    webContents: {
      executeJavaScript(script: string): Promise<unknown>;
    };
    static getAllWindows(): BrowserWindow[];
  }

  export const dialog: {
    showMessageBox(
      browserWindow: BrowserWindow,
      options: Record<string, unknown>,
    ): Promise<{ response: number }>;
  };

  export const shell: {
    openPath(path: string): Promise<string>;
  };

  export const ipcMain: {
    handle(channel: string, listener: (event: unknown, ...args: never[]) => unknown): void;
  };

  export const contextBridge: {
    exposeInMainWorld(key: string, value: unknown): void;
  };

  export const ipcRenderer: {
    invoke<T = unknown>(channel: string, ...args: unknown[]): Promise<T>;
  };
}
