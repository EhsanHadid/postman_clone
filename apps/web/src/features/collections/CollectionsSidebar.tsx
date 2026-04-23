import { useMemo, useState, type ReactNode } from "react";
import type { CollectionTree, CollectionTreeFolder, RequestDefinition } from "@postman-clone/shared-types";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CollectionIcon,
  CookieIcon,
  EnvironmentIcon,
  FolderIcon,
  HistoryIcon,
  PlusIcon,
  RequestIcon,
  SearchIcon,
} from "../../components/AppIcons";
import { api } from "../../services/api";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useCookiesStore } from "../../store/cookiesStore";
import { useDialogStore } from "../../store/dialogStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useHistoryStore } from "../../store/historyStore";
import { useLayoutStore } from "../../store/layoutStore";
import { useTabsStore } from "../../store/tabsStore";

type SidebarMode = "collections" | "history" | "environments" | "cookies";

interface SidebarTreeNodeProps {
  folder: CollectionTreeFolder;
  onOpenRequest: (request: RequestDefinition) => void;
  onCreateRequest: (collectionId: string, folderId: string | null) => Promise<void>;
  onCreateFolder: (collectionId: string, parentFolderId: string | null) => Promise<void>;
}

interface SidebarModeButtonProps {
  active: boolean;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
}

function SidebarModeButton({ active, hint, icon, onClick }: SidebarModeButtonProps) {
  return (
    <button
      aria-label={hint}
      className={`sidebar-rail__button ${active ? "is-active" : ""}`}
      onClick={onClick}
      title={hint}
      type="button"
    >
      {icon}
    </button>
  );
}

function SidebarFolderNode({
  folder,
  onOpenRequest,
  onCreateRequest,
  onCreateFolder,
}: SidebarTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="sidebar-tree__branch">
      <button
        className="sidebar-tree__folder"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className="sidebar-tree__caret">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <FolderIcon className="sidebar-tree__item-icon" />
        <span className="sidebar-tree__folder-name">{folder.name}</span>
        <span className="sidebar-tree__actions">
          <span
            className="text-action text-action--quiet"
            onClick={(event) => {
              event.stopPropagation();
              void onCreateRequest(folder.collectionId, folder.id);
            }}
            role="presentation"
          >
            request
          </span>
          <span
            className="text-action text-action--quiet"
            onClick={(event) => {
              event.stopPropagation();
              void onCreateFolder(folder.collectionId, folder.id);
            }}
            role="presentation"
          >
            folder
          </span>
        </span>
      </button>

      {expanded ? (
        <div className="sidebar-tree__children">
          {folder.folders.map((childFolder) => (
            <SidebarFolderNode
              key={childFolder.id}
              folder={childFolder}
              onOpenRequest={onOpenRequest}
              onCreateRequest={onCreateRequest}
              onCreateFolder={onCreateFolder}
            />
          ))}
          {folder.requests.map((request) => (
            <button
              className="sidebar-tree__request"
              key={request.id}
              onClick={() => onOpenRequest(request)}
              type="button"
            >
              <RequestIcon className="sidebar-tree__item-icon" />
              <span className={`badge method-${request.method}`}>{request.method}</span>
              <span className="sidebar-tree__request-name">{request.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function filterFolder(folder: CollectionTreeFolder, query: string): CollectionTreeFolder | null {
  const matchesFolder = folder.name.toLowerCase().includes(query);
  const requests = folder.requests.filter((request) =>
    request.name.toLowerCase().includes(query),
  );
  const folders = folder.folders
    .map((childFolder) => filterFolder(childFolder, query))
    .filter(Boolean) as CollectionTreeFolder[];

  if (matchesFolder || requests.length || folders.length) {
    return {
      ...folder,
      folders,
      requests,
    };
  }

  return null;
}

export function CollectionsSidebar() {
  const collections = useCollectionsStore((state) => state.collections);
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const cookies = useCookiesStore((state) => state.cookies);
  const fetchCookies = useCookiesStore((state) => state.fetchCookies);
  const environments = useEnvironmentsStore((state) => state.environments);
  const activeEnvironmentId = useEnvironmentsStore((state) => state.activeEnvironmentId);
  const setActiveEnvironment = useEnvironmentsStore((state) => state.setActiveEnvironment);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);
  const historyEntries = useHistoryStore((state) => state.entries);
  const openRequestTab = useTabsStore((state) => state.openRequestTab);
  const createRequestTab = useTabsStore((state) => state.createRequestTab);
  const openTextDialog = useDialogStore((state) => state.openTextDialog);
  const toggleHistory = useLayoutStore((state) => state.toggleHistory);
  const toggleCookies = useLayoutStore((state) => state.toggleCookies);
  const toggleEnvironments = useLayoutStore((state) => state.toggleEnvironments);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SidebarMode>("collections");

  const filteredCollections = useMemo(() => {
    if (!search.trim()) {
      return collections;
    }

    const query = search.toLowerCase();
    return collections
      .map((collection) => {
        const folders = collection.folders
          .map((folder) => filterFolder(folder, query))
          .filter(Boolean) as CollectionTreeFolder[];
        const requests = collection.requests.filter((request) =>
          request.name.toLowerCase().includes(query),
        );

        return {
          ...collection,
          folders,
          requests,
        };
      })
      .filter(
        (collection) =>
          collection.name.toLowerCase().includes(query) ||
          collection.folders.length > 0 ||
          collection.requests.length > 0,
      );
  }, [collections, search]);

  const cookiesByDomain = useMemo(
    () =>
      cookies.reduce<Record<string, typeof cookies>>((accumulator, cookie) => {
        accumulator[cookie.domain] = accumulator[cookie.domain] ?? [];
        accumulator[cookie.domain].push(cookie);
        return accumulator;
      }, {}),
    [cookies],
  );

  const createCollection = async () => {
    openTextDialog({
      title: "New Collection",
      description: "Add a collection to organize saved requests.",
      label: "Collection name",
      initialValue: "New Collection",
      submitLabel: "Create Collection",
      onSubmit: async (name) => {
        await api.collections.create({ name });
        await fetchCollections();
      },
    });
  };

  const createRequest = async (collectionId: string, folderId: string | null) => {
    openTextDialog({
      title: "New Request",
      description: "Create a saved request directly in this collection or folder.",
      label: "Request name",
      initialValue: "New Request",
      submitLabel: "Create Request",
      onSubmit: async (name) => {
        const request = await api.requests.create({
          collectionId,
          folderId,
          name,
          protocolType: "http",
          method: "GET",
          url: "",
          headers: [],
          queryParams: [],
          bodyType: "none",
          body: "",
          formData: [],
          authType: "none",
          authConfig: null,
          preRequestScript: "",
          postResponseScript: "",
          sortOrder: 0,
        });

        await fetchCollections();
        openRequestTab(request);
      },
    });
  };

  const createFolder = async (collectionId: string, parentFolderId: string | null = null) => {
    openTextDialog({
      title: "New Folder",
      description: "Create a folder inside the current collection tree.",
      label: "Folder name",
      initialValue: "New Folder",
      submitLabel: "Create Folder",
      onSubmit: async (name) => {
        await api.folders.create({ collectionId, parentFolderId, name });
        await fetchCollections();
      },
    });
  };

  const createEnvironment = async () => {
    openTextDialog({
      title: "New Environment",
      description: "Add a reusable set of variables for this workspace.",
      label: "Environment name",
      initialValue: "New Environment",
      submitLabel: "Create Environment",
      onSubmit: async (name) => {
        await api.environments.create({ name });
        await fetchEnvironments();
      },
    });
  };

  const openHistoryRequest = async (requestId: string | null) => {
    if (!requestId) {
      return;
    }

    const request = await api.requests.get(requestId);
    openRequestTab(request);
  };

  const modeTitle =
    mode === "collections"
      ? "Collections"
      : mode === "history"
        ? "History"
        : mode === "environments"
          ? "Environments"
          : "Cookies";

  return (
    <aside className="sidebar">
      <div className="sidebar__rail">
        <SidebarModeButton
          active={mode === "collections"}
          hint="Collections"
          icon={<CollectionIcon />}
          onClick={() => setMode("collections")}
        />
        <SidebarModeButton
          active={mode === "history"}
          hint="Request history"
          icon={<HistoryIcon />}
          onClick={() => setMode("history")}
        />
        <SidebarModeButton
          active={mode === "environments"}
          hint="Environment variables"
          icon={<EnvironmentIcon />}
          onClick={() => setMode("environments")}
        />
        <SidebarModeButton
          active={mode === "cookies"}
          hint="Cookie jar"
          icon={<CookieIcon />}
          onClick={() => setMode("cookies")}
        />
      </div>

      <div className="sidebar__pane">
        <div className="sidebar__header">
          <div>
            <div className="sidebar__eyebrow">Workspace</div>
            <h2>{modeTitle}</h2>
          </div>

          {mode === "collections" ? (
            <button className="text-action text-action--accent" onClick={() => void createCollection()} type="button">
              <PlusIcon />
              <span>new</span>
            </button>
          ) : mode === "history" ? (
            <button className="text-action" onClick={toggleHistory} type="button">
              <span>open drawer</span>
            </button>
          ) : mode === "environments" ? (
            <button className="text-action" onClick={toggleEnvironments} type="button">
              <span>manage</span>
            </button>
          ) : (
            <button className="text-action" onClick={toggleCookies} type="button">
              <span>manage</span>
            </button>
          )}
        </div>

        {mode === "collections" ? (
          <>
            <label className="search-field">
              <SearchIcon />
              <input
                className="input input--dense search-field__input"
                placeholder="Search collections"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <div className="sidebar__text-actions">
              <button
                className="text-action text-action--accent"
                onClick={() => createRequestTab()}
                type="button"
              >
                <PlusIcon />
                <span>new tab</span>
              </button>
              <button className="text-action" onClick={() => void createCollection()} type="button">
                <CollectionIcon />
                <span>collection</span>
              </button>
            </div>

            <div className="sidebar-tree">
              {filteredCollections.map((collection: CollectionTree) => (
                <div className="sidebar-tree__collection" key={collection.id}>
                  <div className="sidebar-tree__collection-header">
                    <div className="sidebar-tree__collection-title-wrap">
                      <CollectionIcon className="sidebar-tree__item-icon" />
                      <span className="sidebar-tree__collection-title">{collection.name}</span>
                    </div>
                    <div className="sidebar-tree__header-actions">
                      <button
                        className="text-action text-action--quiet"
                        onClick={() => void createRequest(collection.id, null)}
                        type="button"
                      >
                        request
                      </button>
                      <button
                        className="text-action text-action--quiet"
                        onClick={() => void createFolder(collection.id, null)}
                        type="button"
                      >
                        folder
                      </button>
                    </div>
                  </div>

                  {collection.requests.map((request) => (
                    <button
                      className="sidebar-tree__request"
                      key={request.id}
                      onClick={() => openRequestTab(request)}
                      type="button"
                    >
                      <RequestIcon className="sidebar-tree__item-icon" />
                      <span className={`badge method-${request.method}`}>{request.method}</span>
                      <span className="sidebar-tree__request-name">{request.name}</span>
                    </button>
                  ))}

                  {collection.folders.map((folder) => (
                    <SidebarFolderNode
                      key={folder.id}
                      folder={folder}
                      onOpenRequest={openRequestTab}
                      onCreateRequest={createRequest}
                      onCreateFolder={createFolder}
                    />
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : null}

        {mode === "history" ? (
          <div className="sidebar-list">
            {historyEntries.length ? (
              historyEntries.map((entry) => (
                <button
                  className="sidebar-list__item"
                  key={entry.id}
                  disabled={!entry.requestId}
                  onClick={() => void openHistoryRequest(entry.requestId)}
                  type="button"
                >
                  <div className="sidebar-list__title-row">
                    <RequestIcon className="sidebar-tree__item-icon" />
                    <span className={`badge method-${entry.method}`}>{entry.method}</span>
                    <span className="sidebar-list__title">{entry.url}</span>
                  </div>
                  <div className="sidebar-list__meta">
                    <span>Status {entry.responseStatus}</span>
                    <span>{entry.durationMs} ms</span>
                    <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="sidebar-empty">Send a request to start building history.</div>
            )}
          </div>
        ) : null}

        {mode === "environments" ? (
          <>
            <div className="sidebar__text-actions">
              <button className="text-action text-action--accent" onClick={() => void createEnvironment()} type="button">
                <PlusIcon />
                <span>new environment</span>
              </button>
              <button className="text-action" onClick={toggleEnvironments} type="button">
                <EnvironmentIcon />
                <span>variables</span>
              </button>
            </div>

            <div className="sidebar-list">
              {environments.map((environment) => (
                <button
                  className={`sidebar-list__item ${
                    environment.id === activeEnvironmentId ? "is-active" : ""
                  }`}
                  key={environment.id}
                  onClick={() => setActiveEnvironment(environment.id)}
                  type="button"
                >
                  <div className="sidebar-list__title-row">
                    <EnvironmentIcon className="sidebar-tree__item-icon" />
                    <span className="sidebar-list__title">{environment.name}</span>
                    {environment.id === activeEnvironmentId ? (
                      <span className="sidebar-pill">Active</span>
                    ) : null}
                  </div>
                  <div className="sidebar-list__meta">
                    <span>{environment.variables.length} variables</span>
                    <span>{environment.isGlobal ? "Global" : "Environment"}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : null}

        {mode === "cookies" ? (
          <div className="sidebar-list">
            {Object.entries(cookiesByDomain).length ? (
              Object.entries(cookiesByDomain).map(([domain, domainCookies]) => (
                <div className="sidebar-card" key={domain}>
                  <div className="sidebar-card__header">
                    <div className="sidebar-tree__collection-title-wrap">
                      <CookieIcon className="sidebar-tree__item-icon" />
                      <span className="sidebar-card__title">{domain}</span>
                    </div>
                    <button
                      className="text-action text-action--quiet"
                      onClick={() => {
                        void api.cookies.clearDomain(domain).then(fetchCookies);
                      }}
                      type="button"
                    >
                      clear
                    </button>
                  </div>
                  <div className="sidebar-list__meta">
                    <span>{domainCookies.length} cookies</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="sidebar-empty">Cookies saved from responses will appear here.</div>
            )}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
