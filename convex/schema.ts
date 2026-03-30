import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  environments: defineTable({
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
  }).index("by_envId", ["envId"]),

  healthChecks: defineTable({
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
        }),
      ),
      score: v.number(),
      status: v.union(
        v.literal("green"),
        v.literal("yellow"),
        v.literal("red"),
      ),
    }),
    analyticsReadiness: v.object({
      rfm: v.union(
        v.literal("healthy"),
        v.literal("thin"),
        v.literal("broken"),
        v.literal("unknown"),
      ),
      channelAffinity: v.union(
        v.literal("healthy"),
        v.literal("thin"),
        v.literal("broken"),
        v.literal("unknown"),
      ),
      churnRisk: v.union(
        v.literal("healthy"),
        v.literal("thin"),
        v.literal("broken"),
        v.literal("unknown"),
      ),
      score: v.number(),
      status: v.union(
        v.literal("green"),
        v.literal("yellow"),
        v.literal("red"),
      ),
    }),
    formsHealth: v.object({
      activeFormsCount: v.number(),
      submissions7d: v.number(),
      submissions30d: v.number(),
      score: v.number(),
      status: v.union(
        v.literal("green"),
        v.literal("yellow"),
        v.literal("red"),
      ),
    }),
    flowsCampaigns: v.object({
      campaignSends30d: v.number(),
      flowSends30d: v.number(),
      topFlows: v.array(
        v.object({
          name: v.string(),
          sends: v.number(),
        }),
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
            }),
          ),
        }),
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
            }),
          ),
        }),
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
        }),
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
        }),
      ),
      topCampaigns: v.optional(
        v.array(
          v.object({
            name: v.string(),
            recipients: v.number(),
            openRate: v.number(),
            clickRate: v.number(),
            revenue: v.number(),
          }),
        ),
      ),
      score: v.number(),
      status: v.union(
        v.literal("green"),
        v.literal("yellow"),
        v.literal("red"),
      ),
    }),
    overallScore: v.number(),
    overallStatus: v.union(
      v.literal("green"),
      v.literal("yellow"),
      v.literal("red"),
    ),
  })
    .index("by_envId", ["envId"])
    .index("by_envId_timestamp", ["envId", "timestamp"]),

  metrics: defineTable({
    envId: v.string(),
    klaviyoMetricId: v.string(),
    name: v.string(),
    integration: v.optional(v.string()),
    lastEventAt: v.optional(v.number()),
    eventCount30d: v.number(),
    isCustom: v.boolean(),
    isStale: v.boolean(),
  })
    .index("by_envId", ["envId"])
    .index("by_stale", ["isStale"])
    .index("by_envId_klaviyoId", ["envId", "klaviyoMetricId"]),

  actionItems: defineTable({
    envId: v.string(),
    severity: v.union(
      v.literal("critical"),
      v.literal("warning"),
      v.literal("info"),
    ),
    category: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("resolved"),
      v.literal("dismissed"),
    ),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_envId", ["envId"])
    .index("by_status", ["status"])
    .index("by_severity_status", ["severity", "status"]),
});
