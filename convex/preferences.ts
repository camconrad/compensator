import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get user preferences
export const getUserPreferences = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    return preferences;
  },
});

// Create or update user preferences
export const upsertUserPreferences = mutation({
  args: {
    address: v.string(),
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
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if preferences already exist
    const existingPreferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (existingPreferences) {
      // Update existing preferences
      const updates: any = { updatedAt: now };
      
      if (args.theme !== undefined) updates.theme = args.theme;
      if (args.notifications !== undefined) updates.notifications = args.notifications;
      if (args.displaySettings !== undefined) updates.displaySettings = args.displaySettings;
      
      await ctx.db.patch(existingPreferences._id, updates);
      return existingPreferences._id;
    } else {
      // Create new preferences
      const preferencesId = await ctx.db.insert("userPreferences", {
        address: args.address,
        theme: args.theme || "auto",
        notifications: args.notifications || {
          email: false,
          push: false,
          delegationUpdates: true,
          proposalUpdates: true,
          rewardUpdates: true,
        },
        displaySettings: args.displaySettings || {
          compactMode: false,
          showAdvancedMetrics: false,
          defaultCurrency: "USD",
        },
        updatedAt: now,
      });
      
      return preferencesId;
    }
  },
});

// Update theme preference
export const updateTheme = mutation({
  args: {
    address: v.string(),
    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (!preferences) {
      // Create preferences if they don't exist
      return await ctx.db.insert("userPreferences", {
        address: args.address,
        theme: args.theme,
        notifications: {
          email: false,
          push: false,
          delegationUpdates: true,
          proposalUpdates: true,
          rewardUpdates: true,
        },
        displaySettings: {
          compactMode: false,
          showAdvancedMetrics: false,
          defaultCurrency: "USD",
        },
        updatedAt: Date.now(),
      });
    }
    
    // Update existing preferences
    await ctx.db.patch(preferences._id, {
      theme: args.theme,
      updatedAt: Date.now(),
    });
    
    return preferences._id;
  },
});

// Update notification preferences
export const updateNotificationPreferences = mutation({
  args: {
    address: v.string(),
    notifications: v.object({
      email: v.optional(v.boolean()),
      push: v.optional(v.boolean()),
      delegationUpdates: v.optional(v.boolean()),
      proposalUpdates: v.optional(v.boolean()),
      rewardUpdates: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (!preferences) {
      throw new Error("User preferences not found");
    }
    
    // Merge with existing notification preferences
    const currentNotifications = preferences.notifications || {};
    const updatedNotifications = { ...currentNotifications, ...args.notifications };
    
    await ctx.db.patch(preferences._id, {
      notifications: updatedNotifications,
      updatedAt: Date.now(),
    });
    
    return preferences._id;
  },
});

// Update display settings
export const updateDisplaySettings = mutation({
  args: {
    address: v.string(),
    displaySettings: v.object({
      compactMode: v.optional(v.boolean()),
      showAdvancedMetrics: v.optional(v.boolean()),
      defaultCurrency: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (!preferences) {
      throw new Error("User preferences not found");
    }
    
    // Merge with existing display settings
    const currentDisplaySettings = preferences.displaySettings || {};
    const updatedDisplaySettings = { ...currentDisplaySettings, ...args.displaySettings };
    
    await ctx.db.patch(preferences._id, {
      displaySettings: updatedDisplaySettings,
      updatedAt: Date.now(),
    });
    
    return preferences._id;
  },
});

// Get default preferences for new users
export const getDefaultPreferences = query({
  args: {},
  handler: async (ctx) => {
    return {
      theme: "auto" as const,
      notifications: {
        email: false,
        push: false,
        delegationUpdates: true,
        proposalUpdates: true,
        rewardUpdates: true,
      },
      displaySettings: {
        compactMode: false,
        showAdvancedMetrics: false,
        defaultCurrency: "USD",
      },
    };
  },
});
