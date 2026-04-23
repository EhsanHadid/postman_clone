import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ImportExportControls } from "../features/import-export/ImportExportControls";
import { CollectionsSidebar } from "../features/collections/CollectionsSidebar";
import { CookiesDrawer } from "../features/cookies/CookiesDrawer";
import { EnvironmentDrawer } from "../features/environments/EnvironmentDrawer";
import { HistoryDrawer } from "../features/history/HistoryDrawer";
import { RequestEditor } from "../features/request-builder/RequestEditor";
import { ResponseViewer } from "../features/response-viewer/ResponseViewer";
import { RequestTabs } from "../features/tabs/RequestTabs";
import { LogoutIcon, SettingsIcon } from "../components/AppIcons";
import { useAuthStore } from "../store/authStore";
import { useEnvironmentsStore } from "../store/environmentsStore";
import { useLayoutStore } from "../store/layoutStore";

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const sidebarSize = useLayoutStore((state) => state.sidebarSize);
  const requestPaneSize = useLayoutStore((state) => state.requestPaneSize);
  const setSidebarSize = useLayoutStore((state) => state.setSidebarSize);
  const setRequestPaneSize = useLayoutStore((state) => state.setRequestPaneSize);
  const activeEnvironment =
    environments.find((environment) => environment.id === activeEnvironmentId) ?? null;

  return (
    <div className="workspace-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <div className="app-header__logo">PM</div>
          <div>
            <strong>Postman Clone</strong>
            <div className="app-header__meta">Local desktop workspace</div>
          </div>
        </div>

        <div className="app-header__actions">
          <div className="user-chip">
            <span className="user-chip__avatar">{user?.username?.slice(0, 1).toUpperCase()}</span>
            <div className="user-chip__content">
              <span className="user-chip__label">Workspace</span>
              <strong>{user?.username}</strong>
            </div>
          </div>

          <details className="app-menu">
            <summary className="icon-button icon-button--header" title="Workspace settings">
              <SettingsIcon />
            </summary>

            <div className="app-menu__panel">
              <div className="app-menu__section">
                <div className="app-menu__title">Workspace settings</div>
                <div className="app-menu__caption">Import, export, restore, and session tools.</div>
              </div>

              <ImportExportControls variant="menu" />

              <button className="menu-action" onClick={() => void logout()} type="button">
                <LogoutIcon />
                <span>Sign out</span>
              </button>
            </div>
          </details>
        </div>
      </header>

      <div className="workspace-shell__body">
        <PanelGroup
          className="workspace-panels"
          direction="horizontal"
          onLayout={(sizes) => setSidebarSize(sizes[0] ?? sidebarSize)}
        >
          <Panel defaultSize={sidebarSize} minSize={18}>
            <CollectionsSidebar />
          </Panel>
          <PanelResizeHandle className="resize-handle" />
          <Panel minSize={40}>
            <div className="workspace-main">
              <RequestTabs />
              <PanelGroup
                className="workspace-panels workspace-panels--vertical workspace-main__panes"
                direction="vertical"
                onLayout={(sizes) => setRequestPaneSize(sizes[0] ?? requestPaneSize)}
              >
                <Panel defaultSize={requestPaneSize} minSize={30}>
                  <RequestEditor />
                </Panel>
                <PanelResizeHandle className="resize-handle resize-handle--horizontal" />
                <Panel minSize={20}>
                  <ResponseViewer />
                </Panel>
              </PanelGroup>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      <footer className="statusbar">
        <span>Local execution</span>
        <span>{activeEnvironment ? `Env: ${activeEnvironment.name}` : "No environment"}</span>
      </footer>

      <EnvironmentDrawer />
      <HistoryDrawer />
      <CookiesDrawer />
    </div>
  );
}
