import { useMemo, useState } from "react";
import type { CollectionTree, CollectionTreeFolder, RequestDefinition } from "@postman-clone/shared-types";
import { api } from "../../services/api";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useTabsStore } from "../../store/tabsStore";

interface SidebarTreeNodeProps {
  folder: CollectionTreeFolder;
  onOpenRequest: (request: RequestDefinition) => void;
  onCreateRequest: (collectionId: string, folderId: string | null) => Promise<void>;
}

function SidebarFolderNode({ folder, onOpenRequest, onCreateRequest }: SidebarTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="sidebar-tree__branch">
      <button
        className="sidebar-tree__folder"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span>{expanded ? "▾" : "▸"}</span>
        <span>{folder.name}</span>
        <span className="sidebar-tree__actions">
          <span
            onClick={(event) => {
              event.stopPropagation();
              void onCreateRequest(folder.collectionId, folder.id);
            }}
            role="presentation"
          >
            ＋
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
            />
          ))}
          {folder.requests.map((request) => (
            <button
              className="sidebar-tree__request"
              key={request.id}
              onClick={() => onOpenRequest(request)}
              type="button"
            >
              <span className={`badge method-${request.method}`}>{request.method}</span>
              <span>{request.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function CollectionsSidebar() {
  const collections = useCollectionsStore((state) => state.collections);
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const openRequestTab = useTabsStore((state) => state.openRequestTab);
  const createRequestTab = useTabsStore((state) => state.createRequestTab);
  const [search, setSearch] = useState("");

  const filteredCollections = useMemo(() => {
    if (!search.trim()) {
      return collections;
    }

    const query = search.toLowerCase();
    return collections
      .map((collection) => ({
        ...collection,
        folders: collection.folders.filter((folder) =>
          folder.name.toLowerCase().includes(query),
        ),
        requests: collection.requests.filter((request) =>
          request.name.toLowerCase().includes(query),
        ),
      }))
      .filter(
        (collection) =>
          collection.name.toLowerCase().includes(query) ||
          collection.folders.length > 0 ||
          collection.requests.length > 0,
      );
  }, [collections, search]);

  const createCollection = async () => {
    const name = window.prompt("Collection name");
    if (!name) {
      return;
    }

    await api.collections.create({ name });
    await fetchCollections();
  };

  const createRequest = async (collectionId: string, folderId: string | null) => {
    const name = window.prompt("Request name", "New Request");
    if (!name) {
      return;
    }

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
  };

  const createFolder = async () => {
    const collectionId = window.prompt("Collection ID for new folder");
    const name = window.prompt("Folder name");

    if (!collectionId || !name) {
      return;
    }

    await api.folders.create({ collectionId, name });
    await fetchCollections();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div>
          <div className="sidebar__eyebrow">Workspace</div>
          <h2>Collections</h2>
        </div>
        <div className="sidebar__toolbar">
          <button className="button button-subtle" onClick={createCollection} type="button">
            + Collection
          </button>
          <button className="button button-subtle" onClick={createFolder} type="button">
            + Folder
          </button>
        </div>
      </div>

      <input
        className="input"
        placeholder="Search requests"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      <button className="button button-primary sidebar__new-tab" onClick={() => createRequestTab()} type="button">
        New Scratch Tab
      </button>

      <div className="sidebar-tree">
        {filteredCollections.map((collection: CollectionTree) => (
          <div className="sidebar-tree__collection" key={collection.id}>
            <div className="sidebar-tree__collection-header">
              <span>{collection.name}</span>
              <button
                className="button button-subtle"
                onClick={() => void createRequest(collection.id, null)}
                type="button"
              >
                + Request
              </button>
            </div>

            {collection.requests.map((request) => (
              <button
                className="sidebar-tree__request"
                key={request.id}
                onClick={() => openRequestTab(request)}
                type="button"
              >
                <span className={`badge method-${request.method}`}>{request.method}</span>
                <span>{request.name}</span>
              </button>
            ))}

            {collection.folders.map((folder) => (
              <SidebarFolderNode
                key={folder.id}
                folder={folder}
                onOpenRequest={openRequestTab}
                onCreateRequest={createRequest}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}
