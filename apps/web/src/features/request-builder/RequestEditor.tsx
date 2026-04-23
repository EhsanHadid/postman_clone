import type { RequestDefinition } from "@postman-clone/shared-types";
import { api } from "../../services/api";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useCookiesStore } from "../../store/cookiesStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useHistoryStore } from "../../store/historyStore";
import { useTabsStore } from "../../store/tabsStore";
import { CodeEditor } from "../../components/CodeEditor";
import { KeyValueTable } from "../../components/KeyValueTable";
import { SectionCard } from "../../components/SectionCard";

function toRequestPayload(draft: RequestDefinition) {
  return {
    collectionId: draft.collectionId,
    folderId: draft.folderId,
    name: draft.name,
    protocolType: draft.protocolType,
    method: draft.method,
    url: draft.url,
    trpcProcedurePath: draft.trpcProcedurePath,
    headers: draft.headers,
    queryParams: draft.queryParams,
    bodyType: draft.bodyType,
    body: draft.body,
    formData: draft.formData,
    authType: draft.authType,
    authConfig: draft.authConfig,
    preRequestScript: draft.preRequestScript,
    postResponseScript: draft.postResponseScript,
    sortOrder: draft.sortOrder,
  };
}

export function RequestEditor() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const updateActiveDraft = useTabsStore((state) => state.updateActiveDraft);
  const setActiveEditorTab = useTabsStore((state) => state.setActiveEditorTab);
  const setResponse = useTabsStore((state) => state.setResponse);
  const markSaved = useTabsStore((state) => state.markSaved);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const fetchCookies = useCookiesStore((state) => state.fetchCookies);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;

  if (!activeTab) {
    return (
      <div className="workspace-empty card">
        <h2>No request open</h2>
        <p>Create a scratch tab or open a saved request from the collections sidebar.</p>
      </div>
    );
  }

  const draft = activeTab.draft;

  const saveRequest = async () => {
    if (!draft.collectionId && !activeTab.requestId) {
      window.alert("Assign this request to a collection before saving.");
      return;
    }

    const saved = activeTab.requestId
      ? await api.requests.update(activeTab.requestId, toRequestPayload(draft))
      : await api.requests.create(toRequestPayload(draft));

    markSaved(activeTab.id, saved);
    await fetchCollections();
  };

  const sendRequest = async () => {
    const payload = {
      requestId: activeTab.requestId ?? undefined,
      activeEnvironmentId,
      request: toRequestPayload(draft),
    };

    const response =
      draft.protocolType === "trpc"
        ? await api.execution.trpc(payload)
        : await api.execution.http(payload);

    setResponse(activeTab.id, response);
    await Promise.all([fetchHistory(), fetchCookies(), fetchEnvironments()]);
  };

  return (
    <div className="request-editor">
      <SectionCard
        title="Request Builder"
        actions={
          <div className="request-editor__actions">
            <button className="button button-subtle" onClick={() => void saveRequest()} type="button">
              Save
            </button>
            <button className="button button-primary" onClick={() => void sendRequest()} type="button">
              Send
            </button>
          </div>
        }
      >
        <div className="request-editor__meta">
          <input
            className="input"
            value={draft.name}
            onChange={(event) => updateActiveDraft({ name: event.target.value })}
            placeholder="Request name"
          />
          <select
            className="select"
            value={draft.protocolType}
            onChange={(event) =>
              updateActiveDraft({
                protocolType: event.target.value as RequestDefinition["protocolType"],
              })
            }
          >
            <option value="http">HTTP</option>
            <option value="trpc">tRPC</option>
          </select>
          <select
            className="select"
            value={draft.method}
            disabled={draft.protocolType === "trpc"}
            onChange={(event) =>
              updateActiveDraft({
                method: event.target.value as RequestDefinition["method"],
              })
            }
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            className="input request-editor__url"
            value={draft.url}
            onChange={(event) => updateActiveDraft({ url: event.target.value })}
            placeholder={
              draft.protocolType === "trpc"
                ? "https://api.local"
                : "https://api.example.com/resource"
            }
          />
        </div>

        {draft.protocolType === "trpc" ? (
          <div className="request-editor__meta">
            <input
              className="input"
              value={draft.trpcProcedurePath ?? ""}
              onChange={(event) =>
                updateActiveDraft({ trpcProcedurePath: event.target.value || null })
              }
              placeholder="Procedure path"
            />
          </div>
        ) : null}

        <div className="editor-tabs">
          {(["params", "headers", "body", "auth", "cookies", "scripts"] as const).map((tab) => (
            <button
              key={tab}
              className={`editor-tabs__tab ${
                activeTab.activeEditorTab === tab ? "is-active" : ""
              }`}
              onClick={() => setActiveEditorTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab.activeEditorTab === "params" ? (
          <KeyValueTable
            rows={draft.queryParams}
            onChange={(queryParams) => updateActiveDraft({ queryParams })}
          />
        ) : null}

        {activeTab.activeEditorTab === "headers" ? (
          <KeyValueTable
            rows={draft.headers}
            onChange={(headers) => updateActiveDraft({ headers })}
          />
        ) : null}

        {activeTab.activeEditorTab === "body" ? (
          <div className="request-editor__body">
            <select
              className="select"
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

            {draft.bodyType === "json" || draft.bodyType === "text" ? (
              <CodeEditor
                height={290}
                language={draft.bodyType === "json" ? "json" : "plaintext"}
                value={draft.body}
                onChange={(body) => updateActiveDraft({ body })}
              />
            ) : null}

            {draft.bodyType === "form-urlencoded" || draft.bodyType === "multipart-form-data" ? (
              <KeyValueTable
                rows={draft.formData}
                mode="formData"
                onChange={(formData) => updateActiveDraft({ formData })}
              />
            ) : null}
          </div>
        ) : null}

        {activeTab.activeEditorTab === "auth" ? (
          <div className="auth-editor">
            <select
              className="select"
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
              <option value="inherit">Inherit</option>
              <option value="none">No Auth</option>
              <option value="basic">Basic</option>
              <option value="bearer">Bearer</option>
            </select>

            {draft.authType === "basic" ? (
              <div className="request-editor__meta">
                <input
                  className="input"
                  placeholder="Username"
                  value={draft.authConfig?.username ?? ""}
                  onChange={(event) =>
                    updateActiveDraft({
                      authConfig: {
                        ...(draft.authConfig ?? {}),
                        username: event.target.value,
                      },
                    })
                  }
                />
                <input
                  className="input"
                  placeholder="Password"
                  type="password"
                  value={draft.authConfig?.password ?? ""}
                  onChange={(event) =>
                    updateActiveDraft({
                      authConfig: {
                        ...(draft.authConfig ?? {}),
                        password: event.target.value,
                      },
                    })
                  }
                />
              </div>
            ) : null}

            {draft.authType === "bearer" ? (
              <input
                className="input"
                placeholder="Bearer token"
                value={draft.authConfig?.token ?? ""}
                onChange={(event) =>
                  updateActiveDraft({
                    authConfig: {
                      ...(draft.authConfig ?? {}),
                      token: event.target.value,
                    },
                  })
                }
              />
            ) : null}
          </div>
        ) : null}

        {activeTab.activeEditorTab === "cookies" ? (
          <div className="request-editor__hint">
            Matching cookies are managed automatically on the backend and will be attached when this request is sent.
          </div>
        ) : null}

        {activeTab.activeEditorTab === "scripts" ? (
          <div className="scripts-editor">
            <div>
              <div className="scripts-editor__label">Pre-request script</div>
              <CodeEditor
                height={180}
                language="javascript"
                value={draft.preRequestScript}
                onChange={(preRequestScript) => updateActiveDraft({ preRequestScript })}
              />
            </div>
            <div>
              <div className="scripts-editor__label">Post-response script</div>
              <CodeEditor
                height={180}
                language="javascript"
                value={draft.postResponseScript}
                onChange={(postResponseScript) => updateActiveDraft({ postResponseScript })}
              />
            </div>
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
