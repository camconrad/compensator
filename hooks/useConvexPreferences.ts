import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";

export function useUserPreferences(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;
  
  const preferences = useQuery(
    api.preferences.getUserPreferences,
    targetAddress ? { address: targetAddress } : "skip"
  );
  
  return {
    preferences,
    isLoading: preferences === undefined,
    isConnected: !!targetAddress,
  };
}

export function usePreferencesActions() {
  const upsertUserPreferences = useMutation(api.preferences.upsertUserPreferences);
  const updateTheme = useMutation(api.preferences.updateTheme);
  const updateNotificationPreferences = useMutation(api.preferences.updateNotificationPreferences);
  const updateDisplaySettings = useMutation(api.preferences.updateDisplaySettings);
  
  return {
    upsertUserPreferences,
    updateTheme,
    updateNotificationPreferences,
    updateDisplaySettings,
  };
}

export function useDefaultPreferences() {
  const defaultPreferences = useQuery(api.preferences.getDefaultPreferences);
  
  return {
    defaultPreferences,
    isLoading: defaultPreferences === undefined,
  };
}
