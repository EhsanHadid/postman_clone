import { useMemo, useState } from "react";
import { CodeEditor } from "../../components/CodeEditor";
import { SectionCard } from "../../components/SectionCard";
import { useTabsStore } from "../../store/tabsStore";

export function ResponseViewer() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null;
  const response = activeTab?.response ?? null;
  const [view, setView] = useState<"pretty" | "raw" | "headers" | "cookies">("pretty");

  const prettyValue = useMemo(() => {
    if (!response) {
      return "";
    }

    if (response.parsedBody !== null && response.parsedBody !== undefined) {
      return JSON.stringify(response.parsedBody, null, 2);
    }

    return response.body;
  }, [response]);

  return (
    <SectionCard title="Response Viewer">
      {!response ? (
        <div className="workspace-empty workspace-empty--small">
          <h3>No response yet</h3>
          <p>Send the active request to inspect the payload, headers, cookies, and timing.</p>
        </div>
      ) : (
        <div className="response-viewer">
          <div className="response-viewer__meta">
            <span className="badge method-GET">Status {response.status}</span>
            <span>{response.durationMs} ms</span>
            <span>{response.resolvedUrl}</span>
          </div>

          <div className="editor-tabs">
            {(["pretty", "raw", "headers", "cookies"] as const).map((tab) => (
              <button
                key={tab}
                className={`editor-tabs__tab ${view === tab ? "is-active" : ""}`}
                onClick={() => setView(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>

          {view === "pretty" ? (
            <CodeEditor
              height={340}
              language={response.parsedBody ? "json" : "plaintext"}
              readOnly
              value={prettyValue}
            />
          ) : null}

          {view === "raw" ? (
            <CodeEditor height={340} language="plaintext" readOnly value={response.body} />
          ) : null}

          {view === "headers" ? (
            <div className="response-viewer__list">
              {Object.entries(response.headers).map(([key, value]) => (
                <div className="response-viewer__row" key={key}>
                  <span>{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          ) : null}

          {view === "cookies" ? (
            <div className="response-viewer__list">
              {response.cookies.length ? (
                response.cookies.map((cookie) => (
                  <div className="response-viewer__row" key={`${cookie.domain}-${cookie.name}`}>
                    <span>{cookie.name}</span>
                    <span>
                      {cookie.domain}
                      {cookie.path}
                    </span>
                  </div>
                ))
              ) : (
                <div className="request-editor__hint">No `Set-Cookie` headers were returned.</div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </SectionCard>
  );
}
