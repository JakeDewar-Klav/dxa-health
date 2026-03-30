type AnalyticsLabel = "healthy" | "thin" | "broken" | "unknown";

export type ChannelAffinityData = {
  activatedChannels: number;
  profilesWithDelivery: number;
  campaignDeliveriesPerChannel: Record<string, number>;
  hasEngagement: boolean;
};

export type RfmData = {
  placedOrderCount90d: number;
  hasMonetaryValues: boolean;
  uniqueCustomers90d: number;
};

export type PredictiveData = {
  sampledProfiles: number;
  profilesWithPredictions: number;
};

export function evaluateChannelAffinity(data: ChannelAffinityData): AnalyticsLabel {
  if (data.activatedChannels < 2) return "broken";

  const channelDeliveries = Object.values(data.campaignDeliveriesPerChannel);
  const channelsWithSufficientDeliveries = channelDeliveries.filter(
    (d) => d >= 5000
  ).length;
  const channelsWithSomeDeliveries = channelDeliveries.filter(
    (d) => d >= 1000
  ).length;

  if (data.profilesWithDelivery < 1000) {
    return data.profilesWithDelivery >= 500 ? "thin" : "broken";
  }

  if (channelsWithSufficientDeliveries >= 2 && data.hasEngagement) {
    return "healthy";
  }

  if (channelsWithSomeDeliveries >= 2) {
    return "thin";
  }

  return "broken";
}

export function evaluateRfm(data: RfmData): AnalyticsLabel {
  if (data.placedOrderCount90d === 0) return "broken";

  if (!data.hasMonetaryValues) return "broken";

  if (data.placedOrderCount90d >= 500 && data.uniqueCustomers90d >= 100) {
    return "healthy";
  }

  if (data.placedOrderCount90d >= 100 && data.uniqueCustomers90d >= 20) {
    return "thin";
  }

  return "broken";
}

export function evaluatePredictiveAnalytics(data: PredictiveData): AnalyticsLabel {
  if (data.sampledProfiles === 0) return "unknown";

  const ratio = data.profilesWithPredictions / data.sampledProfiles;

  if (ratio >= 0.7) return "healthy";
  if (ratio >= 0.3) return "thin";
  if (ratio > 0) return "broken";

  return "broken";
}

export type FeatureThresholdResult = {
  feature: string;
  label: AnalyticsLabel;
  requirements: { name: string; met: boolean; detail: string }[];
};

export function getChannelAffinityThresholds(
  data: ChannelAffinityData
): FeatureThresholdResult {
  const requirements = [
    {
      name: "2+ activated channels",
      met: data.activatedChannels >= 2,
      detail: `${data.activatedChannels} channels activated`,
    },
    {
      name: "1,000+ profiles with delivery",
      met: data.profilesWithDelivery >= 1000,
      detail: `${data.profilesWithDelivery.toLocaleString()} profiles`,
    },
    {
      name: "5,000+ campaign deliveries per channel (6 months)",
      met:
        Object.values(data.campaignDeliveriesPerChannel).filter((d) => d >= 5000)
          .length >= 2,
      detail: Object.entries(data.campaignDeliveriesPerChannel)
        .map(([ch, count]) => `${ch}: ${count.toLocaleString()}`)
        .join(", "),
    },
    {
      name: "Engagement on each channel",
      met: data.hasEngagement,
      detail: data.hasEngagement ? "Engagement detected" : "No engagement detected",
    },
  ];

  return {
    feature: "Channel Affinity",
    label: evaluateChannelAffinity(data),
    requirements,
  };
}

export function getRfmThresholds(data: RfmData): FeatureThresholdResult {
  const requirements = [
    {
      name: "Placed Order events (90 days)",
      met: data.placedOrderCount90d >= 500,
      detail: `${data.placedOrderCount90d.toLocaleString()} orders`,
    },
    {
      name: "Orders include monetary values",
      met: data.hasMonetaryValues,
      detail: data.hasMonetaryValues ? "Values present" : "Missing monetary values",
    },
    {
      name: "100+ unique customers (90 days)",
      met: data.uniqueCustomers90d >= 100,
      detail: `${data.uniqueCustomers90d.toLocaleString()} unique customers`,
    },
  ];

  return {
    feature: "RFM",
    label: evaluateRfm(data),
    requirements,
  };
}
