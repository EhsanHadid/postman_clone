import type { DesktopApi } from "@postman-clone/shared-types";

declare global {
  interface Window {
    desktopApi?: DesktopApi;
  }
}

export {};
