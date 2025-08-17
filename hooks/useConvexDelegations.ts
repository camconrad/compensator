import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";
import { useGetCompensatorFactoryContract } from "@/hooks/useGetCompensatorFactoryContract";
import { useGetCompensatorContract } from "@/hooks/useGetCompensatorContract";
import { ethers } from "ethers";
import { useEffect, useState } from "react";

interface DelegationReward {
  delegate: string;
  rewards: string;
}

interface DelegationRewards {
  totalRewards: number;
  delegationRewards: DelegationReward[];
}

export function useDelegations(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;
  
  const { compensatorFactoryContract } = useGetCompensatorFactoryContract();
  const [delegations, setDelegations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchDelegations = async () => {
      if (!targetAddress || !compensatorFactoryContract) return;
      
      setIsLoading(true);
      try {
        // Get user's compensator contract
        const userCompensatorAddress = await compensatorFactoryContract.getCompensator(targetAddress);
        if (userCompensatorAddress && userCompensatorAddress !== ethers.ZeroAddress) {
          // User has a compensator contract - they're a delegate
          // TODO: Fetch delegations to this user
          setDelegations([]);
        } else {
          // User is a delegator - check if they have any active delegations
          // TODO: Fetch delegations from this user
          setDelegations([]);
        }
      } catch (error) {
        console.error("Error fetching delegations:", error);
        setDelegations([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDelegations();
  }, [targetAddress, compensatorFactoryContract]);
  
  return {
    delegationsForDelegate: delegations,
    delegationsByDelegator: delegations,
    delegateStats: {
      totalDelegations: 0,
      activeDelegations: 0,
      totalDelegated: 0
    },
    delegationHistory: delegations,
    isLoading,
    isConnected: !!targetAddress,
  };
}

export function useDelegationActions() {
  const createDelegation = useMutation(api.delegations.createDelegation);
  const updateDelegationStatus = useMutation(api.delegations.updateDelegationStatus);
  
  return {
    createDelegation,
    updateDelegationStatus,
  };
}

export const useDelegationRewards = (delegatorAddress?: string) => {
  const { address: connectedAddress } = useAccount();
  const targetAddress = delegatorAddress || connectedAddress;
  const { compensatorFactoryContract } = useGetCompensatorFactoryContract();
  const { handleSetCompensatorContract } = useGetCompensatorContract();
  const [rewards, setRewards] = useState<DelegationRewards>({ totalRewards: 0, delegationRewards: [] });
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const fetchDelegationRewards = async () => {
      if (!targetAddress || !compensatorFactoryContract) return;
      
      setIsLoading(true);
      try {
        // Get user's compensator contract
        const userCompensatorAddress = await compensatorFactoryContract.getCompensator(targetAddress);
        if (userCompensatorAddress && userCompensatorAddress !== ethers.ZeroAddress) {
          // User is a delegate - get their pending rewards
          const compensatorContract = await handleSetCompensatorContract(userCompensatorAddress);
          
          if (compensatorContract) {
            const pendingRewards = await compensatorContract.getPendingRewards(targetAddress);
            const formattedRewards = ethers.formatEther(pendingRewards);
            
            setRewards({
              totalRewards: parseFloat(formattedRewards),
              delegationRewards: [{ delegate: targetAddress, rewards: formattedRewards }]
            });
          }
        } else {
          // User is a delegator - check if they have any active delegations
          // For now, return 0 rewards since delegators don't earn rewards directly
          setRewards({ totalRewards: 0, delegationRewards: [] });
        }
      } catch (error) {
        console.error("Error fetching delegation rewards:", error);
        setRewards({ totalRewards: 0, delegationRewards: [] });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDelegationRewards();
  }, [targetAddress, compensatorFactoryContract, handleSetCompensatorContract]);
  
  return {
    delegationRewards: rewards,
    isLoading,
  };
};


