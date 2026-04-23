import { useRef } from "react";
import { api, downloadJson } from "../../services/api";
import { useCollectionsStore } from "../../store/collectionsStore";
import { useCookiesStore } from "../../store/cookiesStore";
import { useEnvironmentsStore } from "../../store/environmentsStore";
import { useHistoryStore } from "../../store/historyStore";

async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}

export function ImportExportControls() {
  const postmanInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const fetchCookies = useCookiesStore((state) => state.fetchCookies);

  const refreshAll = async () => {
    await Promise.all([
      fetchCollections(),
      fetchEnvironments(),
      fetchHistory(),
      fetchCookies(),
    ]);
  };

  const importPostman = async (file?: File | null) => {
    if (!file) {
      return;
    }

    const payload = await readJsonFile(file);
    await api.importPostman({ payload });
    await refreshAll();
  };

  const exportBackup = async () => {
    const payload = await api.exportBackup();
    downloadJson(`postman-clone-backup-${Date.now()}.json`, payload);
  };

  const restoreBackup = async (file?: File | null) => {
    if (!file) {
      return;
    }

    const payload = await readJsonFile(file);
    await api.restoreBackup({ payload, mode: "replace" });
    await refreshAll();
  };

  return (
    <div className="topbar__actions">
      <button className="button button-subtle" onClick={() => postmanInputRef.current?.click()} type="button">
        Import Postman
      </button>
      <button className="button button-subtle" onClick={exportBackup} type="button">
        Export Backup
      </button>
      <button className="button button-subtle" onClick={() => backupInputRef.current?.click()} type="button">
        Restore Backup
      </button>

      <input
        hidden
        accept="application/json"
        ref={postmanInputRef}
        type="file"
        onChange={(event) => void importPostman(event.target.files?.[0])}
      />
      <input
        hidden
        accept="application/json"
        ref={backupInputRef}
        type="file"
        onChange={(event) => void restoreBackup(event.target.files?.[0])}
      />
    </div>
  );
}
