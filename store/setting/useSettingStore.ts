import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ISettingStore {
  isHydrated: boolean;
  theme: "dark" | "light";
}

export interface IAuthAction {
  hydrate: () => void;
  updateTheme: (user: ISettingStore["theme"]) => void;
}

const initialState: ISettingStore = {
  isHydrated: false,
  theme: "light",
};

export const useSettingStore = create<ISettingStore & { actions: IAuthAction }>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        hydrate: () =>
          set(() => ({
            isHydrated: true,
          })),
        updateTheme: (theme: ISettingStore["theme"]) =>
          set(() => ({
            theme: theme,
          })),
      },
    }),
    {
      name: "bs-setting",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ theme }) => ({
        theme,
      }),
      onRehydrateStorage: (state) => () => {
        state.actions.hydrate();
      },
    }
  )
);
