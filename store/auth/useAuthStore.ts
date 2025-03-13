import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface IAuthStore {
  address: string;
  accessToken: string;
}

export interface IAuthAction {
  setAddress: (address: string) => void;
  setAccessToken: (accessToken: string) => void;
}

const initialState: IAuthStore = {
  address: "",
  accessToken: "",
};

export const useAuthStore = create<IAuthStore & { actions: IAuthAction }>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        setAddress: (address: IAuthStore["address"]) => set({ address }),
        setAccessToken: (accessToken: IAuthStore["accessToken"]) => set({ accessToken }),
      },
    }),
    {
      name: "auth",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ address, accessToken }) => ({
        address,
        accessToken,
      }),
    }
  )
);
