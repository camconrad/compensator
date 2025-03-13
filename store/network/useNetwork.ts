import { arbitrum, base, mainnet } from "viem/chains";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const networks = [
    { name: "Ethereum", icon: "/ethereum.svg", network: mainnet, value: "mainnet" },
  ];

export interface INetworkStore {
  network: string;
}

export interface IAuthAction {
  setNetwork: (network: INetworkStore["network"]) => void;
}

const initialState: INetworkStore = {
  network: networks[0].value,
};

export const useNetworkStore = create<INetworkStore & { actions: IAuthAction }>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        setNetwork: (network: INetworkStore["network"]) => set({ network }),
      },
    }),
    {
      name: "network",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ network }) => ({
        network,
      }),
    }
  )
);
