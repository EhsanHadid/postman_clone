import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EnvironmentDefinition } from "@postman-clone/shared-types";
import { api } from "../services/api";

interface EnvironmentsState {
  environments: EnvironmentDefinition[];
  activeEnvironmentId: string | null;
  fetchEnvironments: () => Promise<void>;
  setActiveEnvironment: (id: string | null) => void;
}

export const useEnvironmentsStore = create<EnvironmentsState>()(
  persist(
    (set) => ({
      environments: [],
      activeEnvironmentId: null,
      fetchEnvironments: async () => {
        const environments = await api.environments.list();
        const globalEnvironment = environments.find((environment) => environment.isGlobal);
        set((state) => ({
          environments,
          activeEnvironmentId: environments.some(
            (environment) => environment.id === state.activeEnvironmentId,
          )
            ? state.activeEnvironmentId
            : globalEnvironment?.id ?? environments[0]?.id ?? null,
        }));
      },
      setActiveEnvironment: (id) => set({ activeEnvironmentId: id }),
    }),
    {
      name: "postman-clone-environments",
      partialize: (state) => ({ activeEnvironmentId: state.activeEnvironmentId }),
    },
  ),
);
