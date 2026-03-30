import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const listByEnv = query({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("metrics")
      .withIndex("by_envId", (q) => q.eq("envId", args.envId))
      .collect();
  },
});

export const listStale = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("metrics")
      .withIndex("by_stale", (q) => q.eq("isStale", true))
      .collect();
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("metrics").take(500);
  },
});

export const upsert = internalMutation({
  args: {
    envId: v.string(),
    klaviyoMetricId: v.string(),
    name: v.string(),
    integration: v.optional(v.string()),
    lastEventAt: v.optional(v.number()),
    eventCount30d: v.number(),
    isCustom: v.boolean(),
    isStale: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("metrics")
      .withIndex("by_envId_klaviyoId", (q) =>
        q.eq("envId", args.envId).eq("klaviyoMetricId", args.klaviyoMetricId),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("metrics", args);
  },
});

const metricValidator = v.object({
  envId: v.string(),
  klaviyoMetricId: v.string(),
  name: v.string(),
  integration: v.optional(v.string()),
  lastEventAt: v.optional(v.number()),
  eventCount30d: v.number(),
  isCustom: v.boolean(),
  isStale: v.boolean(),
});

export const upsertBatch = internalMutation({
  args: { items: v.array(metricValidator) },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      const existing = await ctx.db
        .query("metrics")
        .withIndex("by_envId_klaviyoId", (q) =>
          q.eq("envId", item.envId).eq("klaviyoMetricId", item.klaviyoMetricId),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, item);
      } else {
        await ctx.db.insert("metrics", item);
      }
    }
  },
});

export const remove = mutation({
  args: { id: v.id("metrics") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const removeBatch = mutation({
  args: { ids: v.array(v.id("metrics")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});
