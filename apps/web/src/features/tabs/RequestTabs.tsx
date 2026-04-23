import { useTabsStore } from "../../store/tabsStore";

export function RequestTabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const closeTab = useTabsStore((state) => state.closeTab);

  return (
    <div className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-bar__tab ${tab.id === activeTabId ? "is-active" : ""}`}
          onClick={() => setActiveTab(tab.id)}
          type="button"
        >
          <span>{tab.title}</span>
          {tab.isDirty ? <span className="tab-bar__dirty" /> : null}
          <span
            className="tab-bar__close"
            onClick={(event) => {
              event.stopPropagation();
              closeTab(tab.id);
            }}
            role="presentation"
          >
            ×
          </span>
        </button>
      ))}
    </div>
  );
}
