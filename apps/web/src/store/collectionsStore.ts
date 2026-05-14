import { create } from "zustand";
import type { CollectionTree } from "@postman-clone/shared-types";
import { api } from "../services/api";
import { useWorkspaceStore } from "./workspaceStore";

interface CollectionsState {
  collections: CollectionTree[];
  loading: boolean;
  fetchCollections: () => Promise<void>;
}

export const useCollectionsStore = create<CollectionsState>((set) => ({
  collections: [],
  loading: false,
  fetchCollections: async () => {
    set({ loading: true });
    try {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;
      const collections = workspaceId
        ? await api.collections.listByWorkspace(workspaceId)
        : [];
      set({ collections, loading: false });
    } catch (_error) {
      set({ loading: false });
      throw _error;
    }
  },
}));
