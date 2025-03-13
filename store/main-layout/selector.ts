import { useMainLayoutStore } from "./useMainLayoutStore";

export const useMainLayoutActions = () => useMainLayoutStore((state) => state.actions);

export const useMainLayoutRecentSearchAgentIds = () =>
  useMainLayoutStore((state) => state.recentSearchAgentIds);
