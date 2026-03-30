import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("resolved"), v.literal("dismissed"))),
    envId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.envId && args.status) {
      return await ctx.db
        .query("actionItems")
        .withIndex("by_envId_status", (q) =>
          q.eq("envId", args.envId!).eq("status", args.status!),
        )
        .take(200);
    }

    if (args.envId) {
      return await ctx.db
        .query("actionItems")
        .withIndex("by_envId", (q) => q.eq("envId", args.envId!))
        .take(200);
    }

    if (args.status) {
      return await ctx.db
        .query("actionItems")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .take(200);
    }

    return await ctx.db.query("actionItems").take(200);
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
    const existing = await ctx.db
      .query("actionItems")
      .withIndex("by_envId_status", (q) =>
        q.eq("envId", args.envId).eq("status", "open"),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("category"), args.category),
          q.eq(q.field("description"), args.description),
        ),
      )
      .first();
    if (existing) {
      return existing._id;
    }
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
    const openItems = await ctx.db
      .query("actionItems")
      .withIndex("by_envId_status", (q) =>
        q.eq("envId", args.envId).eq("status", "open"),
      )
      .take(200);

    for (const item of openItems) {
      await ctx.db.patch(item._id, { status: "resolved", resolvedAt: Date.now() });
    }
  },
});
