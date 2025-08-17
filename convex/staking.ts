import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all stakes for a specific proposal
export const getProposalStakes = query({
  args: { proposalId: v.number() },
  handler: async (ctx, args) => {
    const stakes = await ctx.db
      .query("proposalStakes")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();
    
    return stakes;
  },
});

// Get stakes by a specific staker
export const getStakerStakes = query({
  args: { stakerAddress: v.string() },
  handler: async (ctx, args) => {
    const stakes = await ctx.db
      .query("proposalStakes")
      .withIndex("by_staker", (q) => q.eq("staker", args.stakerAddress))
      .order("desc")
      .collect();
    
    return stakes;
  },
});

// Get total stakes for a proposal
export const getProposalStakeTotals = query({
  args: { proposalId: v.number() },
  handler: async (ctx, args) => {
    const totals = await ctx.db
      .query("proposalStakeTotals")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .first();
    
    return totals;
  },
});

// Create a new stake
export const createStake = mutation({
  args: {
    proposalId: v.number(),
    staker: v.string(),
    support: v.union(v.literal(0), v.literal(1)),
    amount: v.number(),
    transactionHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create the stake record
    const stakeId = await ctx.db.insert("proposalStakes", {
      proposalId: args.proposalId,
      staker: args.staker,
      support: args.support,
      amount: args.amount,
      status: "active",
      stakedAt: now,
      transactionHash: args.transactionHash,
    });
    
    // Update or create proposal totals
    const existingTotals = await ctx.db
      .query("proposalStakeTotals")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .first();
    
    if (existingTotals) {
      // Update existing totals
      const updates: any = {};
      if (args.support === 1) {
        updates.totalStakesFor = existingTotals.totalStakesFor + args.amount;
      } else {
        updates.totalStakesAgainst = existingTotals.totalStakesAgainst + args.amount;
      }
      updates.totalStakers = existingTotals.totalStakers + 1;
      
      await ctx.db.patch(existingTotals._id, updates);
    } else {
      // Create new totals
      await ctx.db.insert("proposalStakeTotals", {
        proposalId: args.proposalId,
        totalStakesFor: args.support === 1 ? args.amount : 0,
        totalStakesAgainst: args.support === 0 ? args.amount : 0,
        totalStakers: 1,
        status: "active",
        createdAt: now,
      });
    }
    
    return stakeId;
  },
});

// Resolve a proposal and update stake outcomes
export const resolveProposal = mutation({
  args: {
    proposalId: v.number(),
    outcome: v.union(v.literal("forWon"), v.literal("againstWon")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Update all stakes for this proposal
    const stakes = await ctx.db
      .query("proposalStakes")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    for (const stake of stakes) {
      await ctx.db.patch(stake._id, {
        status: "resolved",
        resolvedAt: now,
        outcome: args.outcome,
      });
    }
    
    // Update proposal totals
    const totals = await ctx.db
      .query("proposalStakeTotals")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .first();
    
    if (totals) {
      await ctx.db.patch(totals._id, {
        status: "resolved",
        resolvedAt: now,
        outcome: args.outcome,
      });
    }
    
    return true;
  },
});

// Mark a stake as claimed
export const markStakeClaimed = mutation({
  args: {
    proposalId: v.number(),
    staker: v.string(),
  },
  handler: async (ctx, args) => {
    const stake = await ctx.db
      .query("proposalStakes")
      .withIndex("by_proposal_staker", (q) => 
        q.eq("proposalId", args.proposalId).eq("staker", args.staker)
      )
      .first();
    
    if (stake) {
      await ctx.db.patch(stake._id, {
        status: "claimed",
        claimedAt: Date.now(),
      });
    }
    
    return true;
  },
});

// Get staking statistics for a user
export const getUserStakingStats = query({
  args: { stakerAddress: v.string() },
  handler: async (ctx, args) => {
    const stakes = await ctx.db
      .query("proposalStakes")
      .withIndex("by_staker", (q) => q.eq("staker", args.stakerAddress))
      .collect();
    
    const totalStaked = stakes.reduce((sum, stake) => sum + stake.amount, 0);
    const activeStakes = stakes.filter(stake => stake.status === "active").length;
    const resolvedStakes = stakes.filter(stake => stake.status === "resolved").length;
    const claimedStakes = stakes.filter(stake => stake.status === "claimed").length;
    
    // Calculate potential winnings (stakes on winning outcomes)
    const winningStakes = stakes
      .filter(stake => stake.outcome && 
        ((stake.outcome === "forWon" && stake.support === 1) || 
         (stake.outcome === "againstWon" && stake.support === 0)))
      .reduce((sum, stake) => sum + stake.amount, 0);
    
    return {
      totalStaked,
      activeStakes,
      resolvedStakes,
      claimedStakes,
      winningStakes,
      totalStakes: stakes.length,
    };
  },
});

// Get active proposals with staking data
export const getActiveProposalsWithStakes = query({
  args: {},
  handler: async (ctx) => {
    const proposals = await ctx.db
      .query("proposalStakeTotals")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .order("desc")
      .collect();
    
    return proposals;
  },
});
