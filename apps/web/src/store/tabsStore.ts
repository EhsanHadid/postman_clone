import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EditorTabKey, ExecutionResponsePayload, RequestDefinition } from "@postman-clone/shared-types";
import type { RequestTabState } from "../types/app";

const createDefaultRequest = (
  collectionId = "",
  folderId: string | null = null,
): RequestDefinition => ({
  id: "",
  collectionId,
  folderId,
  name: "Untitled Request",
  protocolType: "http",
  method: "GET",
  url: "",
  trpcProcedurePath: null,
  headers: [],
  queryParams: [],
  bodyType: "none",
  body: "",
  formData: [],
  authType: "none",
  authConfig: null,
  preRequestScript: "",
  postResponseScript: "",
  sortOrder: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const nextTabId = () => `tab_${crypto.randomUUID()}`;

interface TabsState {
  tabs: RequestTabState[];
  activeTabId: string | null;
  openRequestTab: (request: RequestDefinition) => void;
  createRequestTab: (collectionId?: string, folderId?: string | null) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateActiveDraft: (patch: Partial<RequestDefinition>) => void;
  setActiveEditorTab: (tab: EditorTabKey) => void;
  setSending: (tabId: string, isSending: boolean) => void;
  setResponse: (tabId: string, response: ExecutionResponsePayload) => void;
  markSaved: (tabId: string, request: RequestDefinition) => void;
}

export const useTabsStore = create<TabsState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      openRequestTab: (request) => {
        const existing = get().tabs.find((tab) => tab.requestId === request.id);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }

        const tabId = nextTabId();
        set((state) => ({
          tabs: [
            ...state.tabs,
            {
              id: tabId,
              requestId: request.id,
              title: request.name,
              isDirty: false,
              isSending: false,
              activeEditorTab: "params",
              draft: request,
              response: null,
            },
          ],
          activeTabId: tabId,
        }));
      },
      createRequestTab: (collectionId = "", folderId = null) => {
        const tabId = nextTabId();
        set((state) => ({
          tabs: [
            ...state.tabs,
            {
              id: tabId,
              requestId: null,
              title: "New Request",
              isDirty: true,
              isSending: false,
              activeEditorTab: "params",
              draft: createDefaultRequest(collectionId, folderId),
              response: null,
            },
          ],
          activeTabId: tabId,
        }));
      },
      closeTab: (tabId) =>
        set((state) => {
          const nextTabs = state.tabs.filter((tab) => tab.id !== tabId);
          return {
            tabs: nextTabs,
            activeTabId:
              state.activeTabId === tabId ? nextTabs.at(-1)?.id ?? null : state.activeTabId,
          };
        }),
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      updateActiveDraft: (patch) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId
              ? {
                  ...tab,
                  title: patch.name ?? tab.title,
                  isDirty: true,
                  draft: {
                    ...tab.draft,
                    ...patch,
                  },
                }
              : tab,
          ),
        })),
      setActiveEditorTab: (activeEditorTab) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId ? { ...tab, activeEditorTab } : tab,
          ),
        })),
      setSending: (tabId, isSending) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, isSending } : tab)),
        })),
      setResponse: (tabId, response) =>
        set((state) => ({
          tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, response } : tab)),
        })),
      markSaved: (tabId, request) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  requestId: request.id,
                  title: request.name,
                  isDirty: false,
                  isSending: false,
                  draft: request,
                }
              : tab,
          ),
        })),
    }),
    {
      name: "postman-clone-tabs",
      partialize: (state) => ({
        tabs: state.tabs.map((tab) => ({ ...tab, isSending: false })),
        activeTabId: state.activeTabId,
      }),
    },
  ),
);
