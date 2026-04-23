import { api } from "../../services/api";
import { Drawer } from "../../components/Drawer";
import { useHistoryStore } from "../../store/historyStore";
import { useLayoutStore } from "../../store/layoutStore";
import { useTabsStore } from "../../store/tabsStore";

export function HistoryDrawer() {
  const open = useLayoutStore((state) => state.showHistory);
  const toggle = useLayoutStore((state) => state.toggleHistory);
  const entries = useHistoryStore((state) => state.entries);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const openRequestTab = useTabsStore((state) => state.openRequestTab);

  return (
    <Drawer title="Request History" open={open} onClose={toggle}>
      <div className="drawer-stack">
        {entries.map((entry) => (
          <div className="drawer-card" key={entry.id}>
            <div className="drawer-card__header">
              <div>
                <strong>{entry.method}</strong>
                <div className="drawer-card__meta">{entry.url}</div>
              </div>
              <span>{entry.responseStatus}</span>
            </div>
            <div className="drawer-card__footer">
              <span>{new Date(entry.createdAt).toLocaleString()}</span>
              <span>{entry.durationMs} ms</span>
            </div>
            <div className="drawer-card__actions">
              <button
                className="button button-subtle"
                disabled={!entry.requestId}
                onClick={async () => {
                  if (!entry.requestId) {
                    return;
                  }
                  const request = await api.requests.get(entry.requestId);
                  openRequestTab(request);
                }}
                type="button"
              >
                Reopen
              </button>
              <button
                className="button button-subtle"
                onClick={async () => {
                  await api.history.delete(entry.id);
                  await fetchHistory();
                }}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  );
}
