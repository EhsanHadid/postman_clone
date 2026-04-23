import { useEffect } from "react";
import { AppShell } from "../layouts/AppShell";
import { useCollectionsStore } from "../store/collectionsStore";
import { useCookiesStore } from "../store/cookiesStore";
import { useEnvironmentsStore } from "../store/environmentsStore";
import { useHistoryStore } from "../store/historyStore";

export function WorkspacePage() {
  const fetchCollections = useCollectionsStore((state) => state.fetchCollections);
  const fetchEnvironments = useEnvironmentsStore((state) => state.fetchEnvironments);
  const fetchHistory = useHistoryStore((state) => state.fetchHistory);
  const fetchCookies = useCookiesStore((state) => state.fetchCookies);

  useEffect(() => {
    void Promise.all([
      fetchCollections(),
      fetchEnvironments(),
      fetchHistory(),
      fetchCookies(),
    ]);
  }, [fetchCollections, fetchCookies, fetchEnvironments, fetchHistory]);

  return <AppShell />;
}
