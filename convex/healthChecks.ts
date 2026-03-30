import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getLatest = query({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("healthChecks")
      .withIndex("by_envId_timestamp", (q) => q.eq("envId", args.envId))
      .order("desc")
      .first();
  },
});

export const getPrevious = query({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("healthChecks")
      .withIndex("by_envId_timestamp", (q) => q.eq("envId", args.envId))
      .order("desc")
      .take(2);
    return results[1] ?? null;
  },
});

export const getHistory = query({
  args: {
    envId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 30;
    return await ctx.db
      .query("healthChecks")
      .withIndex("by_envId_timestamp", (q) => q.eq("envId", args.envId))
      .order("desc")
      .take(limit);
  },
});

export const getAggregatePerformance = query({
  args: {},
  handler: async (ctx) => {
    const environments = await ctx.db.query("environments").take(50);
    let totalCampaignRecipients = 0;
    let totalFlowRecipients = 0;
    let totalRevenue = 0;
    let envsWithData = 0;
    let weightedOpenRate = 0;
    let weightedClickRate = 0;
    let totalWeightRecipients = 0;

    for (const env of environments) {
      const cr = env.campaignRecipients30d ?? 0;
      const fr = env.flowRecipients30d ?? 0;
      totalCampaignRecipients += cr;
      totalFlowRecipients += fr;

      const revenue = env.totalRevenue30d ?? 0;
      if (revenue > 0 || env.avgOpenRate !== undefined) {
        envsWithData++;
        totalRevenue += revenue;
        const envRecipients = cr + fr;
        if (envRecipients > 0 && env.avgOpenRate !== undefined) {
          weightedOpenRate += (env.avgOpenRate ?? 0) * envRecipients;
          weightedClickRate += (env.avgClickRate ?? 0) * envRecipients;
          totalWeightRecipients += envRecipients;
        }
      }
    }

    return {
      totalCampaignRecipients,
      totalFlowRecipients,
      totalRecipients: totalCampaignRecipients + totalFlowRecipients,
      totalRevenue,
      avgOpenRate:
        totalWeightRecipients > 0
          ? weightedOpenRate / totalWeightRecipients
          : 0,
      avgClickRate:
        totalWeightRecipients > 0
          ? weightedClickRate / totalWeightRecipients
          : 0,
      envsWithData,
    };
  },
});

export const store = internalMutation({
  args: {
    envId: v.string(),
    timestamp: v.number(),
    dataFreshness: v.object({
      lastEventAt: v.optional(v.number()),
      eventCount24h: v.number(),
      eventCount7d: v.number(),
      eventCount30d: v.number(),
      perMetric: v.array(
        v.object({
          name: v.string(),
          lastEventAt: v.optional(v.number()),
          count24h: v.number(),
          count7d: v.number(),
          count30d: v.number(),
        })
      ),
      score: v.number(),
      status: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
    }),
    analyticsReadiness: v.object({
      rfm: v.union(v.literal("healthy"), v.literal("thin"), v.literal("broken"), v.literal("unknown")),
      channelAffinity: v.union(v.literal("healthy"), v.literal("thin"), v.literal("broken"), v.literal("unknown")),
      churnRisk: v.union(v.literal("healthy"), v.literal("thin"), v.literal("broken"), v.literal("unknown")),
      score: v.number(),
      status: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
    }),
    formsHealth: v.object({
      activeFormsCount: v.number(),
      submissions7d: v.number(),
      submissions30d: v.number(),
      score: v.number(),
      status: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
    }),
    flowsCampaigns: v.object({
      campaignSends30d: v.number(),
      flowSends30d: v.number(),
      topFlows: v.array(
        v.object({
          name: v.string(),
          sends: v.number(),
        })
      ),
      campaignBreakdown: v.optional(
        v.object({
          total: v.number(),
          sent: v.number(),
          draft: v.number(),
          scheduled: v.number(),
          emailCount: v.number(),
          smsCount: v.number(),
          recentSent: v.array(
            v.object({
              name: v.string(),
              channel: v.string(),
              sentAt: v.optional(v.string()),
            })
          ),
        })
      ),
      flowBreakdown: v.optional(
        v.object({
          total: v.number(),
          live: v.number(),
          manual: v.number(),
          draft: v.number(),
          activeFlows: v.array(
            v.object({
              name: v.string(),
              status: v.string(),
              triggerType: v.optional(v.string()),
            })
          ),
        })
      ),
      campaignPerformance: v.optional(
        v.object({
          recipients: v.number(),
          delivered: v.number(),
          openRate: v.number(),
          clickRate: v.number(),
          bounceRate: v.number(),
          unsubscribeRate: v.number(),
          conversionRate: v.number(),
          conversionValue: v.number(),
          revenuePerRecipient: v.number(),
        })
      ),
      flowPerformance: v.optional(
        v.object({
          recipients: v.number(),
          delivered: v.number(),
          openRate: v.number(),
          clickRate: v.number(),
          bounceRate: v.number(),
          unsubscribeRate: v.number(),
          conversionRate: v.number(),
          conversionValue: v.number(),
          revenuePerRecipient: v.number(),
        })
      ),
      topCampaigns: v.optional(
        v.array(
          v.object({
            name: v.string(),
            recipients: v.number(),
            openRate: v.number(),
            clickRate: v.number(),
            revenue: v.number(),
          })
        )
      ),
      score: v.number(),
      status: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
    }),
    overallScore: v.number(),
    overallStatus: v.union(v.literal("green"), v.literal("yellow"), v.literal("red")),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("healthChecks", args);

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const stale = await ctx.db
      .query("healthChecks")
      .withIndex("by_envId_timestamp", (q) =>
        q.eq("envId", args.envId).lt("timestamp", sevenDaysAgo),
      )
      .take(50);
    for (const doc of stale) {
      await ctx.db.delete(doc._id);
    }

    return id;
  },
});
