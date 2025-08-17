import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

// Hook for getting proposal stakes
export const useProposalStakes = (proposalId: number) => {
  const stakes = useQuery(api.staking.getProposalStakes, { proposalId });
  
  return {
    stakes,
    isLoading: stakes === undefined,
  };
};

// Hook for getting staker stakes
export const useStakerStakes = (stakerAddress?: string) => {
  const stakes = useQuery(
    api.staking.getStakerStakes,
    stakerAddress ? { stakerAddress } : "skip"
  );
  
  return {
    stakes,
    isLoading: stakes === undefined,
  };
};

// Hook for getting proposal stake totals
export const useProposalStakeTotals = (proposalId: number) => {
  const totals = useQuery(api.staking.getProposalStakeTotals, { proposalId });
  
  return {
    totals,
    isLoading: totals === undefined,
  };
};

// Hook for creating stakes
export const useCreateStake = () => {
  const mutation = useMutation(api.staking.createStake);
  
  return {
    createStake: mutation,
  };
};

// Hook for resolving proposals
export const useResolveProposal = () => {
  const mutation = useMutation(api.staking.resolveProposal);
  
  return {
    resolveProposal: mutation,
  };
};

// Hook for marking stakes as claimed
export const useMarkStakeClaimed = () => {
  const mutation = useMutation(api.staking.markStakeClaimed);
  
  return {
    markStakeClaimed: mutation,
  };
};

// Hook for getting user staking statistics
export const useUserStakingStats = (stakerAddress?: string) => {
  const stats = useQuery(
    api.staking.getUserStakingStats,
    stakerAddress ? { stakerAddress } : "skip"
  );
  
  return {
    stats,
    isLoading: stats === undefined,
  };
};

// Hook for getting active proposals with stakes
export const useActiveProposalsWithStakes = () => {
  const proposals = useQuery(api.staking.getActiveProposalsWithStakes);
  
  return {
    proposals,
    isLoading: proposals === undefined,
  };
};
