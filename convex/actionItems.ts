import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("resolved"), v.literal("dismissed"))),
    envId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.envId) {
      const items = await ctx.db
        .query("actionItems")
        .withIndex("by_envId", (q) => q.eq("envId", args.envId!))
        .collect();
      if (args.status) {
        return items.filter((item) => item.status === args.status);
      }
      return items;
    }

    if (args.status) {
      return await ctx.db
        .query("actionItems")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    }

    return await ctx.db.query("actionItems").collect();
  },
});

export const create = internalMutation({
  args: {
    envId: v.string(),
    severity: v.union(v.literal("critical"), v.literal("warning"), v.literal("info")),
    category: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("actionItems", {
      ...args,
      status: "open",
      createdAt: Date.now(),
    });
  },
});

export const resolve = mutation({
  args: { id: v.id("actionItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "resolved",
      resolvedAt: Date.now(),
    });
  },
});

export const dismiss = mutation({
  args: { id: v.id("actionItems") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: "dismissed",
      resolvedAt: Date.now(),
    });
  },
});

export const clearResolved = internalMutation({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("actionItems")
      .withIndex("by_envId", (q) => q.eq("envId", args.envId))
      .collect();

    const openItems = items.filter((item) => item.status === "open");
    for (const item of openItems) {
      await ctx.db.patch(item._id, { status: "resolved", resolvedAt: Date.now() });
    }
  },
});
