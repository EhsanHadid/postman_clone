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

const DEFAULT_REQUEST_NAME = "Untitled Request";

const hasEnabledKeyValueData = (items: Array<{ key: string; value: string; enabled: boolean }>) =>
  items.some((item) => item.enabled && (item.key.trim() || item.value.trim()));

const hasAuthData = (draft: RequestDefinition) => {
  if (draft.authType === "basic") {
    return Boolean(draft.authConfig?.username?.trim() || draft.authConfig?.password?.trim());
  }

  if (draft.authType === "bearer") {
    return Boolean(draft.authConfig?.token?.trim());
  }

  return false;
};

export const hasMeaningfulRequestData = (draft: RequestDefinition) =>
  Boolean(
    (draft.name.trim() && draft.name.trim() !== DEFAULT_REQUEST_NAME) ||
      draft.url.trim() ||
      draft.trpcProcedurePath?.trim() ||
      hasEnabledKeyValueData(draft.headers) ||
      hasEnabledKeyValueData(draft.queryParams) ||
      draft.body.trim() ||
      hasEnabledKeyValueData(draft.formData) ||
      hasAuthData(draft) ||
      draft.preRequestScript.trim() ||
      draft.postResponseScript.trim(),
  );

const nextTabId = () => `tab_${crypto.randomUUID()}`;

interface TabsState {
  tabs: RequestTabState[];
  activeTabId: string | null;
  openRequestTab: (request: RequestDefinition) => void;
  createRequestTab: (collectionId?: string, folderId?: string | null) => void;
  closeTab: (tabId: string) => void;
  closeTabs: (tabIds: string[]) => void;
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
              isDirty: false,
              isSending: false,
              activeEditorTab: "params",
              draft: createDefaultRequest(collectionId, folderId),
              response: null,
            },
          ],
          activeTabId: tabId,
        }));
      },
      closeTab: (tabId) => get().closeTabs([tabId]),
      closeTabs: (tabIds) =>
        set((state) => {
          const tabIdsToClose = new Set(tabIds);
          const nextTabs = state.tabs.filter((tab) => !tabIdsToClose.has(tab.id));
          return {
            tabs: nextTabs,
            activeTabId:
              state.activeTabId && tabIdsToClose.has(state.activeTabId)
                ? nextTabs.at(-1)?.id ?? null
                : state.activeTabId,
          };
        }),
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      updateActiveDraft: (patch) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === state.activeTabId
              ? (() => {
                  const nextDraft = {
                    ...tab.draft,
                    ...patch,
                  };

                  return {
                    ...tab,
                    title: patch.name ?? tab.title,
                    isDirty: tab.requestId ? true : hasMeaningfulRequestData(nextDraft),
                    draft: nextDraft,
                  };
                })()
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
