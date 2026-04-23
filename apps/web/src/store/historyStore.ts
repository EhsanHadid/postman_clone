import { create } from "zustand";
import type { HistoryEntryDefinition } from "@postman-clone/shared-types";
import { api } from "../services/api";

interface HistoryState {
  entries: HistoryEntryDefinition[];
  fetchHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  entries: [],
  fetchHistory: async () => {
    const entries = await api.history.list();
    set({ entries });
  },
}));
