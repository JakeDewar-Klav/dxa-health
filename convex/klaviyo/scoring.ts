type HealthStatus = "green" | "yellow" | "red";
type AnalyticsLabel = "healthy" | "thin" | "broken" | "unknown";

export type DataFreshnessInput = {
  perMetric: {
    name: string;
    lastEventAt: number | undefined;
    count24h: number;
    count7d: number;
    count30d: number;
  }[];
};

export type AnalyticsInput = {
  rfm: AnalyticsLabel;
  channelAffinity: AnalyticsLabel;
  churnRisk: AnalyticsLabel;
};

export type FormsInput = {
  activeFormsCount: number;
  submissions7d: number;
  submissions30d: number;
};

export type FlowsCampaignsInput = {
  campaignSends30d: number;
  flowSends30d: number;
  campaignOpenRate?: number;
  campaignClickRate?: number;
  flowOpenRate?: number;
  flowClickRate?: number;
};

function statusFromScore(score: number): HealthStatus {
  if (score >= 20) return "green";
  if (score >= 10) return "yellow";
  return "red";
}

export function scoreDataFreshness(input: DataFreshnessInput): {
  score: number;
  status: HealthStatus;
} {
  if (input.perMetric.length === 0) return { score: 0, status: "red" };

  const now = Date.now();
  const DAY = 86400000;
  let totalScore = 0;

  for (const metric of input.perMetric) {
    if (!metric.lastEventAt) {
      continue;
    }
    const ageMs = now - metric.lastEventAt;
    const ageDays = ageMs / DAY;

    if (ageDays <= 1 && metric.count24h > 0) {
      totalScore += 25;
    } else if (ageDays <= 3) {
      totalScore += 18;
    } else if (ageDays <= 7) {
      totalScore += 12;
    } else if (ageDays <= 14) {
      totalScore += 5;
    }
  }

  const score = Math.min(25, Math.round(totalScore / input.perMetric.length));
  return { score, status: statusFromScore(score) };
}

export function scoreAnalyticsReadiness(input: AnalyticsInput): {
  score: number;
  status: HealthStatus;
} {
  const labels = [input.rfm, input.channelAffinity, input.churnRisk];
  let score = 0;

  for (const label of labels) {
    if (label === "healthy") score += 8;
    else if (label === "thin") score += 4;
    else if (label === "unknown") score += 2;
  }

  score = Math.min(25, score);
  return { score, status: statusFromScore(score) };
}

export function scoreFormsHealth(input: FormsInput): {
  score: number;
  status: HealthStatus;
} {
  let score = 0;

  if (input.activeFormsCount === 0) {
    return { score: 0, status: "red" };
  }

  if (input.activeFormsCount >= 3) score += 5;
  else if (input.activeFormsCount >= 1) score += 3;

  if (input.submissions30d >= 100) score += 12;
  else if (input.submissions30d >= 20) score += 8;
  else if (input.submissions30d >= 1) score += 4;

  if (input.submissions7d >= 20) score += 8;
  else if (input.submissions7d >= 5) score += 5;
  else if (input.submissions7d >= 1) score += 2;

  score = Math.min(25, score);
  return { score, status: statusFromScore(score) };
}

export function scoreFlowsCampaigns(input: FlowsCampaignsInput): {
  score: number;
  status: HealthStatus;
} {
  let score = 0;

  if (input.campaignSends30d >= 50) score += 8;
  else if (input.campaignSends30d >= 10) score += 5;
  else if (input.campaignSends30d >= 1) score += 3;

  if (input.flowSends30d >= 100) score += 8;
  else if (input.flowSends30d >= 20) score += 5;
  else if (input.flowSends30d >= 1) score += 3;

  const hasEngagement =
    input.campaignOpenRate !== undefined || input.flowOpenRate !== undefined;

  if (hasEngagement) {
    const avgOpen =
      ((input.campaignOpenRate ?? 0) + (input.flowOpenRate ?? 0)) /
      ((input.campaignOpenRate !== undefined ? 1 : 0) +
        (input.flowOpenRate !== undefined ? 1 : 0) || 1);
    const avgClick =
      ((input.campaignClickRate ?? 0) + (input.flowClickRate ?? 0)) /
      ((input.campaignClickRate !== undefined ? 1 : 0) +
        (input.flowClickRate !== undefined ? 1 : 0) || 1);

    if (avgOpen >= 0.25) score += 5;
    else if (avgOpen >= 0.15) score += 3;
    else if (avgOpen > 0) score += 1;

    if (avgClick >= 0.03) score += 4;
    else if (avgClick >= 0.015) score += 2;
    else if (avgClick > 0) score += 1;
  } else {
    if (input.campaignSends30d >= 50) score += 4;
    else if (input.campaignSends30d >= 10) score += 3;

    if (input.flowSends30d >= 100) score += 5;
    else if (input.flowSends30d >= 20) score += 4;
  }

  score = Math.min(25, score);
  return { score, status: statusFromScore(score) };
}

export function computeOverallScore(scores: {
  dataFreshness: number;
  analytics: number;
  forms: number;
  flowsCampaigns: number;
}): { score: number; status: HealthStatus } {
  const score =
    scores.dataFreshness + scores.analytics + scores.forms + scores.flowsCampaigns;
  let status: HealthStatus;
  if (score >= 75) status = "green";
  else if (score >= 40) status = "yellow";
  else status = "red";
  return { score, status };
}
