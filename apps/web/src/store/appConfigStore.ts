import { create } from "zustand";
import type { DesktopPlatform } from "../services/api";
import { api } from "../services/api";

type DesktopDownloadUrls = Record<DesktopPlatform, string | null>;

type AppConfigState = {
  desktopDownloadUrl: string | null;
  desktopDownloadUrls: DesktopDownloadUrls;
  initialized: boolean;
  fetchAppConfig: () => Promise<void>;
};

const emptyDownloadUrls: DesktopDownloadUrls = {
  windows: null,
  linux: null,
  macos: null,
};

function detectDesktopPlatform(): DesktopPlatform {
  const ua = (
    typeof navigator === "undefined" ? "" : navigator.userAgent
  ).toLowerCase();

  if (ua.includes("linux") && !ua.includes("android")) {
    return "linux";
  }

  if (ua.includes("mac")) {
    return "macos";
  }

  return "windows";
}

/**
 * Returns the desktop installer URL matching the visitor's OS, falling back to
 * the primary (Windows) URL when the detected platform has no build configured.
 */
export function getDesktopDownloadUrl(state: AppConfigState): string | null {
  const platformUrl = state.desktopDownloadUrls[detectDesktopPlatform()];
  return platformUrl || state.desktopDownloadUrl;
}

function deriveLinuxUrl(windowsUrl: string | null): string | null {
  if (!windowsUrl) {
    return null;
  }

  const linuxUrl = windowsUrl.replace(/Windows-x64\.exe$/i, "Linux-x64.deb");
  return linuxUrl === windowsUrl ? null : linuxUrl;
}

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  desktopDownloadUrl: null,
  desktopDownloadUrls: emptyDownloadUrls,
  initialized: false,
  fetchAppConfig: async () => {
    if (get().initialized) {
      return;
    }

    try {
      const config = await api.appConfig.get();
      const desktopDownloadUrl = config.desktopDownloadUrl?.trim() || null;
      const urls = config.desktopDownloadUrls;

      set({
        desktopDownloadUrl,
        desktopDownloadUrls: {
          windows: urls?.windows?.trim() || desktopDownloadUrl,
          linux: urls?.linux?.trim() || deriveLinuxUrl(desktopDownloadUrl),
          macos: urls?.macos?.trim() || null,
        },
        initialized: true,
      });
    } catch {
      set({
        desktopDownloadUrl: null,
        desktopDownloadUrls: emptyDownloadUrls,
        initialized: true,
      });
    }
  },
}));
