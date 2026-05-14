import { create } from "zustand";
import type { HistoryEntryDefinition } from "@postman-clone/shared-types";
import { localDesktop } from "../services/localDesktop";

interface HistoryState {
  entries: HistoryEntryDefinition[];
  fetchHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  fetchHistory: async () => {
    try {
      const entries = await localDesktop.history.list();
      set({ entries: entries as HistoryEntryDefinition[] });
    } catch {
      set({ entries: [] });
    }
  },
}));
