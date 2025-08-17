import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get a profile by wallet address
export const getProfile = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    return profile;
  },
});

// Get multiple profiles by addresses
export const getProfiles = query({
  args: { addresses: v.array(v.string()) },
  handler: async (ctx, args) => {
    const profiles = await Promise.all(
      args.addresses.map(async (address) => {
        return await ctx.db
          .query("profiles")
          .withIndex("by_address", (q) => q.eq("address", address))
          .first();
      })
    );
    
    return profiles.filter(Boolean);
  },
});

// Create a new profile
export const createProfile = mutation({
  args: {
    address: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      discord: v.optional(v.string()),
      website: v.optional(v.string()),
      github: v.optional(v.string()),
    })),
    compensatorAddress: v.optional(v.string()),
    rewardRate: v.optional(v.number()),
    rewardPool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (existingProfile) {
      throw new Error("Profile already exists for this address");
    }
    
    const profileId = await ctx.db.insert("profiles", {
      address: args.address,
      username: args.username,
      bio: args.bio,
      profilePicture: args.profilePicture,
      socialLinks: args.socialLinks,
      compensatorAddress: args.compensatorAddress,
      rewardRate: args.rewardRate,
      rewardPool: args.rewardPool,
      totalDelegations: 0,
      activeDelegations: 0,
      votingPower: 0,
      stakedAmount: 0,
      pendingRewards: 0,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    });
    
    return profileId;
  },
});

// Update an existing profile
export const updateProfile = mutation({
  args: {
    address: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
    socialLinks: v.optional(v.object({
      twitter: v.optional(v.string()),
      discord: v.optional(v.string()),
      website: v.optional(v.string()),
      github: v.optional(v.string()),
    })),
    rewardRate: v.optional(v.number()),
    rewardPool: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (!profile) {
      throw new Error("Profile not found");
    }
    
    const updates: any = { updatedAt: Date.now() };
    
    if (args.username !== undefined) updates.username = args.username;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.profilePicture !== undefined) updates.profilePicture = args.profilePicture;
    if (args.socialLinks !== undefined) updates.socialLinks = args.socialLinks;
    if (args.rewardRate !== undefined) updates.rewardRate = args.rewardRate;
    if (args.rewardPool !== undefined) updates.rewardPool = args.rewardPool;
    
    await ctx.db.patch(profile._id, updates);
    
    return profile._id;
  },
});

// Update blockchain data (called after blockchain transactions)
export const updateBlockchainData = mutation({
  args: {
    address: v.string(),
    compensatorAddress: v.optional(v.string()),
    totalDelegations: v.optional(v.number()),
    activeDelegations: v.optional(v.number()),
    votingPower: v.optional(v.number()),
    stakedAmount: v.optional(v.number()),
    pendingRewards: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (!profile) {
      throw new Error("Profile not found");
    }
    
    const updates: any = { updatedAt: Date.now() };
    
    if (args.compensatorAddress !== undefined) updates.compensatorAddress = args.compensatorAddress;
    if (args.totalDelegations !== undefined) updates.totalDelegations = args.totalDelegations;
    if (args.activeDelegations !== undefined) updates.activeDelegations = args.activeDelegations;
    if (args.votingPower !== undefined) updates.votingPower = args.votingPower;
    if (args.stakedAmount !== undefined) updates.stakedAmount = args.stakedAmount;
    if (args.pendingRewards !== undefined) updates.pendingRewards = args.pendingRewards;
    
    await ctx.db.patch(profile._id, updates);
    
    return profile._id;
  },
});

// Search profiles by username or bio
export const searchProfiles = query({
  args: { 
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // Get all profiles and filter by search query
    const allProfiles = await ctx.db.query("profiles").collect();
    
    const filteredProfiles = allProfiles
      .filter(profile => {
        const searchLower = args.query.toLowerCase();
        return (
          (profile.username && profile.username.toLowerCase().includes(searchLower)) ||
          (profile.bio && profile.bio.toLowerCase().includes(searchLower)) ||
          profile.address.toLowerCase().includes(searchLower)
        );
      })
      .slice(0, limit);
    
    return filteredProfiles;
  },
});

// Get top performing delegates
export const getTopDelegates = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const allProfiles = await ctx.db.query("profiles").collect();
    
    // Sort by total delegations and return top performers
    const topDelegates = allProfiles
      .filter(profile => profile.totalDelegations && profile.totalDelegations > 0)
      .sort((a, b) => (b.totalDelegations || 0) - (a.totalDelegations || 0))
      .slice(0, limit);
    
    return topDelegates;
  },
});
