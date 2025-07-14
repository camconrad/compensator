import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { compensatorService, CompensatorInstance, CompensatorStats } from '@/services/compensator';

export interface UseCompensatorServiceReturn {
  // User's compensator instance
  userCompensatorAddress: string | null;
  userCompensatorInstance: CompensatorInstance | null;
  userVotingPower: string;
  userPendingRewards: string;
  hasCompensator: boolean;
  
  // All compensators
  allCompensators: CompensatorInstance[];
  compensatorStats: CompensatorStats | null;
  
  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  
  // Actions
  createCompensator: (delegateName: string) => Promise<string>;
  refreshUserData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

export const useCompensatorService = (): UseCompensatorServiceReturn => {
  const { address } = useAccount();
  
  // State
  const [userCompensatorAddress, setUserCompensatorAddress] = useState<string | null>(null);
  const [userCompensatorInstance, setUserCompensatorInstance] = useState<CompensatorInstance | null>(null);
  const [userVotingPower, setUserVotingPower] = useState<string>("0");
  const [userPendingRewards, setUserPendingRewards] = useState<string>("0");
  const [hasCompensator, setHasCompensator] = useState<boolean>(false);
  
  const [allCompensators, setAllCompensators] = useState<CompensatorInstance[]>([]);
  const [compensatorStats, setCompensatorStats] = useState<CompensatorStats | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Get user's compensator address
  const fetchUserCompensatorAddress = useCallback(async () => {
    if (!address) {
      setUserCompensatorAddress(null);
      setHasCompensator(false);
      return;
    }

    try {
      const compensatorAddress = await compensatorService.getCompensatorAddress(address);
      setUserCompensatorAddress(compensatorAddress);
      setHasCompensator(compensatorAddress !== null);
    } catch (error) {
      console.error("Error fetching user compensator address:", error);
      setUserCompensatorAddress(null);
      setHasCompensator(false);
    }
  }, [address]);

  // Get user's compensator instance details
  const fetchUserCompensatorInstance = useCallback(async () => {
    if (!userCompensatorAddress) {
      setUserCompensatorInstance(null);
      return;
    }

    try {
      const instance = await compensatorService.getCompensatorInstance(userCompensatorAddress);
      setUserCompensatorInstance(instance);
    } catch (error) {
      console.error("Error fetching user compensator instance:", error);
      setUserCompensatorInstance(null);
    }
  }, [userCompensatorAddress]);

  // Get user's voting power
  const fetchUserVotingPower = useCallback(async () => {
    if (!address) {
      setUserVotingPower("0");
      return;
    }

    try {
      const votingPower = await compensatorService.getUserVotingPower(address);
      setUserVotingPower(votingPower);
    } catch (error) {
      console.error("Error fetching user voting power:", error);
      setUserVotingPower("0");
    }
  }, [address]);

  // Get user's pending rewards
  const fetchUserPendingRewards = useCallback(async () => {
    if (!address) {
      setUserPendingRewards("0");
      return;
    }

    try {
      const rewards = await compensatorService.getUserPendingRewards(address);
      setUserPendingRewards(rewards);
    } catch (error) {
      console.error("Error fetching user pending rewards:", error);
      setUserPendingRewards("0");
    }
  }, [address]);

  // Get all compensators
  const fetchAllCompensators = useCallback(async () => {
    try {
      const instances = await compensatorService.getAllCompensators();
      setAllCompensators(instances);
    } catch (error) {
      console.error("Error fetching all compensators:", error);
      setAllCompensators([]);
    }
  }, []);

  // Get compensator stats
  const fetchCompensatorStats = useCallback(async () => {
    try {
      const stats = await compensatorService.getCompensatorStats();
      setCompensatorStats(stats);
    } catch (error) {
      console.error("Error fetching compensator stats:", error);
      setCompensatorStats(null);
    }
  }, []);

  // Create compensator
  const createCompensator = useCallback(async (delegateName: string): Promise<string> => {
    if (!address) {
      throw new Error("No wallet connected");
    }

    setIsCreating(true);
    try {
      const compensatorAddress = await compensatorService.createCompensator(address, delegateName);
      
      // Refresh user data after creation
      await refreshUserData();
      await refreshAllData();
      
      return compensatorAddress;
    } catch (error) {
      console.error("Error creating compensator:", error);
      throw error;
    } finally {
      setIsCreating(false);
    }
  }, [address]);

  // Refresh user data
  const refreshUserData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchUserCompensatorAddress(),
        fetchUserCompensatorInstance(),
        fetchUserVotingPower(),
        fetchUserPendingRewards()
      ]);
    } catch (error) {
      console.error("Error refreshing user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    fetchUserCompensatorAddress,
    fetchUserCompensatorInstance,
    fetchUserVotingPower,
    fetchUserPendingRewards
  ]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    try {
      await Promise.all([
        fetchAllCompensators(),
        fetchCompensatorStats()
      ]);
    } catch (error) {
      console.error("Error refreshing all data:", error);
    }
  }, [fetchAllCompensators, fetchCompensatorStats]);

  // Initial data fetch
  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Fetch all compensators on mount
  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  return {
    // User's compensator instance
    userCompensatorAddress,
    userCompensatorInstance,
    userVotingPower,
    userPendingRewards,
    hasCompensator,
    
    // All compensators
    allCompensators,
    compensatorStats,
    
    // Loading states
    isLoading,
    isCreating,
    
    // Actions
    createCompensator,
    refreshUserData,
    refreshAllData
  };
}; 