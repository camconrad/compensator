import { useNetworkStore } from "./useNetwork";

export const useSelectedNetwork = () => useNetworkStore((state) => state.network);

export const useSelectedNetworkActions = () => useNetworkStore((state) => state.actions);
