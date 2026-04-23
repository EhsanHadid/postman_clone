import { create } from "zustand";
import { persist } from "zustand/middleware";

interface LayoutState {
  sidebarSize: number;
  requestPaneSize: number;
  showHistory: boolean;
  showCookies: boolean;
  showEnvironments: boolean;
  setSidebarSize: (value: number) => void;
  setRequestPaneSize: (value: number) => void;
  toggleHistory: () => void;
  toggleCookies: () => void;
  toggleEnvironments: () => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      sidebarSize: 22,
      requestPaneSize: 50,
      showHistory: false,
      showCookies: false,
      showEnvironments: false,
      setSidebarSize: (sidebarSize) => set({ sidebarSize }),
      setRequestPaneSize: (requestPaneSize) => set({ requestPaneSize }),
      toggleHistory: () => set((state) => ({ showHistory: !state.showHistory })),
      toggleCookies: () => set((state) => ({ showCookies: !state.showCookies })),
      toggleEnvironments: () =>
        set((state) => ({ showEnvironments: !state.showEnvironments })),
    }),
    {
      name: "postman-clone-layout",
    },
  ),
);
