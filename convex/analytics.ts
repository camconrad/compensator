import { query } from "./_generated/server";
import { v } from "convex/values";

// Get total platform statistics
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    try {
      // Get total users (profiles)
      const totalUsers = await ctx.db.query("profiles").collect();
      
      // Get total delegations
      const totalDelegations = await ctx.db.query("delegations")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();
      
      // Get total stakes
      const totalStakes = await ctx.db.query("proposalStakes")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .collect();
      
      // Get total votes
      const totalVotes = await ctx.db.query("votingHistory").collect();
      
      // Calculate totals
      const totalDelegationsAmount = totalDelegations.reduce((sum, d) => sum + d.amount, 0);
      const totalStakesAmount = totalStakes.reduce((sum, s) => sum + s.amount, 0);
      const totalVotingPower = totalVotes.reduce((sum, v) => sum + v.votingPower, 0);
      
      return {
        totalUsers: totalUsers.length,
        totalDelegations: totalDelegations.length,
        totalDelegationsAmount,
        totalStakes: totalStakes.length,
        totalStakesAmount,
        totalVotes: totalVotes.length,
        totalVotingPower
      };
    } catch (error) {
      console.error("Error getting platform stats:", error);
      return {
        totalUsers: 0,
        totalDelegations: 0,
        totalDelegationsAmount: 0,
        totalStakes: 0,
        totalStakesAmount: 0,
        totalVotes: 0,
        totalVotingPower: 0
      };
    }
  },
});

// Get historical data for charts
export const getHistoricalData = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const days = args.days || 7;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      
      // Get proposals over time
      const proposalsOverTime = [];
      for (let i = 0; i < days; i++) {
        const startTime = now - (days - i) * dayMs;
        const endTime = now - (days - i - 1) * dayMs;
        
        const proposals = await ctx.db.query("votingHistory")
          .withIndex("by_timestamp", (q) => 
            q.gte("timestamp", startTime).lt("timestamp", endTime)
          )
          .collect();
        
        const date = new Date(startTime);
        proposalsOverTime.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: proposals.length
        });
      }
      
      // Get delegations over time
      const delegationsOverTime = [];
      for (let i = 0; i < days; i++) {
        const startTime = now - (days - i) * dayMs;
        const endTime = now - (days - i - 1) * dayMs;
        
        const delegations = await ctx.db.query("delegations")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .filter((q) => 
            q.and(
              q.gte(q.field("startDate"), startTime),
              q.lt(q.field("startDate"), endTime)
            )
          )
          .collect();
        
        const date = new Date(startTime);
        const totalAmount = delegations.reduce((sum, d) => sum + d.amount, 0);
        delegationsOverTime.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: totalAmount
        });
      }
      
      // Get staking over time
      const stakingOverTime = [];
      for (let i = 0; i < days; i++) {
        const startTime = now - (days - i) * dayMs;
        const endTime = now - (days - i - 1) * dayMs;
        
        const stakes = await ctx.db.query("proposalStakes")
          .withIndex("by_status", (q) => q.eq("status", "active"))
          .filter((q) => 
            q.and(
              q.gte(q.field("stakedAt"), startTime),
              q.lt(q.field("stakedAt"), endTime)
            )
          )
          .collect();
        
        const date = new Date(startTime);
        const totalAmount = stakes.reduce((sum, s) => sum + s.amount, 0);
        stakingOverTime.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: totalAmount
        });
      }
      
      return {
        proposalsOverTime,
        delegationsOverTime,
        stakingOverTime
      };
    } catch (error) {
      console.error("Error getting historical data:", error);
      return {
        proposalsOverTime: [],
        delegationsOverTime: [],
        stakingOverTime: []
      };
    }
  },
});

// Get top performing delegates
export const getTopDelegates = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 10;
      
      // Get all delegates with their metrics
      const delegates = await ctx.db.query("delegateMetrics")
        .order("desc")
        .take(limit);
      
      return delegates.map(delegate => ({
        address: delegate.address,
        totalVotes: delegate.totalVotes,
        successfulVotes: delegate.successfulVotes,
        totalRewardsDistributed: delegate.totalRewardsDistributed,
        delegationCount: delegate.delegationCount,
        performanceScore: delegate.performanceScore || 0
      }));
    } catch (error) {
      console.error("Error getting top delegates:", error);
      return [];
    }
  },
});

// Get recent activity
export const getRecentActivity = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const limit = args.limit || 20;
      
      // Get recent votes
      const recentVotes = await ctx.db.query("votingHistory")
        .withIndex("by_timestamp")
        .order("desc")
        .take(limit);
      
      // Get recent delegations
      const recentDelegations = await ctx.db.query("delegations")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .order("desc")
        .take(limit);
      
      // Get recent stakes
      const recentStakes = await ctx.db.query("proposalStakes")
        .withIndex("by_status", (q) => q.eq("status", "active"))
        .order("desc")
        .take(limit);
      
      // Combine and sort by timestamp
      const allActivity = [
        ...recentVotes.map(v => ({ ...v, type: 'vote' as const })),
        ...recentDelegations.map(d => ({ ...d, type: 'delegation' as const })),
        ...recentStakes.map(s => ({ ...s, type: 'stake' as const }))
      ].sort((a, b) => {
        const timeA = a.type === 'vote' ? a.timestamp : a.type === 'delegation' ? a.startDate : a.stakedAt;
        const timeB = b.type === 'vote' ? b.timestamp : b.type === 'delegation' ? b.startDate : b.stakedAt;
        return timeB - timeA;
      }).slice(0, limit);
      
      return allActivity;
    } catch (error) {
      console.error("Error getting recent activity:", error);
      return [];
    }
  },
});
