import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get voting history for a specific voter
export const getVotingHistory = query({
  args: { 
    voterAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    const votingHistory = await ctx.db
      .query("votingHistory")
      .withIndex("by_voter", (q) => q.eq("voter", args.voterAddress))
      .order("desc")
      .take(limit);
    
    return votingHistory;
  },
});

// Get voting history for a specific proposal
export const getProposalVotes = query({
  args: { proposalId: v.string() },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votingHistory")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();
    
    return votes;
  },
});

// Record a new vote
export const recordVote = mutation({
  args: {
    voter: v.string(),
    proposalId: v.string(),
    proposalTitle: v.string(),
    voteDirection: v.union(v.literal("for"), v.literal("against"), v.literal("abstain")),
    votingPower: v.number(),
    transactionHash: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("executed"), v.literal("defeated")),
    rewardsEarned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const voteId = await ctx.db.insert("votingHistory", {
      voter: args.voter,
      proposalId: args.proposalId,
      proposalTitle: args.proposalTitle,
      voteDirection: args.voteDirection,
      votingPower: args.votingPower,
      timestamp: now,
      transactionHash: args.transactionHash,
      status: args.status,
      rewardsEarned: args.rewardsEarned || 0,
    });
    
    return voteId;
  },
});

// Update proposal status for all votes
export const updateProposalStatus = mutation({
  args: {
    proposalId: v.string(),
    newStatus: v.union(v.literal("active"), v.literal("executed"), v.literal("defeated")),
  },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votingHistory")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();
    
    // Update all votes for this proposal
    for (const vote of votes) {
      await ctx.db.patch(vote._id, { status: args.newStatus });
    }
    
    return votes.length;
  },
});

// Get voting statistics for a user
export const getVotingStats = query({
  args: { voterAddress: v.string() },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votingHistory")
      .withIndex("by_voter", (q) => q.eq("voter", args.voterAddress))
      .collect();
    
    const totalVotes = votes.length;
    const votesFor = votes.filter(v => v.voteDirection === "for").length;
    const votesAgainst = votes.filter(v => v.voteDirection === "against").length;
    const votesAbstain = votes.filter(v => v.voteDirection === "abstain").length;
    
    const totalVotingPower = votes.reduce((sum, v) => sum + v.votingPower, 0);
    const totalRewards = votes.reduce((sum, v) => sum + (v.rewardsEarned || 0), 0);
    
    return {
      totalVotes,
      votesFor,
      votesAgainst,
      votesAbstain,
      totalVotingPower,
      totalRewards,
      recentVotes: votes.slice(0, 5), // Last 5 votes
    };
  },
});

// Get recent voting activity across all users
export const getRecentVotingActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    
    const recentVotes = await ctx.db
      .query("votingHistory")
      .order("desc")
      .take(limit);
    
    return recentVotes;
  },
});

// Get voting participation for a specific proposal
export const getProposalParticipation = query({
  args: { proposalId: v.string() },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votingHistory")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();
    
    const totalVotes = votes.length;
    const totalVotingPower = votes.reduce((sum, v) => sum + v.votingPower, 0);
    
    const votesFor = votes.filter(v => v.voteDirection === "for");
    const votesAgainst = votes.filter(v => v.voteDirection === "against");
    const votesAbstain = votes.filter(v => v.voteDirection === "abstain");
    
    const votingPowerFor = votesFor.reduce((sum, v) => sum + v.votingPower, 0);
    const votingPowerAgainst = votesAgainst.reduce((sum, v) => sum + v.votingPower, 0);
    const votingPowerAbstain = votesAbstain.reduce((sum, v) => sum + v.votingPower, 0);
    
    return {
      totalVotes,
      totalVotingPower,
      votesFor: votesFor.length,
      votesAgainst: votesAgainst.length,
      votesAbstain: votesAbstain.length,
      votingPowerFor,
      votingPowerAgainst,
      votingPowerAbstain,
      participationRate: totalVotes > 0 ? (totalVotes / totalVotes) * 100 : 0,
    };
  },
});
