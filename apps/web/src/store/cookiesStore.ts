import { create } from "zustand";
import type { CookieDefinition } from "@postman-clone/shared-types";
import { api } from "../services/api";

interface CookiesState {
  cookies: CookieDefinition[];
  fetchCookies: () => Promise<void>;
}

export const useCookiesStore = create<CookiesState>((set) => ({
  cookies: [],
  fetchCookies: async () => {
    const cookies = await api.cookies.list();
    set({ cookies });
  },
}));
