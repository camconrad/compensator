import { useAuthStore } from "./useAuthStore";

export const useSelectedAddress = () => useAuthStore((state) => state.address);

export const useSelectedAccessToken = () => useAuthStore((state) => state.accessToken);

export const useSelectedAuthActions = () => useAuthStore((state) => state.actions);
