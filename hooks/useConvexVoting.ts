import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAccount } from "wagmi";

export function useVoting(address?: string) {
  const { address: connectedAddress } = useAccount();
  const targetAddress = address || connectedAddress;
  
  const votingHistory = useQuery(
    api.voting.getVotingHistory,
    targetAddress ? { voterAddress: targetAddress } : "skip"
  );
  
  const votingStats = useQuery(
    api.voting.getVotingStats,
    targetAddress ? { voterAddress: targetAddress } : "skip"
  );
  
  return {
    votingHistory,
    votingStats,
    isLoading: votingHistory === undefined || votingStats === undefined,
    isConnected: !!targetAddress,
  };
}

export function useVotingActions() {
  const recordVote = useMutation(api.voting.recordVote);
  const updateProposalStatus = useMutation(api.voting.updateProposalStatus);
  
  return {
    recordVote,
    updateProposalStatus,
  };
}

export function useProposalVotes(proposalId: string) {
  const proposalVotes = useQuery(
    api.voting.getProposalVotes,
    { proposalId }
  );
  
  const proposalParticipation = useQuery(
    api.voting.getProposalParticipation,
    { proposalId }
  );
  
  return {
    proposalVotes,
    proposalParticipation,
    isLoading: proposalVotes === undefined || proposalParticipation === undefined,
  };
}

export function useRecentVotingActivity() {
  const recentActivity = useQuery(api.voting.getRecentVotingActivity, { limit: 20 });
  
  return {
    recentActivity,
    isLoading: recentActivity === undefined,
  };
}
