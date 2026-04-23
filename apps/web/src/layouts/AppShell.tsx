import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { ImportExportControls } from "../features/import-export/ImportExportControls";
import { CollectionsSidebar } from "../features/collections/CollectionsSidebar";
import { CookiesDrawer } from "../features/cookies/CookiesDrawer";
import { EnvironmentDrawer } from "../features/environments/EnvironmentDrawer";
import { HistoryDrawer } from "../features/history/HistoryDrawer";
import { RequestEditor } from "../features/request-builder/RequestEditor";
import { ResponseViewer } from "../features/response-viewer/ResponseViewer";
import { RequestTabs } from "../features/tabs/RequestTabs";
import { useAuthStore } from "../store/authStore";
import { useEnvironmentsStore } from "../store/environmentsStore";
import { useLayoutStore } from "../store/layoutStore";

export function AppShell() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentsStore((state) => state.setActiveEnvironment);
  const sidebarSize = useLayoutStore((state) => state.sidebarSize);
  const requestPaneSize = useLayoutStore((state) => state.requestPaneSize);
  const setSidebarSize = useLayoutStore((state) => state.setSidebarSize);
  const setRequestPaneSize = useLayoutStore((state) => state.setRequestPaneSize);
  const toggleHistory = useLayoutStore((state) => state.toggleHistory);
  const toggleCookies = useLayoutStore((state) => state.toggleCookies);
  const toggleEnvironments = useLayoutStore((state) => state.toggleEnvironments);

  return (
    <div className="workspace-shell">
      <header className="topbar card">
        <div className="topbar__brand">
          <div className="topbar__eyebrow">Private Deployment</div>
          <strong>Postman Clone</strong>
        </div>

        <div className="topbar__controls">
          <select
            className="select"
            value={activeEnvironmentId ?? ""}
            onChange={(event) => setActiveEnvironment(event.target.value || null)}
          >
            {environments.map((environment) => (
              <option key={environment.id} value={environment.id}>
                {environment.name}
              </option>
            ))}
          </select>

          <button className="button button-subtle" onClick={toggleEnvironments} type="button">
            Environments
          </button>
          <button className="button button-subtle" onClick={toggleHistory} type="button">
            History
          </button>
          <button className="button button-subtle" onClick={toggleCookies} type="button">
            Cookies
          </button>
          <ImportExportControls />
          <button className="button button-subtle" onClick={() => void logout()} type="button">
            Logout {user?.username}
          </button>
        </div>
      </header>

      <PanelGroup direction="horizontal" onLayout={(sizes) => setSidebarSize(sizes[0] ?? sidebarSize)}>
        <Panel defaultSize={sidebarSize} minSize={18}>
          <CollectionsSidebar />
        </Panel>
        <PanelResizeHandle className="resize-handle" />
        <Panel minSize={40}>
          <div className="workspace-main">
            <RequestTabs />
            <PanelGroup
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

      <EnvironmentDrawer />
      <HistoryDrawer />
      <CookiesDrawer />
    </div>
  );
}
