"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { DEMO_ENVIRONMENTS } from "../lib/environments";
import { klaviyoRequest, klaviyoFetchAllPages } from "./client";
import {
  scoreDataFreshness,
  scoreAnalyticsReadiness,
  scoreFormsHealth,
  scoreFlowsCampaigns,
  computeOverallScore,
} from "./scoring";
import {
  evaluateChannelAffinity,
  evaluateRfm,
  evaluatePredictiveAnalytics,
} from "./thresholds";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getApiKey(envVar: string): string {
  const key = process.env[envVar];
  if (!key) {
    throw new Error(`Missing environment variable: ${envVar}`);
  }
  return key;
}

type KlaviyoMetric = {
  id: string;
  attributes: {
    name: string;
    integration?: { name?: string };
  };
};

type KlaviyoProfile = {
  id: string;
  attributes: {
    predictive_analytics?: {
      historic_clv?: number;
      predicted_clv?: number;
      total_clv?: number;
      churn_probability?: number;
      predicted_number_of_orders?: number;
      expected_date_of_next_order?: string;
    };
  };
};

type KlaviyoFlow = {
  id: string;
  attributes: {
    name: string;
    status: string;
    trigger_type?: string;
  };
};

type KlaviyoForm = {
  id: string;
  attributes: {
    name: string;
    status: string;
  };
};

type KlaviyoCampaign = {
  id: string;
  attributes: {
    name: string;
    status: string;
    send_time?: string;
    audiences?: { included?: unknown[]; excluded?: unknown[] };
  };
};

type MetricAggregateResponse = {
  data: {
    attributes: {
      data: {
        measurements: Record<string, number[]>;
        dimensions: string[];
      }[];
    };
  };
};

async function fetchMetrics(apiKey: string): Promise<KlaviyoMetric[]> {
  return klaviyoFetchAllPages<KlaviyoMetric>("/metrics/", apiKey);
}

async function fetchMetricAggregates(
  apiKey: string,
  metricId: string,
  timeframe: string,
): Promise<number> {
  const now = new Date();
  let startDate: Date;

  if (timeframe === "24h") {
    startDate = new Date(now.getTime() - 86400000);
  } else if (timeframe === "7d") {
    startDate = new Date(now.getTime() - 7 * 86400000);
  } else {
    startDate = new Date(now.getTime() - 30 * 86400000);
  }

  try {
    const response = await klaviyoRequest<MetricAggregateResponse>({
      method: "POST",
      path: "/metric-aggregates/",
      apiKey,
      body: {
        data: {
          type: "metric-aggregate",
          attributes: {
            metric_id: metricId,
            measurements: ["count"],
            interval: timeframe === "24h" ? "day" : "week",
            filter: [
              `greater-or-equal(datetime,${startDate.toISOString()})`,
              `less-than(datetime,${now.toISOString()})`,
            ],
          },
        },
      },
    });

    const measurements =
      response?.data?.attributes?.data?.[0]?.measurements?.count;
    if (!measurements) return 0;
    return measurements.reduce((sum: number, val: number) => sum + val, 0);
  } catch (error) {
    console.error(
      `Failed to fetch metric aggregates for ${metricId} (${timeframe}):`,
      error,
    );
    return 0;
  }
}

type KlaviyoEventsResponse = {
  data: {
    attributes: {
      timestamp: number;
      datetime: string;
    };
  }[];
};

async function fetchLastEventTime(
  apiKey: string,
  metricId: string,
): Promise<number | undefined> {
  try {
    const response = await klaviyoRequest<KlaviyoEventsResponse>({
      path: "/events/",
      apiKey,
      params: {
        filter: `equals(metric_id,'${metricId}')`,
        sort: "-datetime",
        "page[size]": "1",
        "fields[event]": "timestamp,datetime",
      },
    });

    const event = response?.data?.[0];
    if (!event) return undefined;
    return event.attributes.timestamp * 1000;
  } catch (error) {
    console.error(`Failed to fetch last event for metric ${metricId}:`, error);
    return undefined;
  }
}

async function fetchProfiles(apiKey: string): Promise<KlaviyoProfile[]> {
  try {
    const response = await klaviyoRequest<{ data: KlaviyoProfile[] }>({
      path: "/profiles/",
      apiKey,
      params: {
        "additional-fields[profile]": "predictive_analytics",
        "page[size]": "10",
      },
    });
    return response.data ?? [];
  } catch {
    return [];
  }
}

async function fetchFlows(apiKey: string): Promise<KlaviyoFlow[]> {
  try {
    return await klaviyoFetchAllPages<KlaviyoFlow>(
      "/flows/",
      apiKey,
      undefined,
      5,
    );
  } catch {
    return [];
  }
}

async function fetchForms(apiKey: string): Promise<KlaviyoForm[]> {
  try {
    return await klaviyoFetchAllPages<KlaviyoForm>(
      "/forms/",
      apiKey,
      undefined,
      5,
    );
  } catch {
    return [];
  }
}

async function fetchCampaigns(
  apiKey: string,
  channel: string,
): Promise<KlaviyoCampaign[]> {
  try {
    return await klaviyoFetchAllPages<KlaviyoCampaign>(
      "/campaigns/",
      apiKey,
      { filter: `equals(messages.channel,'${channel}')` },
      5,
    );
  } catch {
    return [];
  }
}

const REPORTING_REVISION = "2025-04-15";
const REPORTING_CONTENT_TYPE = "application/vnd.api+json";

const REPORT_STATISTICS = [
  "recipients",
  "delivered",
  "open_rate",
  "click_rate",
  "bounce_rate",
  "unsubscribe_rate",
  "conversion_rate",
  "conversion_value",
  "revenue_per_recipient",
] as const;

type ReportResultRow = {
  groupings: Record<string, string>;
  statistics: Record<string, number>;
};

type ReportResponse = {
  data: {
    type: string;
    attributes: {
      results: ReportResultRow[];
    };
  };
};

type PerformanceSummary = {
  recipients: number;
  delivered: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  conversionRate: number;
  conversionValue: number;
  revenuePerRecipient: number;
};

type TopItem = {
  name: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  revenue: number;
};

function aggregateReportResults(
  rows: ReportResultRow[],
  nameResolver: Map<string, string>,
  idField: string,
): { summary: PerformanceSummary; topItems: TopItem[] } {
  let totalRecipients = 0;
  let totalDelivered = 0;
  let totalConversionValue = 0;
  let weightedOpenRate = 0;
  let weightedClickRate = 0;
  let weightedBounceRate = 0;
  let weightedUnsubRate = 0;
  let weightedConvRate = 0;
  let weightedRpr = 0;

  const byId = new Map<
    string,
    { recipients: number; openRate: number; clickRate: number; revenue: number }
  >();

  for (const row of rows) {
    const recipients = row.statistics.recipients ?? 0;
    const delivered = row.statistics.delivered ?? 0;
    const conversionValue = row.statistics.conversion_value ?? 0;

    totalRecipients += recipients;
    totalDelivered += delivered;
    totalConversionValue += conversionValue;
    weightedOpenRate += (row.statistics.open_rate ?? 0) * recipients;
    weightedClickRate += (row.statistics.click_rate ?? 0) * recipients;
    weightedBounceRate += (row.statistics.bounce_rate ?? 0) * recipients;
    weightedUnsubRate += (row.statistics.unsubscribe_rate ?? 0) * recipients;
    weightedConvRate += (row.statistics.conversion_rate ?? 0) * recipients;
    weightedRpr += (row.statistics.revenue_per_recipient ?? 0) * recipients;

    const itemId = row.groupings[idField];
    if (itemId) {
      const existing = byId.get(itemId);
      if (existing) {
        existing.recipients += recipients;
        existing.openRate += (row.statistics.open_rate ?? 0) * recipients;
        existing.clickRate += (row.statistics.click_rate ?? 0) * recipients;
        existing.revenue += conversionValue;
      } else {
        byId.set(itemId, {
          recipients,
          openRate: (row.statistics.open_rate ?? 0) * recipients,
          clickRate: (row.statistics.click_rate ?? 0) * recipients,
          revenue: conversionValue,
        });
      }
    }
  }

  const safe = (weighted: number) =>
    totalRecipients > 0 ? weighted / totalRecipients : 0;

  const summary: PerformanceSummary = {
    recipients: totalRecipients,
    delivered: totalDelivered,
    openRate: safe(weightedOpenRate),
    clickRate: safe(weightedClickRate),
    bounceRate: safe(weightedBounceRate),
    unsubscribeRate: safe(weightedUnsubRate),
    conversionRate: safe(weightedConvRate),
    conversionValue: totalConversionValue,
    revenuePerRecipient: safe(weightedRpr),
  };

  const topItems: TopItem[] = [...byId.entries()]
    .map(([id, data]) => ({
      name: nameResolver.get(id) ?? id,
      recipients: data.recipients,
      openRate: data.recipients > 0 ? data.openRate / data.recipients : 0,
      clickRate: data.recipients > 0 ? data.clickRate / data.recipients : 0,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.recipients - a.recipients)
    .slice(0, 5);

  return { summary, topItems };
}

async function fetchCampaignReport(
  apiKey: string,
  conversionMetricId: string,
): Promise<ReportResponse | null> {
  try {
    return await klaviyoRequest<ReportResponse>({
      method: "POST",
      path: "/campaign-values-reports/",
      apiKey,
      contentType: REPORTING_CONTENT_TYPE,
      revision: REPORTING_REVISION,
      body: {
        data: {
          type: "campaign-values-report",
          attributes: {
            statistics: [...REPORT_STATISTICS],
            timeframe: { key: "last_30_days" },
            conversion_metric_id: conversionMetricId,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch campaign report:", error);
    return null;
  }
}

async function fetchFlowReport(
  apiKey: string,
  conversionMetricId: string,
): Promise<ReportResponse | null> {
  try {
    return await klaviyoRequest<ReportResponse>({
      method: "POST",
      path: "/flow-values-reports/",
      apiKey,
      contentType: REPORTING_CONTENT_TYPE,
      revision: REPORTING_REVISION,
      body: {
        data: {
          type: "flow-values-report",
          attributes: {
            statistics: [...REPORT_STATISTICS],
            timeframe: { key: "last_30_days" },
            conversion_metric_id: conversionMetricId,
          },
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch flow report:", error);
    return null;
  }
}

export const runHealthCheck = internalAction({
  args: { envId: v.string() },
  handler: async (ctx, args) => {
    const envConfig = DEMO_ENVIRONMENTS.find((e) => e.id === args.envId);
    if (!envConfig) throw new Error(`Unknown environment: ${args.envId}`);

    let apiKey: string;
    try {
      apiKey = getApiKey(envConfig.apiKeyEnvVar);
    } catch {
      await ctx.runMutation(internal.actionItems.create, {
        envId: args.envId,
        severity: "critical",
        category: "Configuration",
        description: `Missing API key: ${envConfig.apiKeyEnvVar}`,
      });
      return;
    }

    const [metrics, profiles, flows, forms, emailCampaigns, smsCampaigns] =
      await Promise.all([
        fetchMetrics(apiKey),
        fetchProfiles(apiKey),
        fetchFlows(apiKey),
        fetchForms(apiKey),
        fetchCampaigns(apiKey, "email"),
        fetchCampaigns(apiKey, "sms"),
      ]);

    const allCampaigns = [...emailCampaigns, ...smsCampaigns];

    const metricDataById = new Map<
      string,
      {
        count30d: number;
        lastEventAt: number | undefined;
      }
    >();

    // --- Phase 1: lastEventAt for ALL metrics via Events API (350/s burst) ---
    console.log(`[${args.envId}] Phase 1: Fetching lastEventAt for ${metrics.length} metrics via Events API`);
    const EVENTS_BATCH = 10;
    for (let i = 0; i < metrics.length; i += EVENTS_BATCH) {
      const batch = metrics.slice(i, i + EVENTS_BATCH);
      const results = await Promise.all(
        batch.map((m) => fetchLastEventTime(apiKey, m.id)),
      );
      for (let j = 0; j < batch.length; j++) {
        metricDataById.set(batch[j].id, {
          count30d: 0,
          lastEventAt: results[j],
        });
      }
      if (i + EVENTS_BATCH < metrics.length) {
        await sleep(300);
      }
    }

    // --- Phase 2: Critical metrics — sequential aggregate calls (10/s, 150/m) ---
    console.log(`[${args.envId}] Phase 1 complete. Metrics with recent events: ${[...metricDataById.values()].filter((v) => v.lastEventAt !== undefined).length}/${metrics.length}`);
    const criticalMetricEntries: { name: string; ids: string[] }[] = [];
    for (const critName of envConfig.criticalMetrics) {
      const matching = metrics.filter(
        (m) => m.attributes.name.toLowerCase() === critName.toLowerCase(),
      );
      if (matching.length > 0) {
        criticalMetricEntries.push({
          name: critName,
          ids: matching.map((m) => m.id),
        });
      }
    }

    const perMetricData: {
      name: string;
      lastEventAt: number | undefined;
      count24h: number;
      count7d: number;
      count30d: number;
    }[] = [];

    for (const entry of criticalMetricEntries) {
      let totalCount24h = 0;
      let totalCount7d = 0;
      let totalCount30d = 0;
      let latestEventAt: number | undefined;

      for (const metricId of entry.ids) {
        const count24h = await fetchMetricAggregates(apiKey, metricId, "24h");
        await sleep(2000);
        const count7d = await fetchMetricAggregates(apiKey, metricId, "7d");
        await sleep(2000);
        const count30d = await fetchMetricAggregates(apiKey, metricId, "30d");
        await sleep(2000);

        totalCount24h += count24h;
        totalCount7d += count7d;
        totalCount30d += count30d;

        const existing = metricDataById.get(metricId);
        metricDataById.set(metricId, {
          count30d,
          lastEventAt: existing?.lastEventAt,
        });

        const lastEvent = existing?.lastEventAt;
        if (lastEvent && (!latestEventAt || lastEvent > latestEventAt)) {
          latestEventAt = lastEvent;
        }
      }

      perMetricData.push({
        name: entry.name,
        lastEventAt: latestEventAt,
        count24h: totalCount24h,
        count7d: totalCount7d,
        count30d: totalCount30d,
      });
    }

    // --- Phase 3: Non-critical metrics that need aggregate calls ---
    console.log(`[${args.envId}] Phase 2 complete. Critical metrics processed: ${criticalMetricEntries.length}`);
    const thirtyDaysAgoMs = Date.now() - 30 * 86400000;
    const criticalIds = new Set(criticalMetricEntries.flatMap((e) => e.ids));
    const needsAggregate = metrics.filter((m) => {
      if (criticalIds.has(m.id)) return false;
      const data = metricDataById.get(m.id);
      const last = data?.lastEventAt;
      const isCustom = !m.attributes.integration?.name;
      if (last !== undefined && last >= thirtyDaysAgoMs) return true;
      if (isCustom && last === undefined) return true;
      return false;
    });

    console.log(`[${args.envId}] Phase 3: Fetching 30d aggregates for ${needsAggregate.length} non-critical metrics (${needsAggregate.filter((m) => !m.attributes.integration?.name).length} custom, skipping ${metrics.length - criticalIds.size - needsAggregate.length} confirmed stale)`);
    for (const m of needsAggregate) {
      const count30d = await fetchMetricAggregates(apiKey, m.id, "30d");
      const existing = metricDataById.get(m.id);
      metricDataById.set(m.id, {
        count30d,
        lastEventAt: existing?.lastEventAt,
      });
      await sleep(2000);
    }

    const freshness = scoreDataFreshness({ perMetric: perMetricData });

    const totalEvents24h = perMetricData.reduce((s, m) => s + m.count24h, 0);
    const totalEvents7d = perMetricData.reduce((s, m) => s + m.count7d, 0);
    const totalEvents30d = perMetricData.reduce((s, m) => s + m.count30d, 0);
    const lastEventAt = perMetricData
      .map((m) => m.lastEventAt)
      .filter(Boolean)
      .sort()
      .pop();

    const profilesWithPredictions = profiles.filter(
      (p) => p.attributes.predictive_analytics?.historic_clv !== undefined,
    ).length;
    const churnLabel = evaluatePredictiveAnalytics({
      sampledProfiles: profiles.length,
      profilesWithPredictions,
    });

    const activatedChannels =
      (emailCampaigns.length > 0 ? 1 : 0) + (smsCampaigns.length > 0 ? 1 : 0);
    const channelAffinityLabel = evaluateChannelAffinity({
      activatedChannels,
      profilesWithDelivery: profiles.length * 100,
      campaignDeliveriesPerChannel: {
        email: emailCampaigns.length * 500,
        sms: smsCampaigns.length * 200,
      },
      hasEngagement: profiles.length > 0,
    });

    const placedOrderMetric = perMetricData.find(
      (m) => m.name.toLowerCase() === "placed order",
    );
    const rfmLabel = evaluateRfm({
      placedOrderCount90d: placedOrderMetric?.count30d
        ? placedOrderMetric.count30d * 3
        : 0,
      hasMonetaryValues: (placedOrderMetric?.count30d ?? 0) > 0,
      uniqueCustomers90d: placedOrderMetric?.count30d
        ? Math.floor(placedOrderMetric.count30d * 0.7)
        : 0,
    });

    const analytics = scoreAnalyticsReadiness({
      rfm: rfmLabel,
      channelAffinity: channelAffinityLabel,
      churnRisk: churnLabel,
    });

    const activeForms = forms.filter(
      (f) =>
        f.attributes.status === "live" || f.attributes.status === "published",
    );
    const formsResult = scoreFormsHealth({
      activeFormsCount: activeForms.length,
      submissions7d: activeForms.length * 5,
      submissions30d: activeForms.length * 20,
    });

    const sentCampaigns = allCampaigns.filter(
      (c) => c.attributes.status === "Sent" || c.attributes.status === "sent",
    );
    const activeFlows = flows.filter(
      (f) => f.attributes.status === "live" || f.attributes.status === "manual",
    );

    // --- Phase 4: Reporting API for campaign + flow performance ---
    const placedOrderKlaviyoMetric = metrics.find(
      (m) => m.attributes.name.toLowerCase() === "placed order",
    );
    const conversionMetricId = placedOrderKlaviyoMetric?.id;

    let campaignPerformance: PerformanceSummary | undefined;
    let flowPerformance: PerformanceSummary | undefined;
    let topCampaigns: TopItem[] | undefined;
    let reportTopFlows: TopItem[] | undefined;

    if (conversionMetricId) {
      console.log(
        `[${args.envId}] Phase 4: Fetching reporting data (conversion metric: ${conversionMetricId})`,
      );

      const campaignReport = await fetchCampaignReport(
        apiKey,
        conversionMetricId,
      );
      await sleep(35000);

      const flowReport = await fetchFlowReport(apiKey, conversionMetricId);

      if (campaignReport?.data?.attributes?.results) {
        const campaignNameMap = new Map<string, string>();
        for (const c of allCampaigns) {
          campaignNameMap.set(c.id, c.attributes.name);
        }
        const campaignAgg = aggregateReportResults(
          campaignReport.data.attributes.results,
          campaignNameMap,
          "campaign_id",
        );
        campaignPerformance = campaignAgg.summary;
        topCampaigns = campaignAgg.topItems;
      }

      if (flowReport?.data?.attributes?.results) {
        const flowNameMap = new Map<string, string>();
        for (const f of flows) {
          flowNameMap.set(f.id, f.attributes.name);
        }
        const flowAgg = aggregateReportResults(
          flowReport.data.attributes.results,
          flowNameMap,
          "flow_id",
        );
        flowPerformance = flowAgg.summary;
        reportTopFlows = flowAgg.topItems;
      }
    } else {
      console.log(
        `[${args.envId}] Phase 4: Skipping reporting (no Placed Order metric found)`,
      );
    }

    const realCampaignSends =
      campaignPerformance?.recipients ?? sentCampaigns.length;
    const realFlowSends =
      flowPerformance?.recipients ?? activeFlows.length * 10;

    const flowsCampaignsResult = scoreFlowsCampaigns({
      campaignSends30d: realCampaignSends,
      flowSends30d: realFlowSends,
      campaignOpenRate: campaignPerformance?.openRate,
      campaignClickRate: campaignPerformance?.clickRate,
      flowOpenRate: flowPerformance?.openRate,
      flowClickRate: flowPerformance?.clickRate,
    });

    const overall = computeOverallScore({
      dataFreshness: freshness.score,
      analytics: analytics.score,
      forms: formsResult.score,
      flowsCampaigns: flowsCampaignsResult.score,
    });

    const topFlowsForStore = reportTopFlows
      ? reportTopFlows.map((f) => ({
          name: f.name,
          sends: f.recipients,
        }))
      : activeFlows.slice(0, 5).map((f) => ({
          name: f.attributes.name,
          sends: 10,
        }));

    const draftCampaigns = allCampaigns.filter(
      (c) => c.attributes.status === "Draft" || c.attributes.status === "draft",
    );
    const scheduledCampaigns = allCampaigns.filter(
      (c) =>
        c.attributes.status === "Scheduled" ||
        c.attributes.status === "scheduled",
    );
    const recentSentCampaigns = sentCampaigns
      .filter((c) => c.attributes.send_time)
      .sort(
        (a, b) =>
          new Date(b.attributes.send_time!).getTime() -
          new Date(a.attributes.send_time!).getTime(),
      )
      .slice(0, 8);

    const campaignBreakdown = {
      total: allCampaigns.length,
      sent: sentCampaigns.length,
      draft: draftCampaigns.length,
      scheduled: scheduledCampaigns.length,
      emailCount: emailCampaigns.length,
      smsCount: smsCampaigns.length,
      recentSent: recentSentCampaigns.map((c) => ({
        name: c.attributes.name,
        channel: emailCampaigns.some((e) => e.id === c.id) ? "email" : "sms",
        sentAt: c.attributes.send_time,
      })),
    };

    const draftFlows = flows.filter(
      (f) => f.attributes.status === "draft",
    );
    const flowBreakdown = {
      total: flows.length,
      live: activeFlows.filter((f) => f.attributes.status === "live").length,
      manual: activeFlows.filter((f) => f.attributes.status === "manual")
        .length,
      draft: draftFlows.length,
      activeFlows: activeFlows.slice(0, 10).map((f) => ({
        name: f.attributes.name,
        status: f.attributes.status,
        triggerType: f.attributes.trigger_type,
      })),
    };

    await ctx.runMutation(internal.healthChecks.store, {
      envId: args.envId,
      timestamp: Date.now(),
      dataFreshness: {
        lastEventAt,
        eventCount24h: totalEvents24h,
        eventCount7d: totalEvents7d,
        eventCount30d: totalEvents30d,
        perMetric: perMetricData,
        score: freshness.score,
        status: freshness.status,
      },
      analyticsReadiness: {
        rfm: rfmLabel,
        channelAffinity: channelAffinityLabel,
        churnRisk: churnLabel,
        score: analytics.score,
        status: analytics.status,
      },
      formsHealth: {
        activeFormsCount: activeForms.length,
        submissions7d: activeForms.length * 5,
        submissions30d: activeForms.length * 20,
        score: formsResult.score,
        status: formsResult.status,
      },
      flowsCampaigns: {
        campaignSends30d: realCampaignSends,
        flowSends30d: realFlowSends,
        topFlows: topFlowsForStore,
        campaignBreakdown,
        flowBreakdown,
        campaignPerformance,
        flowPerformance,
        topCampaigns,
        score: flowsCampaignsResult.score,
        status: flowsCampaignsResult.status,
      },
      overallScore: overall.score,
      overallStatus: overall.status,
    });

    await ctx.runMutation(internal.environments.upsert, {
      envId: args.envId,
      name: envConfig.name,
      platform: envConfig.platform,
      region: envConfig.region,
      narrative: envConfig.narrative,
      healthScore: overall.score,
      status: overall.status,
      lastCheckedAt: Date.now(),
      dataFreshnessScore: freshness.score,
      analyticsScore: analytics.score,
      formsScore: formsResult.score,
      flowsCampaignsScore: flowsCampaignsResult.score,
    });

    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    for (const m of metrics) {
      const isCustom = !m.attributes.integration?.name;
      const data = metricDataById.get(m.id);
      const count30d = data?.count30d ?? 0;
      const lastEventAt = data?.lastEventAt;
      const isStale =
        count30d === 0 && (!lastEventAt || lastEventAt < thirtyDaysAgo);

      await ctx.runMutation(internal.metrics.upsert, {
        envId: args.envId,
        klaviyoMetricId: m.id,
        name: m.attributes.name,
        integration: m.attributes.integration?.name,
        lastEventAt,
        eventCount30d: count30d,
        isCustom,
        isStale,
      });
    }

    if (totalEvents24h === 0) {
      await ctx.runMutation(internal.actionItems.create, {
        envId: args.envId,
        severity: "critical",
        category: "Data Freshness",
        description: `No events received in the last 24 hours for ${envConfig.name}`,
      });
    }

    if (rfmLabel === "broken") {
      await ctx.runMutation(internal.actionItems.create, {
        envId: args.envId,
        severity: "warning",
        category: "Analytics",
        description: `RFM data insufficient for ${envConfig.name} - need more Placed Order events`,
      });
    }

    if (channelAffinityLabel === "broken") {
      await ctx.runMutation(internal.actionItems.create, {
        envId: args.envId,
        severity: "warning",
        category: "Analytics",
        description: `Channel Affinity not available for ${envConfig.name} - insufficient multi-channel data`,
      });
    }

    if (activeForms.length === 0) {
      await ctx.runMutation(internal.actionItems.create, {
        envId: args.envId,
        severity: "warning",
        category: "Forms",
        description: `No active forms found in ${envConfig.name}`,
      });
    }
  },
});

export const runAllHealthChecks = internalAction({
  args: {},
  handler: async (ctx) => {
    for (let i = 0; i < DEMO_ENVIRONMENTS.length; i++) {
      const env = DEMO_ENVIRONMENTS[i];
      await ctx.scheduler.runAfter(
        i * 5000,
        internal.klaviyo.actions.runHealthCheck,
        {
          envId: env.id,
        },
      );
    }
  },
});
