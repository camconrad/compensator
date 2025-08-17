import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User profiles and delegate information
  profiles: defineTable({
    address: v.string(), // Ethereum wallet address
    username: v.optional(v.string()), // Custom username
    bio: v.optional(v.string()), // Profile bio/description
    profilePicture: v.optional(v.string()), // Profile image URL
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      discord: v.optional(v.string()),
      website: v.optional(v.string()),
      github: v.optional(v.string()),
    })),
    compensatorAddress: v.optional(v.string()), // Deployed Compensator contract address
    rewardRate: v.optional(v.number()), // APR percentage
    rewardPool: v.optional(v.number()), // COMP tokens in reward pool
    totalDelegations: v.optional(v.number()), // Total COMP delegated
    activeDelegations: v.optional(v.number()), // Active delegation count
    votingPower: v.optional(v.number()), // Current voting power
    stakedAmount: v.optional(v.number()), // Staked COMP amount
    pendingRewards: v.optional(v.number()), // Pending rewards to claim
    isVerified: v.optional(v.boolean()), // Profile verification status
    createdAt: v.number(), // Timestamp when profile was created
    updatedAt: v.number(), // Last update timestamp
  }).index("by_address", ["address"]),

  // Delegation relationships between users
  delegations: defineTable({
    delegator: v.string(), // Address of the person delegating
    delegate: v.string(), // Address of the delegate
    amount: v.number(), // Amount of COMP delegated
    status: v.union(v.literal("active"), v.literal("withdrawn"), v.literal("pending")),
    startDate: v.number(), // When delegation started
    endDate: v.optional(v.number()), // When delegation ended (if withdrawn)
    transactionHash: v.optional(v.string()), // Blockchain transaction hash
    rewardRate: v.number(), // APR at time of delegation
    totalRewardsEarned: v.optional(v.number()), // Total rewards earned from this delegation
  }).index("by_delegator", ["delegator"])
    .index("by_delegate", ["delegate"])
    .index("by_status", ["status"]),

  // Voting history and proposal participation
  votingHistory: defineTable({
    voter: v.string(), // Voter's address
    proposalId: v.string(), // Compound proposal ID
    proposalTitle: v.string(), // Proposal title
    voteDirection: v.union(v.literal("for"), v.literal("against"), v.literal("abstain")),
    votingPower: v.number(), // Voting power used
    timestamp: v.number(), // When vote was cast
    transactionHash: v.optional(v.string()), // Blockchain transaction hash
    status: v.union(v.literal("active"), v.literal("executed"), v.literal("defeated")),
    rewardsEarned: v.optional(v.number()), // Rewards earned for voting
  }).index("by_voter", ["voter"])
    .index("by_proposal", ["proposalId"])
    .index("by_timestamp", ["timestamp"]),

  // User preferences and settings
  userPreferences: defineTable({
    address: v.string(), // User's wallet address
    theme: v.optional(v.union(v.literal("light"), v.literal("dark"), v.literal("auto"))),
    notifications: v.optional(v.object({
      email: v.optional(v.boolean()),
      push: v.optional(v.boolean()),
      delegationUpdates: v.optional(v.boolean()),
      proposalUpdates: v.optional(v.boolean()),
      rewardUpdates: v.optional(v.boolean()),
    })),
    displaySettings: v.optional(v.object({
      compactMode: v.optional(v.boolean()),
      showAdvancedMetrics: v.optional(v.boolean()),
      defaultCurrency: v.optional(v.string()),
    })),
    updatedAt: v.number(),
  }).index("by_address", ["address"]),

  // Analytics and performance metrics
  delegateMetrics: defineTable({
    address: v.string(), // Delegate's address
    totalVotes: v.number(), // Total number of votes cast
    successfulVotes: v.number(), // Number of successful votes
    totalRewardsDistributed: v.number(), // Total rewards distributed to delegators
    averageDelegationAmount: v.number(), // Average delegation size
    delegationCount: v.number(), // Number of active delegators
    performanceScore: v.optional(v.number()), // Calculated performance metric
    lastActive: v.number(), // Last activity timestamp
    updatedAt: v.number(),
  }).index("by_address", ["address"])
    .index("by_performance", ["performanceScore"]),

  // System-wide statistics and caching
  systemStats: defineTable({
    key: v.string(), // Stat key (e.g., "totalDelegations", "activeUsers")
    value: v.union(v.string(), v.number(), v.boolean()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Staking system tables
  proposalStakes: defineTable({
    proposalId: v.number(), // Compound proposal ID
    staker: v.string(), // Address of the staker
    support: v.union(v.literal(0), v.literal(1)), // 0 = Against, 1 = For
    amount: v.number(), // Amount of COMP staked
    status: v.union(v.literal("active"), v.literal("resolved"), v.literal("claimed")),
    stakedAt: v.number(), // Timestamp when stake was placed
    resolvedAt: v.optional(v.number()), // Timestamp when proposal was resolved
    outcome: v.optional(v.union(v.literal("forWon"), v.literal("againstWon"))), // Final outcome
    claimedAt: v.optional(v.number()), // Timestamp when stake was claimed
    transactionHash: v.optional(v.string()), // Transaction hash of stake
  }).index("by_proposal", ["proposalId"])
    .index("by_staker", ["staker"])
    .index("by_proposal_staker", ["proposalId", "staker"])
    .index("by_status", ["status"]),

  proposalStakeTotals: defineTable({
    proposalId: v.number(), // Compound proposal ID
    totalStakesFor: v.number(), // Total stakes for the proposal
    totalStakesAgainst: v.number(), // Total stakes against the proposal
    totalStakers: v.number(), // Total number of unique stakers
    status: v.union(v.literal("active"), v.literal("resolved")),
    createdAt: v.number(), // Timestamp when first stake was placed
    resolvedAt: v.optional(v.number()), // Timestamp when proposal was resolved
    outcome: v.optional(v.union(v.literal("forWon"), v.literal("againstWon"))), // Final outcome
  }).index("by_proposal", ["proposalId"])
    .index("by_status", ["status"]),
});
