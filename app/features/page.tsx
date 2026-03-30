"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRefresh } from "@/app/refresh-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyticsBadge, StatusDot } from "@/components/health-score-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3Icon,
  UsersIcon,
  TrendingDownIcon,
  FileTextIcon,
} from "lucide-react";

type AnalyticsLabel = "healthy" | "thin" | "broken" | "unknown";

export default function FeatureHealthPage() {
  const environments = useQuery(api.environments.list);
  const { isRefreshing } = useRefresh();

  if (environments === undefined || isRefreshing) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feature Health</h1>
        <p className="text-muted-foreground">
          Check which environments meet the data thresholds for key Klaviyo features.
          Use this to answer: &quot;Which env can I use to demo X?&quot;
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <FeatureCard
          title="Channel Affinity"
          icon={<UsersIcon className="h-5 w-5" />}
          description="Predicts engagement likelihood with different marketing channels"
          requirements={[
            "2+ activated channels",
            "1,000+ profiles with delivery",
            "5,000+ campaign deliveries/channel (6mo)",
            "Engagement on each channel",
            "Paid plans for email/SMS",
          ]}
          environments={environments}
        />
        <FeatureCard
          title="RFM Analysis"
          icon={<BarChart3Icon className="h-5 w-5" />}
          description="Recency, Frequency, Monetary segmentation model"
          requirements={[
            "500+ Placed Order events (90d)",
            "Orders include monetary values",
            "100+ unique customers (90d)",
          ]}
          environments={environments}
        />
        <FeatureCard
          title="Churn Risk / Predictive"
          icon={<TrendingDownIcon className="h-5 w-5" />}
          description="Predictive analytics for CLV, churn probability, and next order date"
          requirements={[
            "Sufficient historical order data",
            "Active profile engagement",
            "Predictive models computed by Klaviyo",
          ]}
          environments={environments}
        />
        <FeatureCard
          title="Forms Reporting"
          icon={<FileTextIcon className="h-5 w-5" />}
          description="Form submission tracking and performance analytics"
          requirements={[
            "1+ active forms",
            "Recent form submissions (30d)",
            "Forms not garbage collected",
          ]}
          environments={environments}
        />
      </div>
    </div>
  );
}

type EnvironmentData = {
  _id: string;
  envId: string;
  name: string;
  platform: string;
  status: "green" | "yellow" | "red";
  analyticsScore?: number;
  formsScore?: number;
};

function FeatureCard({
  title,
  icon,
  description,
  requirements,
  environments,
}: {
  title: string;
  icon: React.ReactNode;
  description: string;
  requirements: string[];
  environments: EnvironmentData[];
}) {
  const sorted = [...environments].sort((a, b) => {
    const scoreA = title.includes("Forms") ? (a.formsScore ?? 0) : (a.analyticsScore ?? 0);
    const scoreB = title.includes("Forms") ? (b.formsScore ?? 0) : (b.analyticsScore ?? 0);
    return scoreB - scoreA;
  });

  const healthyCount = sorted.filter((e) => {
    const score = title.includes("Forms") ? (e.formsScore ?? 0) : (e.analyticsScore ?? 0);
    return score >= 20;
  }).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Badge variant={healthyCount > 0 ? "default" : "destructive"}>
            {healthyCount} ready
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Requirements
          </p>
          {requirements.map((req) => (
            <div key={req} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">&#x2022;</span>
              <span>{req}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Environment Status
          </p>
          <div className="space-y-1.5">
            {sorted.slice(0, 5).map((env) => {
              const score = title.includes("Forms")
                ? (env.formsScore ?? 0)
                : (env.analyticsScore ?? 0);
              const label: AnalyticsLabel =
                score >= 20 ? "healthy" : score >= 10 ? "thin" : "broken";
              return (
                <div
                  key={env._id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={env.status} />
                    <span>{env.name}</span>
                  </div>
                  <AnalyticsBadge label={label} />
                </div>
              );
            })}
            {environments.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{environments.length - 5} more environments
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
