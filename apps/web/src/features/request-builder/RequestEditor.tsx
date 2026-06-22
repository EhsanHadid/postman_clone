import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CollectionTree,
  CollectionTreeFolder,
  EditorTabKey,
  RequestDefinition,
} from "@postman-clone/shared-types";
import {
  ChevronDownIcon,
  HttpIcon,
  LoaderIcon,
  SaveIcon,
  TrpcIcon,
} from "../../components/AppIcons";
import { CodeEditor } from "../../components/CodeEditor";
import { KeyValueTable } from "../../components/KeyValueTable";
import { VariableAwareInput } from "../../components/VariableAwareInput";
import { api } from "../../services/api";
import { getEnvironmentVariableSuggestions } from "../../services/environmentVariables";
import { localDesktop } from "../../services/localDesktop";
import { isDesktopRenderer, isPrivateNetworkUrl } from "../../services/runtime";
import { getDesktopDownloadUrl, useAppConfigStore } from "../../store/appConfigStore";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useDialogStore } from "../../store/dialogStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useHistoryStore } from "../../store/historyStore";
import { hasMeaningfulRequestData, useTabsStore } from "../../store/tabsStore";
import { useWorkspaceStore } from "../../store/workspaceStore";

const editorTabs: Array<{ key: EditorTabKey; label: string }> = [
  { key: "params", label: "Params" },
  { key: "headers", label: "Headers" },
  { key: "body", label: "Body" },
  { key: "auth", label: "Authorization" },
  { key: "cookies", label: "Cookies" },
  { key: "scripts", label: "Scripts" },
];

const httpMethods: RequestDefinition["method"][] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const trpcMethods: RequestDefinition["method"][] = ["GET", "POST"];

function MethodPicker({
  methods,
  value,
  disabled,
  onChange,
}: {
  methods: RequestDefinition["method"][];
  value: RequestDefinition["method"];
  disabled?: boolean;
  onChange: (method: RequestDefinition["method"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="method-picker" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`method-picker__button method-picker__button--${value}`}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{value}</span>
        <ChevronDownIcon className={`method-picker__chevron ${open ? "is-open" : ""}`} />
      </button>

      {open ? (
        <div className="method-picker__menu" role="listbox">
          {methods.map((method) => (
            <button
              className={`method-picker__option method-picker__option--${method} ${
                method === value ? "is-active" : ""
              }`}
              key={method}
              onClick={() => {
                onChange(method);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {method}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function toRequestPayload(draft: RequestDefinition) {
  const normalizedTrpcMethod =
    draft.protocolType === "trpc" ? (draft.method === "POST" ? "POST" : "GET") : draft.method;

  return {
    collectionId: draft.collectionId,
    folderId: draft.folderId,
    name: draft.name,
    protocolType: draft.protocolType,
    method: normalizedTrpcMethod,
    url: draft.url,
    trpcProcedurePath: draft.trpcProcedurePath,
    headers: draft.headers,
    queryParams: draft.queryParams,
    bodyType: draft.protocolType === "trpc" ? "json" : draft.bodyType,
    body: draft.body,
    formData: draft.formData,
    authType: draft.authType,
    authConfig: draft.authConfig,
    preRequestScript: draft.preRequestScript,
    postResponseScript: draft.postResponseScript,
    sortOrder: draft.sortOrder,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong while processing this request.";
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function hasEnabledKeyValueData(items: Array<{ key: string; value: string; enabled: boolean }>) {
  return items.some((item) => item.enabled && (item.key.trim() || item.value.trim()));
}

function getTabHasData(tab: EditorTabKey, draft: RequestDefinition) {
  if (tab === "params") {
    return hasEnabledKeyValueData(draft.queryParams);
  }

  if (tab === "headers") {
    return hasEnabledKeyValueData(draft.headers);
  }

  if (tab === "body") {
    if (draft.protocolType === "trpc") {
      return draft.body.trim().length > 0;
    }

    if (draft.bodyType === "form-urlencoded" || draft.bodyType === "multipart-form-data") {
      return hasEnabledKeyValueData(draft.formData);
    }

    return draft.bodyType !== "none" && draft.body.trim().length > 0;
  }

  if (tab === "auth") {
    return Boolean(draft.authType && draft.authType !== "none" && draft.authType !== "inherit");
  }

  if (tab === "scripts") {
    return Boolean(draft.preRequestScript.trim() || draft.postResponseScript.trim());
  }

  return false;
}

function findFolderPath(folders: CollectionTreeFolder[], folderId: string | null): string[] {
  if (!folderId) {
    return [];
  }

  for (const folder of folders) {
    if (folder.id === folderId) {
      return [folder.name];
    }

    const childPath = findFolderPath(folder.folders, folderId);
    if (childPath.length) {
      return [folder.name, ...childPath];
    }
  }

  return [];
}

function getRequestPath(collections: CollectionTree[], draft: RequestDefinition): string[] {
  const collection = collections.find((item) => item.id === draft.collectionId);
  if (!collection) {
    return [draft.name || "Untitled Request"];
  }

  return [
    collection.name,
    ...findFolderPath(collection.folders, draft.folderId),
    draft.name || "Untitled Request",
  ];
}

export function RequestEditor() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const updateActiveDraft = useTabsStore((state) => state.updateActiveDraft);
  const setActiveEditorTab = useTabsStore((state) => state.setActiveEditorTab);
  const setActiveTabSending = useTabsStore((state) => state.setSending);
  const setResponse = useTabsStore((state) => state.setResponse);
  const markSaved = useTabsStore((state) => state.markSaved);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const environments = useEnvironmentsStore((state) => state.environments);
  const collections = useCollectionsStore((state) => state.collections);
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const fetchAppConfig = useAppConfigStore((state) => state.fetchAppConfig);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const openSaveLocationDialog = useDialogStore((state) => state.openSaveLocationDialog);
  const openNoticeDialog = useDialogStore((state) => state.openNoticeDialog);
  const activeDialog = useDialogStore((state) => state.dialog);
  const [editingName, setEditingName] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const draft = activeTab?.draft ?? null;
  const effectiveMethod =
    draft?.protocolType === "trpc" ? (draft.method === "POST" ? "POST" : "GET") : draft?.method ?? "GET";
  const availableMethods = draft?.protocolType === "trpc" ? trpcMethods : httpMethods;
  const trpcUsesGet = draft?.protocolType === "trpc" && effectiveMethod === "GET";
  const variableSuggestions = getEnvironmentVariableSuggestions(environments, activeEnvironmentId);
  const variableSuggestionKey = variableSuggestions.map((suggestion) => suggestion.key).join("|");
  const requestPath = draft ? getRequestPath(collections, draft) : [];
  const requestParents = requestPath.slice(0, -1);
  const canSaveRequest = Boolean(
    activeTab && draft && (activeTab.requestId || hasMeaningfulRequestData(draft)),
  );

  const changeProtocol = (protocolType: RequestDefinition["protocolType"]) => {
    if (!draft) {
      return;
    }

    if (protocolType === "trpc") {
      updateActiveDraft({
        protocolType,
        method: draft.method === "POST" ? "POST" : "GET",
        bodyType: "json",
      });
      return;
    }

    updateActiveDraft({ protocolType });
  };

  const persistRequest = useCallback(async (location?: {
    name: string;
    collectionId: string;
    folderId: string | null;
    newCollectionName?: string;
  }) => {
    if (!activeTab || !draft) {
      return;
    }

    let collectionId = location?.collectionId ?? draft.collectionId;
    const folderId = location?.folderId ?? draft.folderId;
    const name = location?.name ?? draft.name;

    if (location?.newCollectionName?.trim()) {
      if (!activeWorkspaceId) {
        throw new Error("Choose a workspace before creating a collection.");
      }

      const createdCollection = await api.collections.createInWorkspace(activeWorkspaceId, {
        name: location.newCollectionName.trim(),
      });
      collectionId = createdCollection.id;
    }

    const saved = activeTab.requestId
      ? await api.requests.update(activeTab.requestId, toRequestPayload({ ...draft, name, collectionId, folderId }))
      : await api.requests.create(toRequestPayload({ ...draft, name, collectionId, folderId }));

    markSaved(activeTab.id, saved);
    await fetchCollections();
  }, [activeTab, activeWorkspaceId, draft, fetchCollections, markSaved]);

  const saveRequest = useCallback(async () => {
    if (!activeTab || !draft) {
      return;
    }

    if (!activeTab.requestId && !hasMeaningfulRequestData(draft)) {
      return;
    }

    try {
      if (!draft.collectionId && !activeTab.requestId) {
        openSaveLocationDialog({
          title: "Save Request",
          description: "Choose where this request should live in your collections tree.",
          initialName: draft.name,
          initialCollectionId: draft.collectionId || undefined,
          initialFolderId: draft.folderId,
          onSubmit: async (location) => {
            await persistRequest(location);
          },
        });
        return;
      }

      await persistRequest({
        name: draft.name,
        collectionId: draft.collectionId,
        folderId: draft.folderId,
      });
    } catch (error) {
      openNoticeDialog({
        title: "Unable to save request",
        description: getErrorMessage(error),
      });
    }
  }, [
    activeTab,
    draft,
    openSaveLocationDialog,
    openNoticeDialog,
    persistRequest,
  ]);

  const sendRequest = useCallback(async () => {
    if (!activeTab || !draft) {
      return;
    }

    if (activeTab.isSending) {
      if (isDesktopRenderer()) {
        await localDesktop.execution.cancel(activeTab.id);
      }
      return;
    }

    if (!isDesktopRenderer() && isPrivateNetworkUrl(draft.url)) {
      await fetchAppConfig();
      const downloadUrl = getDesktopDownloadUrl(useAppConfigStore.getState());
      openNoticeDialog({
        title: "Desktop app required",
        description:
          "Browser-based online execution cannot reach localhost or private network addresses. Use the desktop app to send this request from your machine.",
        confirmLabel: "Close",
        actionLabel: "Download Desktop",
        actionUrl: downloadUrl ?? undefined,
      });
      return;
    }

    const payload = {
      requestId: activeTab.requestId ?? undefined,
      activeEnvironmentId,
      request: toRequestPayload(draft),
    };

    const startedAt = Date.now();
    setActiveTabSending(activeTab.id, true);

    try {
      const response = isDesktopRenderer()
        ? await localDesktop.execution.send(payload, {
            environments,
            collections,
            localRequestId: activeTab.id,
          })
        : await api.execution.send(payload);
      const elapsedMs = Date.now() - startedAt;

      if (elapsedMs < 120) {
        await wait(120 - elapsedMs);
      }

      setResponse(activeTab.id, response);
      await fetchHistory();
    } catch (error) {
      const elapsedMs = Date.now() - startedAt;

      if (elapsedMs < 120) {
        await wait(120 - elapsedMs);
      }

      openNoticeDialog({
        title: "Request failed",
        description: getErrorMessage(error),
      });
    } finally {
      setActiveTabSending(activeTab.id, false);
    }
  }, [
    activeEnvironmentId,
    activeTab,
    collections,
    draft,
    environments,
    fetchAppConfig,
    fetchHistory,
    openNoticeDialog,
    setActiveTabSending,
    setResponse,
  ]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (activeDialog) {
        return;
      }

      const hasPrimaryModifier = event.ctrlKey || event.metaKey;
      if (!hasPrimaryModifier) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "s") {
        event.preventDefault();
        void saveRequest();
        return;
      }

      if (event.key === "Enter" && !activeTab?.isSending) {
        event.preventDefault();
        void sendRequest();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeDialog, activeTab?.isSending, saveRequest, sendRequest]);

  if (!activeTab || !draft) {
    return (
      <div className="workspace-empty workbench-panel">
        <h2>No request open</h2>
        <p>Open a request from the sidebar or create a new workbench tab to start sending.</p>
      </div>
    );
  }

  return (
    <section className="request-editor workbench-panel">
      <div className="request-editor__header">
        <div className="request-editor__title-wrap">
          <div className="request-editor__path" aria-label="Request path">
            {requestParents.map((part, index) => (
              <span className="request-editor__path-parent" key={`${part}-${index}`}>
                {part}
                <span className="request-editor__path-separator">/</span>
              </span>
            ))}
            {editingName ? (
              <input
                autoFocus
                className="request-editor__path-name-input"
                value={draft.name}
                onBlur={() => setEditingName(false)}
                onChange={(event) => updateActiveDraft({ name: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape") {
                    event.currentTarget.blur();
                  }
                }}
                placeholder="Untitled Request"
              />
            ) : (
              <button
                className="request-editor__path-name"
                onClick={() => setEditingName(true)}
                title="Rename request"
                type="button"
              >
                {draft.name || "Untitled Request"}
              </button>
            )}
          </div>
          <div className="request-editor__subtitle">
            {activeTab.requestId ? "Saved request" : "Unsaved tab"} |{" "}
            {draft.protocolType === "trpc"
              ? `${trpcUsesGet ? "Query" : "Mutation"} over tRPC`
              : "HTTP request"}
          </div>
        </div>

        <div className="request-editor__actions">
          <div className="protocol-switch" role="tablist" aria-label="Request protocol">
            <button
              className={`protocol-switch__button ${
                draft.protocolType === "http" ? "is-active" : ""
              }`}
              onClick={() => changeProtocol("http")}
              type="button"
            >
              <HttpIcon />
              <span>HTTP</span>
            </button>
            <button
              className={`protocol-switch__button ${
                draft.protocolType === "trpc" ? "is-active" : ""
              }`}
              onClick={() => changeProtocol("trpc")}
              type="button"
            >
              <TrpcIcon />
              <span>tRPC</span>
            </button>
          </div>

          <button
            className="text-action text-action--accent"
            disabled={activeTab.isSending || !canSaveRequest}
            onClick={() => void saveRequest()}
            title="Save request (Ctrl+S)"
            type="button"
          >
            <SaveIcon />
            <span>save</span>
          </button>
        </div>
      </div>

      <div className="request-editor__requestline">
        <MethodPicker
          disabled={activeTab.isSending}
          methods={availableMethods}
          onChange={(method) => updateActiveDraft({ method })}
          value={effectiveMethod}
        />

        <VariableAwareInput
          className="input input--dense"
          wrapperClassName="request-editor__url"
          value={draft.url}
          onChange={(url) => updateActiveDraft({ url })}
          suggestions={variableSuggestions}
          placeholder={
            draft.protocolType === "trpc" ? "https://api.local" : "https://api.example.com/resource"
          }
        />

        {draft.protocolType === "trpc" ? (
          <VariableAwareInput
            className="input input--dense"
            wrapperClassName="request-editor__procedure"
            value={draft.trpcProcedurePath ?? ""}
            onChange={(trpcProcedurePath) => updateActiveDraft({ trpcProcedurePath: trpcProcedurePath || null })}
            suggestions={variableSuggestions}
            placeholder="router.procedure"
          />
        ) : null}

        <button
          className={`button button-primary button--send ${
            activeTab.isSending ? "is-loading" : ""
          }`}
          onClick={() => void sendRequest()}
          title={activeTab.isSending ? "Cancel request" : "Send request (Ctrl+Enter)"}
          type="button"
        >
          {activeTab.isSending ? <LoaderIcon className="spin" /> : null}
          <span>{activeTab.isSending ? "Cancel" : "Send"}</span>
        </button>
      </div>

      <div className="editor-tabs editor-tabs--workbench">
        {editorTabs.map((tab) => (
          <button
            key={tab.key}
            className={`editor-tabs__tab ${
              activeTab.activeEditorTab === tab.key ? "is-active" : ""
            } ${getTabHasData(tab.key, draft) ? "has-data" : ""}`}
            onClick={() => setActiveEditorTab(tab.key)}
            type="button"
          >
            {tab.label}
            {getTabHasData(tab.key, draft) ? (
              <span className="editor-tabs__data-dot" aria-label="Tab has data" />
            ) : null}
          </button>
        ))}
      </div>

      <div className="request-editor__pane">
        {activeTab.activeEditorTab === "params" ? (
          <KeyValueTable
            rows={draft.queryParams}
            variableSuggestions={variableSuggestions}
            onChange={(queryParams) => updateActiveDraft({ queryParams })}
          />
        ) : null}

        {activeTab.activeEditorTab === "headers" ? (
          <KeyValueTable
            rows={draft.headers}
            variableSuggestions={variableSuggestions}
            onChange={(headers) => updateActiveDraft({ headers })}
          />
        ) : null}

        {activeTab.activeEditorTab === "body" ? (
          <div className="request-editor__body">
            {draft.protocolType === "trpc" ? (
              <>
                <div className="request-editor__hint">
                  {trpcUsesGet
                    ? "GET sends the tRPC input as the `input` query parameter."
                    : "POST sends the tRPC input as JSON in the request body."}
                </div>
                <CodeEditor
                  allowJsonComments
                  key={`trpc-body-${variableSuggestionKey}`}
                  height={310}
                  language="json"
                  variableSuggestions={variableSuggestions}
                  value={draft.body}
                  onChange={(body) => updateActiveDraft({ body })}
                />
              </>
            ) : (
              <div className="request-editor__body-controls">
                <label className="request-editor__field">
                  <span>Body type</span>
                  <select
                    className="select select--compact"
                    value={draft.bodyType}
                    onChange={(event) =>
                      updateActiveDraft({
                        bodyType: event.target.value as RequestDefinition["bodyType"],
                      })
                    }
                  >
                    <option value="none">No Body</option>
                    <option value="json">JSON</option>
                    <option value="text">Raw Text</option>
                    <option value="form-urlencoded">x-www-form-urlencoded</option>
                    <option value="multipart-form-data">multipart/form-data</option>
                  </select>
                </label>
              </div>
            )}

            {draft.protocolType !== "trpc" &&
            (draft.bodyType === "json" || draft.bodyType === "text") ? (
              <CodeEditor
                allowJsonComments={draft.bodyType === "json"}
                key={`http-body-${draft.bodyType}-${variableSuggestionKey}`}
                height={310}
                language={draft.bodyType === "json" ? "json" : "plaintext"}
                variableSuggestions={variableSuggestions}
                value={draft.body}
                onChange={(body) => updateActiveDraft({ body })}
              />
            ) : null}

            {draft.protocolType !== "trpc" &&
            (draft.bodyType === "form-urlencoded" ||
              draft.bodyType === "multipart-form-data") ? (
              <KeyValueTable
                rows={draft.formData}
                mode="formData"
                variableSuggestions={variableSuggestions}
                onChange={(formData) => updateActiveDraft({ formData })}
              />
            ) : null}

            {draft.protocolType !== "trpc" && draft.bodyType === "none" ? (
              <div className="request-editor__hint">
                This request currently sends no payload body.
              </div>
            ) : null}
          </div>
        ) : null}

        {activeTab.activeEditorTab === "auth" ? (
          <div className="auth-editor">
            <label className="request-editor__field">
              <span>Authorization type</span>
              <select
                className="select select--compact"
                value={draft.authType ?? "none"}
                onChange={(event) =>
                  updateActiveDraft({
                    authType: event.target.value as RequestDefinition["authType"],
                    authConfig:
                      event.target.value === "basic"
                        ? { username: "", password: "" }
                        : event.target.value === "bearer"
                          ? { token: "" }
                          : null,
                  })
                }
              >
                <option value="inherit">Inherit from parent</option>
                <option value="none">No Auth</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
              </select>
            </label>

            {draft.authType === "basic" ? (
              <div className="request-editor__field-grid">
                <label className="request-editor__field">
                  <span>Username</span>
                  <VariableAwareInput
                    className="input input--dense"
                    placeholder="Username"
                    value={draft.authConfig?.username ?? ""}
                    suggestions={variableSuggestions}
                    onChange={(username) =>
                      updateActiveDraft({
                        authConfig: {
                          ...(draft.authConfig ?? {}),
                          username,
                        },
                      })
                    }
                  />
                </label>
                <label className="request-editor__field">
                  <span>Password</span>
                  <VariableAwareInput
                    className="input input--dense"
                    placeholder="Password"
                    value={draft.authConfig?.password ?? ""}
                    suggestions={variableSuggestions}
                    onChange={(password) =>
                      updateActiveDraft({
                        authConfig: {
                          ...(draft.authConfig ?? {}),
                          password,
                        },
                      })
                    }
                  />
                </label>
              </div>
            ) : null}

            {draft.authType === "bearer" ? (
              <label className="request-editor__field request-editor__field--wide">
                <span>Token</span>
                <VariableAwareInput
                  className="input input--dense"
                  placeholder="Bearer token"
                  value={draft.authConfig?.token ?? ""}
                  suggestions={variableSuggestions}
                  onChange={(token) =>
                    updateActiveDraft({
                      authConfig: {
                        ...(draft.authConfig ?? {}),
                        token,
                      },
                    })
                  }
                />
              </label>
            ) : null}
          </div>
        ) : null}

        {activeTab.activeEditorTab === "cookies" ? (
          <div className="request-editor__hint">
            Desktop requests run locally. Add a Cookie header to send cookies with this request.
          </div>
        ) : null}

        {activeTab.activeEditorTab === "scripts" ? (
          <div className="scripts-editor">
            <div className="scripts-editor__panel">
              <div className="scripts-editor__label">Pre-request script</div>
              <CodeEditor
                key={`pre-script-${variableSuggestionKey}`}
                height={190}
                language="javascript"
                variableSuggestions={variableSuggestions}
                value={draft.preRequestScript}
                onChange={(preRequestScript) => updateActiveDraft({ preRequestScript })}
              />
            </div>
            <div className="scripts-editor__panel">
              <div className="scripts-editor__label">Post-response script</div>
              <CodeEditor
                key={`post-script-${variableSuggestionKey}`}
                height={190}
                language="javascript"
                variableSuggestions={variableSuggestions}
                value={draft.postResponseScript}
                onChange={(postResponseScript) => updateActiveDraft({ postResponseScript })}
              />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
