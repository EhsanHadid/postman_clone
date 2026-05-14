import { useRef, useState } from "react";
import { CloseIcon, DownloadIcon, RestoreIcon, UploadIcon } from "../../components/AppIcons";
import { api, downloadJson } from "../../services/api";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useCookiesStore } from "../../store/cookiesStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useHistoryStore } from "../../store/historyStore";
import { useWorkspaceStore } from "../../store/workspaceStore";

interface ImportExportControlsProps {
  variant?: "menu" | "toolbar";
}

type ImportKind = "backup" | "postman" | "insomnia" | "hoppscotch";
type ImportConflictStrategy = "add" | "mergeOverride";

interface ImportConflict {
  kind: Exclude<ImportKind, "backup">;
  payload: unknown;
  collectionName: string;
}

const importOptions: Array<{
  kind: ImportKind;
  title: string;
  description: string;
}> = [
  {
    kind: "backup",
    title: "From Backup",
    description: "Restore a Postman Clone backup into the active workspace.",
  },
  {
    kind: "postman",
    title: "Postman",
    description: "Import a Postman collection or environment JSON export.",
  },
  {
    kind: "insomnia",
    title: "Insomnia",
    description: "Import an Insomnia JSON export with workspaces, folders, and requests.",
  },
  {
    kind: "hoppscotch",
    title: "Hoppscotch",
    description: "Import a Hoppscotch collection JSON export.",
  },
];

async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}

function parseImportConflict(error: unknown): { collectionName: string } | null {
  if (!(error instanceof Error)) {
    return null;
  }

  try {
    const payload = JSON.parse(error.message) as {
      code?: string;
      collectionName?: string;
      message?: string;
      statusCode?: number;
    };

    if (payload.code === "COLLECTION_NAME_CONFLICT" && payload.collectionName) {
      return { collectionName: payload.collectionName };
    }
  } catch {
    return null;
  }

  return null;
}

export function ImportExportControls({
  variant = "toolbar",
}: ImportExportControlsProps) {
  const inputRefs = {
    backup: useRef<HTMLInputElement | null>(null),
    postman: useRef<HTMLInputElement | null>(null),
    insomnia: useRef<HTMLInputElement | null>(null),
    hoppscotch: useRef<HTMLInputElement | null>(null),
  };
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loadingKind, setLoadingKind] = useState<ImportKind | null>(null);
  const [importConflict, setImportConflict] = useState<ImportConflict | null>(null);
  const [error, setError] = useState("");
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const fetchCookies = useCookiesStore((state) => state.fetchCookies);
  const activeWorkspaceId = useWorkspaceStore((state) => state.activeWorkspaceId);

  const refreshAll = async () => {
    await Promise.all([
      fetchCollections(),
      fetchEnvironments(),
      fetchHistory(),
      fetchCookies(),
    ]);
  };

  const runImport = async (
    kind: ImportKind,
    payload: unknown,
    conflictStrategy?: ImportConflictStrategy,
  ) => {
    if (!activeWorkspaceId) {
      return;
    }

    setLoadingKind(kind);
    setError("");
    setImportConflict(null);
    try {
      if (kind === "backup") {
        await api.restoreBackup({ payload, mode: "replace", workspaceId: activeWorkspaceId });
      }

      if (kind === "postman") {
        await api.importPostman({ payload, workspaceId: activeWorkspaceId, conflictStrategy });
      }

      if (kind === "insomnia") {
        await api.importInsomnia({ payload, workspaceId: activeWorkspaceId, conflictStrategy });
      }

      if (kind === "hoppscotch") {
        await api.importHoppscotch({ payload, workspaceId: activeWorkspaceId, conflictStrategy });
      }

      await refreshAll();
      setDialogOpen(false);
    } catch (importError) {
      const conflict = kind === "backup" ? null : parseImportConflict(importError);
      if (conflict) {
        setImportConflict({
          kind: kind as Exclude<ImportKind, "backup">,
          payload,
          collectionName: conflict.collectionName,
        });
      } else {
        setError((importError as Error).message);
      }
    } finally {
      setLoadingKind(null);
    }
  };

  const importFile = async (kind: ImportKind, file?: File | null) => {
    if (!file || !activeWorkspaceId) {
      return;
    }

    try {
      const payload = await readJsonFile(file);
      await runImport(kind, payload);
    } finally {
      const input = inputRefs[kind].current;
      if (input) {
        input.value = "";
      }
    }
  };

  const exportBackup = async () => {
    const payload = await api.exportBackup(activeWorkspaceId);
    downloadJson(`postman-clone-backup-${Date.now()}.json`, payload);
  };

  return (
    <>
      <div className={variant === "menu" ? "menu-actions" : "chrome-actions"}>
        <button
          className={variant === "menu" ? "menu-action" : "icon-button"}
          onClick={() => setDialogOpen(true)}
          title="Import"
          type="button"
        >
          <UploadIcon />
          <span>Import</span>
        </button>
        <button
          className={variant === "menu" ? "menu-action" : "icon-button"}
          onClick={exportBackup}
          title="Export backup"
          type="button"
        >
          <DownloadIcon />
          <span>Export backup</span>
        </button>
      </div>

      {dialogOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-modal="true"
            className="dialog dialog--large card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <header className="dialog__header">
              <div className="dialog__title-wrap">
                <h3>Import</h3>
                <div className="dialog__description">
                  Choose a source to import into the active workspace.
                </div>
              </div>
              <button
                aria-label="Close import dialog"
                className="icon-button"
                disabled={Boolean(loadingKind)}
                onClick={() => setDialogOpen(false)}
                type="button"
              >
                <CloseIcon />
              </button>
            </header>

            <div className="dialog__content">
              {importConflict ? (
                <div className="import-conflict">
                  <strong>Collection already exists</strong>
                  <p>
                    A collection named "{importConflict.collectionName}" already exists in this
                    workspace. Choose how to continue.
                  </p>
                  <div className="import-conflict__actions">
                    <button
                      className="button"
                      disabled={Boolean(loadingKind)}
                      onClick={() => void runImport(importConflict.kind, importConflict.payload, "add")}
                      type="button"
                    >
                      Add
                    </button>
                    <button
                      className="button button-danger"
                      disabled={Boolean(loadingKind)}
                      onClick={() =>
                        void runImport(importConflict.kind, importConflict.payload, "mergeOverride")
                      }
                      type="button"
                    >
                      Merge & Override
                    </button>
                  </div>
                </div>
              ) : (
                <div className="import-grid">
                  {importOptions.map((option) => (
                    <button
                      className="import-card"
                      disabled={Boolean(loadingKind) || !activeWorkspaceId}
                      key={option.kind}
                      onClick={() => inputRefs[option.kind].current?.click()}
                      type="button"
                    >
                      <div className="import-card__icon">
                        {option.kind === "backup" ? <RestoreIcon /> : <UploadIcon />}
                      </div>
                      <div>
                        <strong>{option.title}</strong>
                        <p>{option.description}</p>
                      </div>
                      {loadingKind === option.kind ? (
                        <span className="import-card__loading">Importing...</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}

              {error ? <div className="dialog__error">{error}</div> : null}
              {!activeWorkspaceId ? (
                <div className="dialog__error">Choose a workspace before importing.</div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {importOptions.map((option) => (
        <input
          accept="application/json,.json"
          hidden
          key={option.kind}
          ref={inputRefs[option.kind]}
          type="file"
          onChange={(event) => void importFile(option.kind, event.target.files?.[0])}
        />
      ))}
    </>
  );
}
