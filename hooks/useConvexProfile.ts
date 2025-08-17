import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";

export function useProfile(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;
  
  const profile = useQuery(
    api.profiles.getProfile,
    targetAddress ? { address: targetAddress } : "skip"
  );
  
  const createProfile = useMutation(api.profiles.createProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const updateBlockchainData = useMutation(api.profiles.updateBlockchainData);
  
  return {
    profile,
    createProfile,
    updateProfile,
    updateBlockchainData,
    isLoading: profile === undefined,
    isConnected: !!targetAddress,
  };
}

export function useProfileSearch() {
  const searchProfiles = useQuery(api.profiles.searchProfiles);
  const getTopDelegates = useQuery(api.profiles.getTopDelegates);
  
  return {
    searchProfiles,
    getTopDelegates,
  };
}

export function useProfileActions() {
  const createProfile = useMutation(api.profiles.createProfile);
  const updateProfile = useMutation(api.profiles.updateProfile);
  const updateBlockchainData = useMutation(api.profiles.updateBlockchainData);
  
  return {
    createProfile,
    updateProfile,
    updateBlockchainData,
  };
}
