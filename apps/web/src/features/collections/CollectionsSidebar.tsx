import {
  useEffect,
  useMemo,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type {
  CollectionTree,
  CollectionTreeFolder,
  FolderDefinition,
  RequestDefinition,
} from "@postman-clone/shared-types";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CollectionIcon,
  CopyIcon,
  CookieIcon,
  EnvironmentIcon,
  FolderIcon,
  HistoryIcon,
  PlusIcon,
  RequestIcon,
  SearchIcon,
  TrashIcon,
} from "../../components/AppIcons";
import { api } from "../../services/api";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useCookiesStore } from "../../store/cookiesStore";
import { useDialogStore } from "../../store/dialogStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useHistoryStore } from "../../store/historyStore";
import { useLayoutStore } from "../../store/layoutStore";
import { useTabsStore } from "../../store/tabsStore";
import { useWorkspaceStore, workspacePermissions } from "../../store/workspaceStore";

type SidebarMode = "collections" | "history" | "environments" | "cookies";

interface SidebarTreeNodeProps {
  folder: CollectionTreeFolder;
  expandedFolderIds: Set<string>;
  onOpenRequest: (request: RequestDefinition) => void;
  onToggleFolder: (folderId: string) => void;
  onCreateRequest: (collectionId: string, folderId: string | null) => Promise<void>;
  onCreateFolder: (collectionId: string, parentFolderId: string | null) => Promise<void>;
  onDeleteFolder: (folder: CollectionTreeFolder) => Promise<void>;
  onDeleteRequest: (request: RequestDefinition) => Promise<void>;
  onDuplicateRequest: (request: RequestDefinition) => Promise<void>;
  onMoveRequest: (
    requestId: string,
    target: RequestMoveTarget,
    targetRequestId?: string,
    placement?: RequestDropPlacement,
  ) => Promise<void>;
  onMoveFolder: (
    folderId: string,
    target: FolderMoveTarget,
    targetFolderId?: string,
    placement?: RequestDropPlacement,
  ) => Promise<void>;
  onRequestDragStart: (requestId: string) => void;
  onFolderDragStart: (folderId: string) => void;
  onRequestDragEnd: () => void;
  onFolderDragEnd: () => void;
  activeRequestId: string | null;
  canEditCollections: boolean;
  draggedRequestId: string | null;
  draggedFolderId: string | null;
  dropIndicator: DropIndicator | null;
  onDropIndicatorChange: (indicator: DropIndicator | null) => void;
}

interface SidebarModeButtonProps {
  active: boolean;
  hint: string;
  icon: ReactNode;
  onClick: () => void;
}

type RequestDropPlacement = "before" | "after" | "inside";

type RequestMoveTarget = {
  collectionId: string;
  folderId: string | null;
};

type FolderMoveTarget = {
  collectionId: string;
  parentFolderId: string | null;
};

type DropIndicator = {
  itemType: "request" | "folder";
  itemId: string;
  placement: RequestDropPlacement;
};

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
  expandedFolderIds,
  onOpenRequest,
  onToggleFolder,
  onCreateRequest,
  onCreateFolder,
  onDeleteFolder,
  onDeleteRequest,
  onDuplicateRequest,
  onMoveRequest,
  onMoveFolder,
  onRequestDragStart,
  onFolderDragStart,
  onRequestDragEnd,
  onFolderDragEnd,
  activeRequestId,
  canEditCollections,
  draggedRequestId,
  draggedFolderId,
  dropIndicator,
  onDropIndicatorChange,
}: SidebarTreeNodeProps) {
  const expanded = expandedFolderIds.has(folder.id);
  const isDraggingFolder = draggedFolderId === folder.id;
  const folderDropClass =
    dropIndicator?.itemType === "folder" && dropIndicator.itemId === folder.id
      ? `is-drop-${dropIndicator.placement}`
      : "";

  const handleFolderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggleFolder(folder.id);
    }
  };

  return (
    <div className="sidebar-tree__branch">
      <div
        className={`sidebar-tree__folder ${
          draggedRequestId || (draggedFolderId && draggedFolderId !== folder.id)
            ? "is-drop-target"
            : ""
        } ${isDraggingFolder ? "is-dragging" : ""} ${folderDropClass}`}
        draggable={canEditCollections}
        onDragStart={(event) => {
          event.stopPropagation();
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("application/x-folder-id", folder.id);
          event.dataTransfer.setData("text/plain", folder.id);
          onFolderDragStart(folder.id);
        }}
        onDragEnd={() => {
          onDropIndicatorChange(null);
          onFolderDragEnd();
        }}
        onDragOver={(event) => {
          if (!canEditCollections) {
            return;
          }

          if (draggedRequestId) {
            event.preventDefault();
            onDropIndicatorChange({
              itemType: "folder",
              itemId: folder.id,
              placement: "inside",
            });
            return;
          }

          if (draggedFolderId && draggedFolderId !== folder.id) {
            event.preventDefault();
            onDropIndicatorChange({
              itemType: "folder",
              itemId: folder.id,
              placement: getFolderDropPlacement(event),
            });
          }
        }}
        onDragLeave={() => {
          if (dropIndicator?.itemType === "folder" && dropIndicator.itemId === folder.id) {
            onDropIndicatorChange(null);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const requestId = event.dataTransfer.getData("application/x-request-id");
          const folderId = event.dataTransfer.getData("application/x-folder-id");
          onDropIndicatorChange(null);

          if (!canEditCollections) {
            return;
          }

          if (requestId) {
            void onMoveRequest(
              requestId,
              { collectionId: folder.collectionId, folderId: folder.id },
            );
            return;
          }

          if (folderId && folderId !== folder.id) {
            const placement = getFolderDropPlacement(event);
            if (placement === "inside") {
              void onMoveFolder(folderId, {
                collectionId: folder.collectionId,
                parentFolderId: folder.id,
              });
              return;
            }

            void onMoveFolder(
              folderId,
              { collectionId: folder.collectionId, parentFolderId: folder.parentFolderId },
              folder.id,
              placement,
            );
          }
        }}
        onClick={() => onToggleFolder(folder.id)}
        onKeyDown={handleFolderKeyDown}
        role="button"
        tabIndex={0}
      >
        <span className="sidebar-tree__caret">
          {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
        </span>
        <FolderIcon className="sidebar-tree__item-icon" />
        <span className="sidebar-tree__folder-name">{folder.name}</span>
        <span className="sidebar-tree__actions">
          <button
            aria-label="Add request"
            className="icon-button icon-button--tiny sidebar-tree__action"
            disabled={!canEditCollections}
            onClick={(event) => {
              event.stopPropagation();
              void onCreateRequest(folder.collectionId, folder.id);
            }}
            title="Add request"
            type="button"
          >
            <RequestIcon />
          </button>
          <button
            aria-label="Create folder"
            className="icon-button icon-button--tiny sidebar-tree__action"
            disabled={!canEditCollections}
            onClick={(event) => {
              event.stopPropagation();
              void onCreateFolder(folder.collectionId, folder.id);
            }}
            title="Create folder"
            type="button"
          >
            <FolderIcon />
          </button>
          <button
            aria-label="Delete folder"
            className="icon-button icon-button--tiny sidebar-tree__action sidebar-tree__delete-action"
            disabled={!canEditCollections}
            onClick={(event) => {
              event.stopPropagation();
              void onDeleteFolder(folder);
            }}
            title="Delete folder"
            type="button"
          >
            <TrashIcon />
          </button>
        </span>
      </div>

      {expanded ? (
        <div
          className={`sidebar-tree__children ${
            draggedRequestId || (draggedFolderId && draggedFolderId !== folder.id)
              ? "is-drop-target"
              : ""
          }`}
          onDragOver={(event) => {
            if (!canEditCollections || (!draggedRequestId && !draggedFolderId)) {
              return;
            }
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const requestId = event.dataTransfer.getData("application/x-request-id");
            const folderId = event.dataTransfer.getData("application/x-folder-id");
            onDropIndicatorChange(null);

            if (!canEditCollections) {
              return;
            }

            if (requestId) {
              void onMoveRequest(requestId, {
                collectionId: folder.collectionId,
                folderId: folder.id,
              });
              return;
            }

            if (folderId && folderId !== folder.id) {
              void onMoveFolder(folderId, {
                collectionId: folder.collectionId,
                parentFolderId: folder.id,
              });
            }
          }}
        >
          {folder.folders.map((childFolder) => (
            <SidebarFolderNode
              key={childFolder.id}
              folder={childFolder}
              expandedFolderIds={expandedFolderIds}
              onOpenRequest={onOpenRequest}
              onToggleFolder={onToggleFolder}
              onCreateRequest={onCreateRequest}
              onCreateFolder={onCreateFolder}
              onDeleteFolder={onDeleteFolder}
              onDeleteRequest={onDeleteRequest}
              onDuplicateRequest={onDuplicateRequest}
              onMoveRequest={onMoveRequest}
              onMoveFolder={onMoveFolder}
              onRequestDragStart={onRequestDragStart}
              onFolderDragStart={onFolderDragStart}
              onRequestDragEnd={onRequestDragEnd}
              onFolderDragEnd={onFolderDragEnd}
              activeRequestId={activeRequestId}
              canEditCollections={canEditCollections}
              draggedRequestId={draggedRequestId}
              draggedFolderId={draggedFolderId}
              dropIndicator={dropIndicator}
              onDropIndicatorChange={onDropIndicatorChange}
            />
          ))}
          {folder.requests.map((request) => (
            <div
              className={`sidebar-tree__request-row ${
                request.id === activeRequestId ? "is-active" : ""
              } ${request.id === draggedRequestId ? "is-dragging" : ""} ${
                dropIndicator?.itemType === "request" && dropIndicator.itemId === request.id
                  ? `is-drop-${dropIndicator.placement}`
                  : ""
              }`}
              draggable={canEditCollections}
              key={request.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-request-id", request.id);
                event.dataTransfer.setData("text/plain", request.id);
                onRequestDragStart(request.id);
              }}
              onDragEnd={onRequestDragEnd}
              onDragOver={(event) => {
                if (!canEditCollections || !draggedRequestId || draggedRequestId === request.id) {
                  return;
                }
                event.preventDefault();
                onDropIndicatorChange({
                  itemType: "request",
                  itemId: request.id,
                  placement: getRequestDropPlacement(event),
                });
              }}
              onDragLeave={() => {
                if (dropIndicator?.itemType === "request" && dropIndicator.itemId === request.id) {
                  onDropIndicatorChange(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const requestId = event.dataTransfer.getData("application/x-request-id");
                onDropIndicatorChange(null);
                if (!requestId || !canEditCollections || requestId === request.id) {
                  return;
                }
                void onMoveRequest(
                  requestId,
                  { collectionId: folder.collectionId, folderId: folder.id },
                  request.id,
                  getRequestDropPlacement(event),
                );
              }}
            >
              <button
                className="sidebar-tree__request"
                onClick={() => onOpenRequest(request)}
                type="button"
              >
                <RequestIcon className="sidebar-tree__item-icon" />
                <span className={`badge method-${request.method}`}>{request.method}</span>
                <span className="sidebar-tree__request-name">{request.name}</span>
              </button>
              <button
                aria-label="Duplicate request"
                className="icon-button icon-button--tiny sidebar-tree__action"
                disabled={!canEditCollections}
                onClick={() => void onDuplicateRequest(request)}
                title="Duplicate request"
                type="button"
              >
                <CopyIcon />
              </button>
              <button
                aria-label="Delete request"
                className="icon-button icon-button--tiny sidebar-tree__action sidebar-tree__delete-action"
                disabled={!canEditCollections}
                onClick={() => void onDeleteRequest(request)}
                title="Delete request"
                type="button"
              >
                <TrashIcon />
              </button>
            </div>
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

function collectFolderIds(collections: CollectionTree[]): string[] {
  const ids: string[] = [];
  const visitFolder = (folder: CollectionTreeFolder) => {
    ids.push(folder.id);
    folder.folders.forEach(visitFolder);
  };

  collections.forEach((collection) => collection.folders.forEach(visitFolder));
  return ids;
}

function collectCollectionIds(collections: CollectionTree[]): string[] {
  return collections.map((collection) => collection.id);
}

function findFolderById(
  folders: CollectionTreeFolder[],
  folderId: string | null,
): CollectionTreeFolder | null {
  if (!folderId) {
    return null;
  }

  for (const folder of folders) {
    if (folder.id === folderId) {
      return folder;
    }

    const childFolder = findFolderById(folder.folders, folderId);
    if (childFolder) {
      return childFolder;
    }
  }

  return null;
}

function findRequestById(
  collections: CollectionTree[],
  requestId: string,
): RequestDefinition | null {
  const findInFolders = (folders: CollectionTreeFolder[]): RequestDefinition | null => {
    for (const folder of folders) {
      const request = folder.requests.find((item) => item.id === requestId);
      if (request) {
        return request;
      }

      const childRequest = findInFolders(folder.folders);
      if (childRequest) {
        return childRequest;
      }
    }

    return null;
  };

  for (const collection of collections) {
    const request = collection.requests.find((item) => item.id === requestId);
    if (request) {
      return request;
    }

    const childRequest = findInFolders(collection.folders);
    if (childRequest) {
      return childRequest;
    }
  }

  return null;
}

function findFolderInCollections(
  collections: CollectionTree[],
  folderId: string,
): CollectionTreeFolder | null {
  for (const collection of collections) {
    const folder = findFolderById(collection.folders, folderId);
    if (folder) {
      return folder;
    }
  }

  return null;
}

function getTargetRequests(
  collections: CollectionTree[],
  target: RequestMoveTarget,
): RequestDefinition[] {
  const collection = collections.find((item) => item.id === target.collectionId);
  if (!collection) {
    return [];
  }

  if (!target.folderId) {
    return collection.requests;
  }

  return findFolderById(collection.folders, target.folderId)?.requests ?? [];
}

function getTargetFolders(
  collections: CollectionTree[],
  target: FolderMoveTarget,
): CollectionTreeFolder[] {
  const collection = collections.find((item) => item.id === target.collectionId);
  if (!collection) {
    return [];
  }

  if (!target.parentFolderId) {
    return collection.folders;
  }

  return findFolderById(collection.folders, target.parentFolderId)?.folders ?? [];
}

function isFolderDescendant(folder: CollectionTreeFolder, candidateId: string): boolean {
  return folder.folders.some(
    (childFolder) => childFolder.id === candidateId || isFolderDescendant(childFolder, candidateId),
  );
}

function getRequestDropPlacement(event: DragEvent<HTMLElement>): RequestDropPlacement {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
}

function getFolderDropPlacement(event: DragEvent<HTMLElement>): RequestDropPlacement {
  const bounds = event.currentTarget.getBoundingClientRect();
  const offsetY = event.clientY - bounds.top;
  const topThird = bounds.height / 3;
  const bottomThird = bounds.height * 2 / 3;

  if (offsetY < topThird) {
    return "before";
  }

  if (offsetY > bottomThird) {
    return "after";
  }

  return "inside";
}

function parseRequestPath(rawName: string) {
  const parts = rawName
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    folderNames: parts.slice(0, -1),
    requestName: parts.at(-1) ?? rawName.trim(),
  };
}

function getFolderStateStorageKey(workspaceId: string | null) {
  return `postman-clone-folder-expansion:${workspaceId ?? "global"}`;
}

function getCollectionStateStorageKey(workspaceId: string | null) {
  return `postman-clone-collection-expansion:${workspaceId ?? "global"}`;
}

function saveExpandedFolderIds(workspaceId: string | null, folderIds: Set<string>) {
  window.localStorage.setItem(
    getFolderStateStorageKey(workspaceId),
    JSON.stringify([...folderIds]),
  );
}

function saveExpandedCollectionIds(workspaceId: string | null, collectionIds: Set<string>) {
  window.localStorage.setItem(
    getCollectionStateStorageKey(workspaceId),
    JSON.stringify([...collectionIds]),
  );
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
  const closeTab = useTabsStore((state) => state.closeTab);
  const tabs = useTabsStore((state) => state.tabs);
  const activeTabId = useTabsStore((state) => state.activeTabId);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);
  const activeWorkspace = useWorkspaceStore((state) =>
    state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId),
  );
  const openTextDialog = useDialogStore((state) => state.openTextDialog);
  const openConfirmDialog = useDialogStore((state) => state.openConfirmDialog);
  const toggleHistory = useLayoutStore((state) => state.toggleHistory);
  const toggleCookies = useLayoutStore((state) => state.toggleCookies);
  const toggleEnvironments = useLayoutStore((state) => state.toggleEnvironments);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<SidebarMode>("collections");
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(() => new Set());
  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [draggedRequestId, setDraggedRequestId] = useState<string | null>(null);
  const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const canEditCollections = workspacePermissions.canEditCollections(
    activeWorkspace?.currentUserRole ?? null,
  );
  const activeRequestId =
    tabs.find((tab) => tab.id === activeTabId)?.requestId ??
    tabs.find((tab) => tab.id === activeTabId)?.draft.id ??
    null;

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

  const allFolderIds = useMemo(() => collectFolderIds(collections), [collections]);
  const allCollectionIds = useMemo(() => collectCollectionIds(collections), [collections]);

  useEffect(() => {
    const storageKey = getFolderStateStorageKey(activeWorkspaceId);
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        const savedIds = new Set(JSON.parse(saved) as string[]);
        setExpandedFolderIds(savedIds);
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    const defaultIds = new Set(allFolderIds);
    setExpandedFolderIds(defaultIds);
    saveExpandedFolderIds(activeWorkspaceId, defaultIds);
  }, [activeWorkspaceId, allFolderIds]);

  useEffect(() => {
    const storageKey = getCollectionStateStorageKey(activeWorkspaceId);
    const saved = window.localStorage.getItem(storageKey);

    if (saved) {
      try {
        const savedIds = new Set(JSON.parse(saved) as string[]);
        setExpandedCollectionIds(savedIds);
        return;
      } catch {
        window.localStorage.removeItem(storageKey);
      }
    }

    const defaultIds = new Set(allCollectionIds);
    setExpandedCollectionIds(defaultIds);
    saveExpandedCollectionIds(activeWorkspaceId, defaultIds);
  }, [activeWorkspaceId, allCollectionIds]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolderIds((current) => {
      const next = new Set(current);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      saveExpandedFolderIds(activeWorkspaceId, next);
      return next;
    });
  };

  const toggleCollection = (collectionId: string) => {
    setExpandedCollectionIds((current) => {
      const next = new Set(current);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      saveExpandedCollectionIds(activeWorkspaceId, next);
      return next;
    });
  };

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
    if (!activeWorkspaceId || !canEditCollections) {
      return;
    }

    openTextDialog({
      title: "New Collection",
      description: "Add a collection to organize saved requests.",
      label: "Collection name",
      initialValue: "New Collection",
      submitLabel: "Create Collection",
      onSubmit: async (name) => {
        await api.collections.createInWorkspace(activeWorkspaceId, { name });
        await fetchCollections();
      },
    });
  };

  const createRequest = async (collectionId: string, folderId: string | null) => {
    if (!canEditCollections) {
      return;
    }

    openTextDialog({
      title: "New Request",
      description: "Create a saved request directly in this collection or folder.",
      label: "Request name",
      initialValue: "New Request",
      submitLabel: "Create Request",
      onSubmit: async (name) => {
        const { folderNames, requestName } = parseRequestPath(name);
        const collection = collections.find((item) => item.id === collectionId);
        let targetFolderId = folderId;
        let currentFolders = folderId
          ? findFolderById(collection?.folders ?? [], folderId)?.folders ?? []
          : collection?.folders ?? [];

        for (const folderName of folderNames) {
          const existingFolder = currentFolders.find(
            (folder) => folder.name.trim().toLowerCase() === folderName.toLowerCase(),
          );

          if (existingFolder) {
            targetFolderId = existingFolder.id;
            currentFolders = existingFolder.folders;
            continue;
          }

          const createdFolder = await api.folders.create({
            collectionId,
            parentFolderId: targetFolderId,
            name: folderName,
          }) as FolderDefinition;
          targetFolderId = createdFolder.id;
          currentFolders = [];
        }

        const request = await api.requests.create({
          collectionId,
          folderId: targetFolderId,
          name: requestName,
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
    if (!canEditCollections) {
      return;
    }

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

  const deleteCollection = async (collection: CollectionTree) => {
    if (!canEditCollections) {
      return;
    }

    openConfirmDialog({
      title: "Delete collection",
      description: `Delete collection "${collection.name}" and everything inside it?`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        await api.collections.delete(collection.id);
        await fetchCollections();
      },
    });
  };

  const deleteFolder = async (folder: CollectionTreeFolder) => {
    if (!canEditCollections) {
      return;
    }

    openConfirmDialog({
      title: "Delete folder",
      description: `Delete folder "${folder.name}" and everything inside it?`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        await api.folders.delete(folder.id);
        await fetchCollections();
      },
    });
  };

  const deleteRequest = async (request: RequestDefinition) => {
    if (!canEditCollections) {
      return;
    }

    openConfirmDialog({
      title: "Delete request",
      description: `Delete request "${request.name}"?`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        await api.requests.delete(request.id);
        tabs
          .filter((tab) => tab.requestId === request.id)
          .forEach((tab) => {
            closeTab(tab.id);
          });
        await fetchCollections();
      },
    });
  };

  const duplicateRequest = async (request: RequestDefinition) => {
    if (!canEditCollections) {
      return;
    }

    const duplicatedRequest = await api.requests.duplicate(request.id);
    await fetchCollections();
    openRequestTab(duplicatedRequest);
  };

  const moveRequest = async (
    requestId: string,
    target: RequestMoveTarget,
    targetRequestId?: string,
    placement: RequestDropPlacement = "after",
  ) => {
    if (!canEditCollections) {
      return;
    }

    const draggedRequest = findRequestById(collections, requestId);
    if (!draggedRequest) {
      return;
    }

    const targetRequests = getTargetRequests(collections, target).filter(
      (request) => request.id !== requestId,
    );
    const targetIndex = targetRequestId
      ? targetRequests.findIndex((request) => request.id === targetRequestId)
      : targetRequests.length;
    const insertIndex =
      targetIndex === -1
        ? targetRequests.length
        : targetIndex + (placement === "after" ? 1 : 0);
    const nextRequests = [
      ...targetRequests.slice(0, insertIndex),
      draggedRequest,
      ...targetRequests.slice(insertIndex),
    ];

    await Promise.all(
      nextRequests.map((request, index) =>
        api.requests.update(request.id, {
          collectionId: target.collectionId,
          folderId: target.folderId,
          sortOrder: index * 100,
        }),
      ),
    );
    setDraggedRequestId(null);
    setDropIndicator(null);
    await fetchCollections();
  };

  const moveFolder = async (
    folderId: string,
    target: FolderMoveTarget,
    targetFolderId?: string,
    placement: RequestDropPlacement = "after",
  ) => {
    if (!canEditCollections) {
      return;
    }

    const draggedFolder = findFolderInCollections(collections, folderId);
    if (!draggedFolder) {
      return;
    }

    if (
      target.parentFolderId &&
      (target.parentFolderId === folderId ||
        isFolderDescendant(draggedFolder, target.parentFolderId))
    ) {
      setDraggedFolderId(null);
      setDropIndicator(null);
      return;
    }

    if (placement === "inside") {
      await api.folders.update(folderId, {
        collectionId: target.collectionId,
        parentFolderId: target.parentFolderId,
        sortOrder: getTargetFolders(collections, target).length * 100,
      });
      setDraggedFolderId(null);
      setDropIndicator(null);
      await fetchCollections();
      return;
    }

    const targetFolders = getTargetFolders(collections, target).filter(
      (folder) => folder.id !== folderId,
    );
    const targetIndex = targetFolderId
      ? targetFolders.findIndex((folder) => folder.id === targetFolderId)
      : targetFolders.length;
    const insertIndex =
      targetIndex === -1
        ? targetFolders.length
        : targetIndex + (placement === "after" ? 1 : 0);
    const nextFolders = [
      ...targetFolders.slice(0, insertIndex),
      draggedFolder,
      ...targetFolders.slice(insertIndex),
    ];

    await Promise.all(
      nextFolders.map((folder, index) =>
        api.folders.update(folder.id, {
          collectionId: target.collectionId,
          parentFolderId: target.parentFolderId,
          sortOrder: index * 100,
        }),
      ),
    );
    setDraggedFolderId(null);
    setDropIndicator(null);
    await fetchCollections();
  };

  const createEnvironment = async () => {
    if (!activeWorkspaceId || !workspacePermissions.canUpdateWorkspace(activeWorkspace?.currentUserRole ?? null)) {
      return;
    }

    openTextDialog({
      title: "New Environment",
      description: "Add a reusable set of variables for this workspace.",
      label: "Environment name",
      initialValue: "New Environment",
      submitLabel: "Create Environment",
      onSubmit: async (name) => {
        await api.environments.createInWorkspace(activeWorkspaceId, { name });
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
            <button
              aria-label="Create collection"
              className="icon-button icon-button--tiny"
              disabled={!canEditCollections}
              onClick={() => void createCollection()}
              title="Create collection"
              type="button"
            >
              <PlusIcon />
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

            <div className="sidebar-tree">
              {filteredCollections.map((collection: CollectionTree) => {
                const expanded = expandedCollectionIds.has(collection.id);

                return (
                  <div className="sidebar-tree__collection" key={collection.id}>
                    <div className="sidebar-tree__collection-header">
                      <button
                        aria-label={expanded ? "Collapse collection" : "Expand collection"}
                        className="icon-button icon-button--tiny sidebar-tree__toggle"
                        onClick={() => toggleCollection(collection.id)}
                        title={expanded ? "Collapse collection" : "Expand collection"}
                        type="button"
                      >
                        {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                      </button>
                      <div className="sidebar-tree__collection-title-wrap">
                        <CollectionIcon className="sidebar-tree__item-icon" />
                        <span className="sidebar-tree__collection-title">{collection.name}</span>
                      </div>
                      <div className="sidebar-tree__header-actions">
                        <button
                          aria-label="Add request"
                          className="icon-button icon-button--tiny sidebar-tree__action"
                          disabled={!canEditCollections}
                          onClick={() => void createRequest(collection.id, null)}
                          title="Add request"
                          type="button"
                        >
                          <RequestIcon />
                        </button>
                        <button
                          aria-label="Create folder"
                          className="icon-button icon-button--tiny sidebar-tree__action"
                          disabled={!canEditCollections}
                          onClick={() => void createFolder(collection.id, null)}
                          title="Create folder"
                          type="button"
                        >
                          <FolderIcon />
                        </button>
                        <button
                          aria-label="Delete collection"
                          className="icon-button icon-button--tiny sidebar-tree__action sidebar-tree__delete-action"
                          disabled={!canEditCollections}
                          onClick={() => void deleteCollection(collection)}
                          title="Delete collection"
                          type="button"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div
                        className={`sidebar-tree__collection-body ${
                          draggedRequestId || draggedFolderId ? "is-drop-target" : ""
                        }`}
                        onDragOver={(event) => {
                          if (!canEditCollections || (!draggedRequestId && !draggedFolderId)) {
                            return;
                          }
                          event.preventDefault();
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          const requestId = event.dataTransfer.getData("application/x-request-id");
                          const folderId = event.dataTransfer.getData("application/x-folder-id");
                          setDropIndicator(null);

                          if (!canEditCollections) {
                            return;
                          }

                          if (requestId) {
                            void moveRequest(requestId, {
                              collectionId: collection.id,
                              folderId: null,
                            });
                            return;
                          }

                          if (folderId) {
                            void moveFolder(folderId, {
                              collectionId: collection.id,
                              parentFolderId: null,
                            });
                          }
                        }}
                      >
                        {collection.requests.map((request) => (
                          <div
                            className={`sidebar-tree__request-row ${
                              request.id === activeRequestId ? "is-active" : ""
                            } ${request.id === draggedRequestId ? "is-dragging" : ""} ${
                              dropIndicator?.itemType === "request" && dropIndicator.itemId === request.id
                                ? `is-drop-${dropIndicator.placement}`
                                : ""
                            }`}
                            draggable={canEditCollections}
                            key={request.id}
                            onDragStart={(event) => {
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("application/x-request-id", request.id);
                              event.dataTransfer.setData("text/plain", request.id);
                              setDraggedRequestId(request.id);
                            }}
                            onDragEnd={() => setDraggedRequestId(null)}
                            onDragOver={(event) => {
                              if (!canEditCollections || !draggedRequestId || draggedRequestId === request.id) {
                                return;
                              }
                              event.preventDefault();
                              setDropIndicator({
                                itemType: "request",
                                itemId: request.id,
                                placement: getRequestDropPlacement(event),
                              });
                            }}
                            onDragLeave={() => {
                              if (dropIndicator?.itemType === "request" && dropIndicator.itemId === request.id) {
                                setDropIndicator(null);
                              }
                            }}
                            onDrop={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              const requestId = event.dataTransfer.getData("application/x-request-id");
                              setDropIndicator(null);
                              if (!requestId || !canEditCollections || requestId === request.id) {
                                return;
                              }
                              void moveRequest(
                                requestId,
                                { collectionId: collection.id, folderId: null },
                                request.id,
                                getRequestDropPlacement(event),
                              );
                            }}
                          >
                            <button
                              className="sidebar-tree__request"
                              onClick={() => openRequestTab(request)}
                              type="button"
                            >
                              <RequestIcon className="sidebar-tree__item-icon" />
                              <span className={`badge method-${request.method}`}>
                                {request.method}
                              </span>
                              <span className="sidebar-tree__request-name">{request.name}</span>
                            </button>
                            <button
                              aria-label="Duplicate request"
                              className="icon-button icon-button--tiny sidebar-tree__action"
                              disabled={!canEditCollections}
                              onClick={() => void duplicateRequest(request)}
                              title="Duplicate request"
                              type="button"
                            >
                              <CopyIcon />
                            </button>
                            <button
                              aria-label="Delete request"
                              className="icon-button icon-button--tiny sidebar-tree__action sidebar-tree__delete-action"
                              disabled={!canEditCollections}
                              onClick={() => void deleteRequest(request)}
                              title="Delete request"
                              type="button"
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        ))}

                        {collection.folders.map((folder) => (
                          <SidebarFolderNode
                            key={folder.id}
                            folder={folder}
                            expandedFolderIds={expandedFolderIds}
                            onOpenRequest={openRequestTab}
                            onToggleFolder={toggleFolder}
                            onCreateRequest={createRequest}
                            onCreateFolder={createFolder}
                            onDeleteFolder={deleteFolder}
                            onDeleteRequest={deleteRequest}
                            onDuplicateRequest={duplicateRequest}
                            onMoveRequest={moveRequest}
                            onMoveFolder={moveFolder}
                            onRequestDragStart={setDraggedRequestId}
                            onFolderDragStart={setDraggedFolderId}
                            onRequestDragEnd={() => setDraggedRequestId(null)}
                            onFolderDragEnd={() => setDraggedFolderId(null)}
                            activeRequestId={activeRequestId}
                            canEditCollections={canEditCollections}
                            draggedRequestId={draggedRequestId}
                            draggedFolderId={draggedFolderId}
                            dropIndicator={dropIndicator}
                            onDropIndicatorChange={setDropIndicator}
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                );
              })}
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
