import { useEffect, useMemo, useState } from "react";
import {
  CloseIcon,
  CookieIcon,
  EnvironmentIcon,
  HistoryIcon,
  PlusIcon,
} from "../../components/AppIcons";
import { useDialogStore } from "../../store/dialogStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useLayoutStore } from "../../store/layoutStore";
import { handleWheelScroll } from "../../services/wheelScroll";
import { hasMeaningfulRequestData, useTabsStore } from "../../store/tabsStore";
import type { RequestTabState } from "../../types/app";

interface TabMenuState {
  tabId: string;
  x: number;
  y: number;
}

const hasUnsavedTabChanges = (tab: RequestTabState) =>
  tab.requestId ? tab.isDirty : hasMeaningfulRequestData(tab.draft);

export function RequestTabs() {
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const setActiveTab = useTabsStore((state) => state.setActiveTab);
  const closeTab = useTabsStore((state) => state.closeTab);
  const closeTabs = useTabsStore((state) => state.closeTabs);
  const createRequestTab = useTabsStore((state) => state.createRequestTab);
  const openConfirmDialog = useDialogStore((state) => state.openConfirmDialog);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentsStore((state) => state.setActiveEnvironment);
  const toggleHistory = useLayoutStore((state) => state.toggleHistory);
  const toggleCookies = useLayoutStore((state) => state.toggleCookies);
  const [menu, setMenu] = useState<TabMenuState | null>(null);
  const menuTab = useMemo(
    () => tabs.find((tab) => tab.id === menu?.tabId) ?? null,
    [menu?.tabId, tabs],
  );

  useEffect(() => {
    if (!menu) {
      return;
    }

    const closeMenu = () => setMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("click", closeMenu);
    window.addEventListener("contextmenu", closeMenu);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("contextmenu", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menu]);

  const closeTabWithConfirmation = (tabId: string) => {
    const tab = tabs.find((item) => item.id === tabId);

    if (!tab) {
      return;
    }

    if (!hasUnsavedTabChanges(tab)) {
      closeTab(tabId);
      return;
    }

    openConfirmDialog({
      title: "Close unsaved tab?",
      description: `Close "${tab.title}" and discard unsaved changes?`,
      confirmLabel: "Discard changes",
      cancelLabel: "Keep editing",
      tone: "danger",
      onConfirm: () => closeTab(tabId),
    });
  };

  const closeCleanTabs = (tabIds: string[]) => {
    const cleanTabIds = tabs
      .filter((tab) => tabIds.includes(tab.id) && !hasUnsavedTabChanges(tab))
      .map((tab) => tab.id);

    if (cleanTabIds.length > 0) {
      closeTabs(cleanTabIds);
    }
  };

  const getMenuTabGroups = (tabId: string) => {
    const tabIndex = tabs.findIndex((tab) => tab.id === tabId);

    if (tabIndex === -1) {
      return {
        leftTabIds: [],
        rightTabIds: [],
        otherTabIds: [],
      };
    }

    return {
      leftTabIds: tabs.slice(0, tabIndex).map((tab) => tab.id),
      rightTabIds: tabs.slice(tabIndex + 1).map((tab) => tab.id),
      otherTabIds: tabs.filter((tab) => tab.id !== tabId).map((tab) => tab.id),
    };
  };

  const hasCleanTabs = (tabIds: string[]) =>
    tabs.some((tab) => tabIds.includes(tab.id) && !hasUnsavedTabChanges(tab));

  const menuGroups = menuTab ? getMenuTabGroups(menuTab.id) : null;

  return (
    <div className="workbench-tabs">
      <div
        className="workbench-tabs__scroll"
        onWheelCapture={(event) => handleWheelScroll(event, "horizontal")}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`workbench-tabs__tab ${tab.id === activeTabId ? "is-active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setActiveTab(tab.id);
              setMenu({ tabId: tab.id, x: event.clientX, y: event.clientY });
            }}
            type="button"
          >
            <span className={`workbench-tabs__method method-${tab.draft.method}`}>
              {tab.draft.method}
            </span>
            <span className="workbench-tabs__tab-title">
              <span className="workbench-tabs__tab-name">{tab.title}</span>
            </span>
            {hasUnsavedTabChanges(tab) ? <span className="workbench-tabs__dirty" /> : null}
            <span
              className="workbench-tabs__close"
              onClick={(event) => {
                event.stopPropagation();
                closeTabWithConfirmation(tab.id);
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

      {menu && menuTab && menuGroups ? (
        <div
          className="workbench-tabs__menu"
          role="menu"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            className="workbench-tabs__menu-item"
            onClick={() => {
              setMenu(null);
              closeTabWithConfirmation(menuTab.id);
            }}
            role="menuitem"
            type="button"
          >
            Close
          </button>
          <button
            className="workbench-tabs__menu-item"
            disabled={!hasCleanTabs(menuGroups.rightTabIds)}
            onClick={() => {
              setMenu(null);
              closeCleanTabs(menuGroups.rightTabIds);
            }}
            role="menuitem"
            type="button"
          >
            Close tabs to the right
          </button>
          <button
            className="workbench-tabs__menu-item"
            disabled={!hasCleanTabs(menuGroups.leftTabIds)}
            onClick={() => {
              setMenu(null);
              closeCleanTabs(menuGroups.leftTabIds);
            }}
            role="menuitem"
            type="button"
          >
            Close tabs to the left
          </button>
          <button
            className="workbench-tabs__menu-item"
            disabled={!hasCleanTabs(menuGroups.otherTabIds)}
            onClick={() => {
              setMenu(null);
              closeCleanTabs(menuGroups.otherTabIds);
            }}
            role="menuitem"
            type="button"
          >
            Close other tabs
          </button>
        </div>
      ) : null}
    </div>
  );
}
