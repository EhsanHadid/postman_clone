import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  WorkspaceDefinition,
  WorkspaceMemberDefinition,
  WorkspaceRole,
} from "@postman-clone/shared-types";
import { api } from "../services/api";

interface WorkspaceState {
  workspaces: WorkspaceDefinition[];
  activeWorkspaceId: string | null;
  members: WorkspaceMemberDefinition[];
  fetchWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string, description?: string) => Promise<void>;
  updateWorkspace: (payload: { name?: string; description?: string }) => Promise<void>;
  deleteWorkspace: () => Promise<void>;
  fetchMembers: () => Promise<void>;
  addMember: (userId: string, role: Exclude<WorkspaceRole, "OWNER">) => Promise<void>;
  updateMember: (userId: string, role: Exclude<WorkspaceRole, "OWNER">) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspaceId: null,
      members: [],
      fetchWorkspaces: async () => {
        const workspaces = await api.workspaces.list();
        set((state) => ({
          workspaces,
          activeWorkspaceId: workspaces.some((workspace) => workspace.id === state.activeWorkspaceId)
            ? state.activeWorkspaceId
            : null,
        }));
      },
      setActiveWorkspace: (workspaceId) => set({ activeWorkspaceId: workspaceId, members: [] }),
      createWorkspace: async (name, description) => {
        const workspace = await api.workspaces.create({ name, description });
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
          activeWorkspaceId: workspace.id,
          members: [],
        }));
      },
      updateWorkspace: async (payload) => {
        const workspaceId = get().activeWorkspaceId;
        if (!workspaceId) {
          return;
        }

        const workspace = await api.workspaces.update(workspaceId, payload);
        set((state) => ({
          workspaces: state.workspaces.map((item) =>
            item.id === workspace.id ? workspace : item,
          ),
        }));
      },
      deleteWorkspace: async () => {
        const workspaceId = get().activeWorkspaceId;
        if (!workspaceId) {
          return;
        }

        await api.workspaces.delete(workspaceId);
        set((state) => {
          const workspaces = state.workspaces.filter((workspace) => workspace.id !== workspaceId);
          return {
            workspaces,
            activeWorkspaceId: null,
            members: [],
          };
        });
      },
      fetchMembers: async () => {
        const workspaceId = get().activeWorkspaceId;
        if (!workspaceId) {
          set({ members: [] });
          return;
        }

        set({ members: await api.workspaces.members(workspaceId) });
      },
      addMember: async (userId, role) => {
        const workspaceId = get().activeWorkspaceId;
        if (!workspaceId) {
          return;
        }
        await api.workspaces.addMember(workspaceId, { userId, role });
        await get().fetchMembers();
      },
      updateMember: async (userId, role) => {
        const workspaceId = get().activeWorkspaceId;
        if (!workspaceId) {
          return;
        }
        await api.workspaces.updateMember(workspaceId, userId, { role });
        await get().fetchMembers();
      },
      removeMember: async (userId) => {
        const workspaceId = get().activeWorkspaceId;
        if (!workspaceId) {
          return;
        }
        await api.workspaces.removeMember(workspaceId, userId);
        await get().fetchMembers();
      },
    }),
    {
      name: "postman-clone-workspace",
      partialize: (state) => ({ activeWorkspaceId: state.activeWorkspaceId }),
    },
  ),
);

export function getActiveWorkspaceRole(): WorkspaceRole | null {
  const state = useWorkspaceStore.getState();
  return state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId)
    ?.currentUserRole ?? null;
}

export const workspacePermissions = {
  canEditCollections: (role: WorkspaceRole | null) =>
    role === "OWNER" || role === "ADMIN" || role === "CONTRIBUTOR",
  canManageMembers: (role: WorkspaceRole | null) => role === "OWNER" || role === "ADMIN",
  canManageAdmins: (role: WorkspaceRole | null) => role === "OWNER",
  canDeleteWorkspace: (role: WorkspaceRole | null) => role === "OWNER",
  canUpdateWorkspace: (role: WorkspaceRole | null) => role === "OWNER" || role === "ADMIN",
};
