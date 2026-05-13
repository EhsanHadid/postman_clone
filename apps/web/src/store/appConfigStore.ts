import { create } from "zustand";
import { api } from "../services/api";

type AppConfigState = {
  desktopDownloadUrl: string | null;
  initialized: boolean;
  fetchAppConfig: () => Promise<void>;
};

export const useAppConfigStore = create<AppConfigState>((set, get) => ({
  desktopDownloadUrl: null,
  initialized: false,
  fetchAppConfig: async () => {
    if (get().initialized) {
      return;
    }

    try {
      const config = await api.appConfig.get();
      set({
        desktopDownloadUrl: config.desktopDownloadUrl?.trim() || null,
        initialized: true,
      });
    } catch {
      set({ desktopDownloadUrl: null, initialized: true });
    }
  },
}));
