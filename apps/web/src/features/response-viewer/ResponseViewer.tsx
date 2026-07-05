import { useMemo, useState } from "react";
import { CodeEditor } from "../../components/CodeEditor";
import { handleWheelScroll } from "../../services/wheelScroll";
import { useTabsStore } from "../../store/tabsStore";

function getStatusTone(status: number) {
  if (status >= 500) {
    return "status-badge--danger";
  }

  if (status >= 400) {
    return "status-badge--warning";
  }

  if (status >= 200) {
    return "status-badge--success";
  }

  return "status-badge--neutral";
}

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

  const responseSize = useMemo(() => {
    if (!response) {
      return "0 B";
    }

    const bytes = new TextEncoder().encode(response.body).length;
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [response]);

  return (
    <section className="response-viewer workbench-panel">
      {!response ? (
        <div className="workspace-empty workspace-empty--small">
          <h3>{activeTab?.isSending ? "Sending request..." : "No response yet"}</h3>
          <p>
            {activeTab?.isSending
              ? "Waiting for the executor to return the response payload."
              : "Send the active request to inspect the payload, headers, cookies, and timing."}
          </p>
        </div>
      ) : (
        <>
          <div className="response-viewer__header">
            <div className="response-viewer__title-wrap">
              <h3>Response</h3>
              <div className="response-viewer__subtitle">{response.resolvedUrl}</div>
            </div>

            <div className="response-viewer__meta">
              <span className={`status-badge ${getStatusTone(response.status)}`}>
                {response.status} {response.statusText}
              </span>
              <span>{response.durationMs} ms</span>
              <span>{responseSize}</span>
            </div>
          </div>

          <div
            className="editor-tabs editor-tabs--workbench"
            onWheelCapture={(event) => handleWheelScroll(event, "horizontal")}
          >
            {(["pretty", "raw", "headers", "cookies"] as const).map((tab) => (
              <button
                key={tab}
                className={`editor-tabs__tab ${view === tab ? "is-active" : ""}`}
                onClick={() => setView(tab)}
                type="button"
              >
                {tab === "headers"
                  ? `Headers (${Object.keys(response.headers).length})`
                  : tab === "cookies"
                    ? `Cookies (${response.cookies.length})`
                    : tab === "pretty"
                      ? "Pretty"
                      : "Raw"}
              </button>
            ))}
          </div>

          <div className="response-viewer__content">
            {view === "pretty" ? (
              <div className="response-viewer__editor">
                <CodeEditor
                  height="100%"
                  language={response.parsedBody ? "json" : "plaintext"}
                  readOnly
                  value={prettyValue}
                />
              </div>
            ) : null}

            {view === "raw" ? (
              <div className="response-viewer__editor">
                <CodeEditor height="100%" language="plaintext" readOnly value={response.body} />
              </div>
            ) : null}

            {view === "headers" ? (
              <div
                className="response-viewer__list"
                onWheelCapture={(event) => handleWheelScroll(event, "vertical")}
              >
                {Object.entries(response.headers).map(([key, value]) => (
                  <div className="response-viewer__row" key={key}>
                    <span className="response-viewer__key">{key}</span>
                    <span className="response-viewer__value">{value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {view === "cookies" ? (
              <div
                className="response-viewer__list"
                onWheelCapture={(event) => handleWheelScroll(event, "vertical")}
              >
                {response.cookies.length ? (
                  response.cookies.map((cookie) => (
                    <div className="response-viewer__row" key={`${cookie.domain}-${cookie.name}`}>
                      <span className="response-viewer__key">{cookie.name}</span>
                      <span className="response-viewer__value">
                        {cookie.domain}
                        {cookie.path}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="request-editor__hint">No Set-Cookie headers were returned.</div>
                )}
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
