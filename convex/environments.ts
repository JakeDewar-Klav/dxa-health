import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { DEMO_ENVIRONMENTS } from "./lib/environments";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("environments").collect();
  },
});

export const get = query({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("environments")
      .withIndex("by_envId", (q) => q.eq("envId", args.envId))
      .first();
  },
});

export const upsert = internalMutation({
  args: {
    envId: v.string(),
    name: v.string(),
    platform: v.string(),
    region: v.string(),
    narrative: v.string(),
    healthScore: v.number(),
    status: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
    lastCheckedAt: v.optional(v.number()),
    dataFreshnessScore: v.optional(v.number()),
    analyticsScore: v.optional(v.number()),
    formsScore: v.optional(v.number()),
    flowsCampaignsScore: v.optional(v.number()),
    campaignRecipients30d: v.optional(v.number()),
    flowRecipients30d: v.optional(v.number()),
    totalRevenue30d: v.optional(v.number()),
    avgOpenRate: v.optional(v.number()),
    avgClickRate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("environments")
      .withIndex("by_envId", (q) => q.eq("envId", args.envId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("environments", args);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const validIds = new Set(DEMO_ENVIRONMENTS.map((e) => e.id));

    const allEnvs = await ctx.db.query("environments").collect();
    for (const env of allEnvs) {
      if (!validIds.has(env.envId)) {
        await ctx.db.delete(env._id);
      }
    }

    for (const env of DEMO_ENVIRONMENTS) {
      const existing = await ctx.db
        .query("environments")
        .withIndex("by_envId", (q) => q.eq("envId", env.id))
        .first();

      if (!existing) {
        await ctx.db.insert("environments", {
          envId: env.id,
          name: env.name,
          platform: env.platform,
          region: env.region,
          narrative: env.narrative,
          healthScore: 0,
          status: "red",
        });
      }
    }
  },
});

export const triggerHealthCheck = mutation({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    const env = DEMO_ENVIRONMENTS.find((e) => e.id === args.envId);
    if (!env) throw new Error(`Unknown environment: ${args.envId}`);
    await ctx.scheduler.runAfter(0, internal.klaviyo.actions.runHealthCheck, {
      envId: args.envId,
    });
  },
});

export const triggerAllHealthChecks = mutation({
  args: {},
  handler: async (ctx) => {
    await ctx.scheduler.runAfter(
      0,
      internal.klaviyo.actions.runAllHealthChecks,
    );
  },
});

export const clearStaleActionItems = mutation({
  args: {},
  handler: async (ctx) => {
    const validIds = new Set(DEMO_ENVIRONMENTS.map((e) => e.id));
    const allItems = await ctx.db.query("actionItems").collect();
    let removed = 0;
    for (const item of allItems) {
      if (!validIds.has(item.envId)) {
        await ctx.db.delete(item._id);
        removed++;
      }
    }

    const configItems = allItems.filter(
      (i) =>
        i.category === "Configuration" &&
        i.description.startsWith("Missing API key:") &&
        i.status === "open" &&
        validIds.has(i.envId)
    );
    for (const item of configItems) {
      await ctx.db.delete(item._id);
      removed++;
    }
    return { removed };
  },
});
