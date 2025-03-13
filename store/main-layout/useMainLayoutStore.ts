import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface IMainLayoutStore {
  recentSearchAgentIds: string[];
}

export interface IAuthAction {
  addRecentAgentSearch: (user: string) => void;
}

const initialState: IMainLayoutStore = {
  recentSearchAgentIds: [],
};

export const useMainLayoutStore = create<IMainLayoutStore & { actions: IAuthAction }>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        addRecentAgentSearch: (agentId: string) =>
          set((state) => ({
            recentSearchAgentIds: [agentId, ...state?.recentSearchAgentIds?.slice(0, 2)],
          })),
      },
    }),
    {
      name: "bs-main-layout",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ recentSearchAgentIds }) => ({
        recentSearchAgentIds,
      }),
    }
  )
);
