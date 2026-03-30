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
      const latest = await ctx.db
        .query("healthChecks")
        .withIndex("by_envId_timestamp", (q) => q.eq("envId", env.envId))
        .order("desc")
        .first();
      if (!latest) continue;

      const fc = latest.flowsCampaigns;
      totalCampaignRecipients += fc.campaignSends30d;
      totalFlowRecipients += fc.flowSends30d;

      if (fc.campaignPerformance || fc.flowPerformance) {
        envsWithData++;
        const cPerf = fc.campaignPerformance;
        const fPerf = fc.flowPerformance;
        totalRevenue +=
          (cPerf?.conversionValue ?? 0) + (fPerf?.conversionValue ?? 0);
        const envRecipients =
          (cPerf?.recipients ?? 0) + (fPerf?.recipients ?? 0);
        if (envRecipients > 0) {
          const envOpenRate =
            ((cPerf?.openRate ?? 0) * (cPerf?.recipients ?? 0) +
              (fPerf?.openRate ?? 0) * (fPerf?.recipients ?? 0)) /
            envRecipients;
          const envClickRate =
            ((cPerf?.clickRate ?? 0) * (cPerf?.recipients ?? 0) +
              (fPerf?.clickRate ?? 0) * (fPerf?.recipients ?? 0)) /
            envRecipients;
          weightedOpenRate += envOpenRate * envRecipients;
          weightedClickRate += envClickRate * envRecipients;
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
    return await ctx.db.insert("healthChecks", args);
  },
});
