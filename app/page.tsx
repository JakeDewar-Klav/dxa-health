"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRefresh } from "@/app/refresh-context";
import { EnvironmentCard } from "@/components/environment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  DollarSignIcon,
  EyeIcon,
  MailIcon,
  MousePointerClickIcon,
  RefreshCwIcon,
  SendIcon,
  ZapIcon,
} from "lucide-react";

export default function DashboardOverview() {
  const environments = useQuery(api.environments.list);
  const actionItems = useQuery(api.actionItems.list, { status: "open" });
  const aggregatePerf = useQuery(api.healthChecks.getAggregatePerformance);
  const seedEnvs = useMutation(api.environments.seed);
  const { isRefreshing } = useRefresh();
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (environments === undefined || isRefreshing) {
    return <DashboardSkeleton />;
  }

  if (environments.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Welcome to DXA Health Monitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No environments have been configured yet. Seed the database with
              the demo environments to get started.
            </p>
            <Button onClick={() => seedEnvs()}>
              Seed Demo Environments
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const platforms = [...new Set(environments.map((e) => e.platform))];
  const filtered = environments.filter((e) => {
    if (platformFilter !== "all" && e.platform !== platformFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  const greenCount = environments.filter((e) => e.status === "green").length;
  const yellowCount = environments.filter((e) => e.status === "yellow").length;
  const redCount = environments.filter((e) => e.status === "red").length;
  const urgentItems = actionItems?.filter((a) => a.severity === "critical").slice(0, 3) ?? [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Monitor the health of all {environments.length} Klaviyo demo environments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{greenCount}</div>
            <p className="text-xs text-muted-foreground">environments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warning</CardTitle>
            <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{yellowCount}</div>
            <p className="text-xs text-muted-foreground">environments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircleIcon className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{redCount}</div>
            <p className="text-xs text-muted-foreground">environments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Issues</CardTitle>
            <RefreshCwIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionItems?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground">action items</p>
          </CardContent>
        </Card>
      </div>

      {aggregatePerf && aggregatePerf.totalRecipients > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Account Performance (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <MailIcon className="h-3 w-3" />
                  <span className="text-xs">Campaign</span>
                </div>
                <p className="text-lg font-bold font-mono">
                  {aggregatePerf.totalCampaignRecipients.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <ZapIcon className="h-3 w-3" />
                  <span className="text-xs">Flow</span>
                </div>
                <p className="text-lg font-bold font-mono">
                  {aggregatePerf.totalFlowRecipients.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <SendIcon className="h-3 w-3" />
                  <span className="text-xs">Total Sends</span>
                </div>
                <p className="text-lg font-bold font-mono">
                  {aggregatePerf.totalRecipients.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <EyeIcon className="h-3 w-3" />
                  <span className="text-xs">Avg Open</span>
                </div>
                <p className="text-lg font-bold font-mono">
                  {aggregatePerf.avgOpenRate > 0
                    ? `${(aggregatePerf.avgOpenRate * 100).toFixed(1)}%`
                    : "--"}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <MousePointerClickIcon className="h-3 w-3" />
                  <span className="text-xs">Avg Click</span>
                </div>
                <p className="text-lg font-bold font-mono">
                  {aggregatePerf.avgClickRate > 0
                    ? `${(aggregatePerf.avgClickRate * 100).toFixed(1)}%`
                    : "--"}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                  <DollarSignIcon className="h-3 w-3" />
                  <span className="text-xs">Revenue</span>
                </div>
                <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {aggregatePerf.totalRevenue > 0
                    ? aggregatePerf.totalRevenue >= 1000
                      ? `$${(aggregatePerf.totalRevenue / 1000).toFixed(1)}K`
                      : `$${aggregatePerf.totalRevenue.toFixed(2)}`
                    : "--"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {urgentItems.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Urgent Action Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentItems.map((item) => (
              <div
                key={item._id}
                className="flex items-center gap-2 text-sm"
              >
                <AlertCircleIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="text-muted-foreground">{item.description}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Platforms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="green">Healthy</SelectItem>
            <SelectItem value="yellow">Warning</SelectItem>
            <SelectItem value="red">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto">
          {filtered.length} of {environments.length} environments
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((env) => (
          <EnvironmentCard
            key={env._id}
            envId={env.envId}
            name={env.name}
            platform={env.platform}
            region={env.region}
            narrative={env.narrative}
            healthScore={env.healthScore}
            status={env.status}
            dataFreshnessScore={env.dataFreshnessScore}
            analyticsScore={env.analyticsScore}
            formsScore={env.formsScore}
            flowsCampaignsScore={env.flowsCampaignsScore}
            lastCheckedAt={env.lastCheckedAt}
          />
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 mt-2" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
