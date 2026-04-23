import {
  CloseIcon,
  CookieIcon,
  EnvironmentIcon,
  HistoryIcon,
  PlusIcon,
} from "../../components/AppIcons";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useLayoutStore } from "../../store/layoutStore";
import { useTabsStore } from "../../store/tabsStore";

export function RequestTabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const createRequestTab = useTabsStore((state) => state.createRequestTab);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentsStore((state) => state.setActiveEnvironment);
  const toggleHistory = useLayoutStore((state) => state.toggleHistory);
  const toggleCookies = useLayoutStore((state) => state.toggleCookies);

  return (
    <div className="workbench-tabs">
      <div className="workbench-tabs__scroll">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`workbench-tabs__tab ${tab.id === activeTabId ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="workbench-tabs__tab-title">{tab.title}</span>
            {tab.isDirty ? <span className="workbench-tabs__dirty" /> : null}
            <span
              className="workbench-tabs__close"
              onClick={(event) => {
                event.stopPropagation();
                closeTab(tab.id);
              }}
              role="presentation"
            >
              <CloseIcon />
            </span>
          </button>
        ))}

        <button
          aria-label="New request tab"
          className="icon-button workbench-tabs__new"
          onClick={() => createRequestTab()}
          title="New tab"
          type="button"
        >
          <PlusIcon />
        </button>
      </div>

      <div className="workbench-tabs__actions">
        <label className="workbench-tabs__environment">
          <EnvironmentIcon />
          <select
            className="select select--compact workbench-tabs__environment-select"
            value={activeEnvironmentId ?? ""}
            onChange={(event) => setActiveEnvironment(event.target.value || null)}
          >
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>
        </label>

        <button
          aria-label="Open request history"
          className="icon-button"
          onClick={toggleHistory}
          title="History"
          type="button"
        >
          <HistoryIcon />
        </button>

        <button
          aria-label="Open cookies"
          className="icon-button"
          onClick={toggleCookies}
          title="Cookies"
          type="button"
        >
          <CookieIcon />
        </button>
      </div>
    </div>
  );
}
