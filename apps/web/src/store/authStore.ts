import { create } from "zustand";
import { api } from "../services/api";
import type { UserProfile } from "@postman-clone/shared-types";

interface AuthState {
  user: UserProfile | null;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (payload: { username: string; password: string }) => Promise<void>;
  register: (payload: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  initialized: false,
  loading: false,
  error: null,
  bootstrap: async () => {
    try {
      const result = await api.auth.me();
      set({ user: result.user, initialized: true, error: null });
    } catch {
      set({ user: null, initialized: true });
    }
  },
  login: async (payload) => {
    set({ loading: true, error: null });
    try {
      const result = await api.auth.login(payload);
      set({ user: result.user, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },
  register: async (payload) => {
    set({ loading: true, error: null });
    try {
      const result = await api.auth.register(payload);
      set({ user: result.user, loading: false });
    } catch (error) {
      set({ loading: false, error: (error as Error).message });
      throw error;
    }
  },
  logout: async () => {
    await api.auth.logout();
    set({ user: null });
  },
}));
