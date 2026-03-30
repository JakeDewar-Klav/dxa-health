"use client";

import { use, useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRefresh } from "@/app/refresh-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  HealthScoreBadge,
  StatusDot,
  StatusLabel,
  AnalyticsBadge,
} from "@/components/health-score-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  CircleDotIcon,
  DollarSignIcon,
  EyeIcon,
  FilterIcon,
  InfoIcon,
  MailIcon,
  MessageSquareIcon,
  MinusIcon,
  MousePointerClickIcon,
  PlayIcon,
  RefreshCwIcon,
  SendIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  ZapIcon,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function EnvironmentDetailPage({
  params,
}: {
  params: Promise<{ envId: string }>;
}) {
  const { envId } = use(params);
  const environment = useQuery(api.environments.get, { envId });
  const latestCheck = useQuery(api.healthChecks.getLatest, { envId });
  const actionItems = useQuery(api.actionItems.list, { envId, status: "open" });
  const previousCheck = useQuery(api.healthChecks.getPrevious, { envId });
  const metrics = useQuery(api.metrics.listByEnv, { envId });
  const triggerHealthCheck = useMutation(api.environments.triggerHealthCheck);
  const { isRefreshing: isGlobalRefreshing } = useRefresh();
  const [staleOnly, setStaleOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (
    environment === undefined ||
    latestCheck === undefined ||
    isGlobalRefreshing
  ) {
    return <DetailSkeleton />;
  }

  if (!environment) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Environment not found</h1>
        <p className="text-muted-foreground">No environment with ID: {envId}</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="overview">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {environment.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{environment.platform}</Badge>
              <Badge variant="secondary">{environment.region}</Badge>
              <span className="text-sm text-muted-foreground">
                {environment.narrative}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={isRefreshing}
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await triggerHealthCheck({ envId });
                } finally {
                  setTimeout(() => setIsRefreshing(false), 5000);
                }
              }}
            >
              <RefreshCwIcon
                className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </Button>
            <StatusLabel status={environment.status} />
            <HealthScoreBadge
              score={environment.healthScore}
              status={environment.status}
              size="sm"
            />
          </div>
        </div>
        <TabsList variant="line" className="mt-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="overview" className="px-6 py-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            title="Total Metrics"
            value={metrics?.length ?? 0}
            limit={200}
            status={latestCheck?.dataFreshness.status}
            subtitle={
              metrics
                ? `${metrics.filter((m) => m.isStale).length} stale`
                : undefined
            }
          />
          <SummaryCard
            title="Events (24h)"
            value={latestCheck?.dataFreshness.eventCount24h ?? 0}
            status={latestCheck?.dataFreshness.status}
            previousValue={previousCheck?.dataFreshness.eventCount24h}
            subtitle={
              latestCheck
                ? `${latestCheck.dataFreshness.eventCount7d.toLocaleString()} in 7d`
                : undefined
            }
          />
          <SummaryCard
            title="Active Forms"
            value={latestCheck?.formsHealth.activeFormsCount ?? 0}
            status={latestCheck?.formsHealth.status}
            previousValue={previousCheck?.formsHealth.activeFormsCount}
            subtitle={
              latestCheck
                ? `${latestCheck.formsHealth.submissions30d.toLocaleString()} submissions (30d)`
                : undefined
            }
          />
          <SummaryCard
            title="Open Issues"
            value={actionItems?.length ?? 0}
            status={
              actionItems
                ? actionItems.length === 0
                  ? "green"
                  : actionItems.some((a) => a.severity === "critical")
                    ? "red"
                    : "yellow"
                : undefined
            }
            subtitle={
              actionItems && actionItems.length > 0
                ? `${actionItems.filter((a) => a.severity === "critical").length} critical`
                : actionItems
                  ? "All clear"
                  : undefined
            }
          />
        </div>

        {latestCheck && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Analytics Readiness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">RFM</span>
                    <AnalyticsBadge
                      label={latestCheck.analyticsReadiness.rfm}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">
                      Channel Affinity
                    </span>
                    <AnalyticsBadge
                      label={latestCheck.analyticsReadiness.channelAffinity}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm font-medium">Churn Risk</span>
                    <AnalyticsBadge
                      label={latestCheck.analyticsReadiness.churnRisk}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Forms & Acquisition
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Active Forms</span>
                  <span className="font-medium">
                    {latestCheck.formsHealth.activeFormsCount}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Submissions (7d)
                  </span>
                  <span className="font-medium">
                    {latestCheck.formsHealth.submissions7d}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Submissions (30d)
                  </span>
                  <span className="font-medium">
                    {latestCheck.formsHealth.submissions30d}
                  </span>
                </div>
              </CardContent>
            </Card>

            <CampaignFlowSection flowsCampaigns={latestCheck.flowsCampaigns} />
          </>
        )}

        {actionItems && actionItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Action Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {actionItems.map((item) => (
                <div
                  key={item._id}
                  className="flex items-start gap-3 p-3 rounded-lg border"
                >
                  {item.severity === "critical" ? (
                    <AlertCircleIcon className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  ) : item.severity === "warning" ? (
                    <AlertTriangleIcon className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <InfoIcon className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.category}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="metrics" className="px-6 pt-6">
        {metrics && metrics.length > 0 && (
          <AllMetricsSection
            envId={envId}
            metrics={metrics}
            dataFreshness={latestCheck?.dataFreshness ?? null}
            staleOnly={staleOnly}
            onToggleStale={() => setStaleOnly(!staleOnly)}
          />
        )}
      </TabsContent>
    </Tabs>
  );
}

function DeltaBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;

  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <MinusIcon className="h-3 w-3" />
        0%
      </span>
    );
  }

  const pct = previous !== 0 ? Math.round((diff / previous) * 100) : null;
  const isUp = diff > 0;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isUp
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isUp ? (
        <TrendingUpIcon className="h-3 w-3" />
      ) : (
        <TrendingDownIcon className="h-3 w-3" />
      )}
      {pct !== null ? `${isUp ? "+" : ""}${pct}%` : `+${current}`}
    </span>
  );
}

function SummaryCard({
  title,
  value,
  limit,
  status,
  subtitle,
  previousValue,
}: {
  title: string;
  value: number;
  limit?: number;
  status?: "green" | "yellow" | "red";
  subtitle?: string;
  previousValue?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {status && <StatusDot status={status} />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">
            {value.toLocaleString()}
            {limit !== undefined && (
              <span className="text-sm text-muted-foreground font-normal">
                /{limit}
              </span>
            )}
          </span>
          {previousValue !== undefined && (
            <DeltaBadge current={value} previous={previousValue} />
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {limit !== undefined && (
          <Progress
            value={Math.min((value / limit) * 100, 100)}
            className="mt-2 h-1.5"
          />
        )}
      </CardContent>
    </Card>
  );
}

type SortKey =
  | "name"
  | "integration"
  | "eventCount24h"
  | "eventCount7d"
  | "eventCount30d"
  | "lastEventAt"
  | "status";
type SortDir = "asc" | "desc";

type Metric = {
  _id: string;
  envId: string;
  klaviyoMetricId: string;
  name: string;
  integration?: string;
  lastEventAt?: number;
  eventCount30d: number;
  isCustom: boolean;
  isStale: boolean;
};

type EnrichedMetric = Metric & {
  eventCount24h: number;
  eventCount7d: number;
};

type DataFreshness = {
  status: "green" | "yellow" | "red";
  eventCount24h: number;
  eventCount7d: number;
  eventCount30d: number;
  perMetric: Array<{
    name: string;
    count24h: number;
    count7d: number;
    count30d: number;
  }>;
};

function compareMetrics(
  a: EnrichedMetric,
  b: EnrichedMetric,
  key: SortKey,
  dir: SortDir,
): number {
  let cmp = 0;
  switch (key) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      break;
    case "integration":
      cmp = (a.integration ?? "Custom").localeCompare(
        b.integration ?? "Custom",
      );
      break;
    case "eventCount24h":
      cmp = a.eventCount24h - b.eventCount24h;
      break;
    case "eventCount7d":
      cmp = a.eventCount7d - b.eventCount7d;
      break;
    case "eventCount30d":
      cmp = a.eventCount30d - b.eventCount30d;
      break;
    case "lastEventAt":
      cmp = (a.lastEventAt ?? 0) - (b.lastEventAt ?? 0);
      break;
    case "status":
      cmp = Number(a.isStale) - Number(b.isStale);
      break;
  }
  return dir === "desc" ? -cmp : cmp;
}

function SortableHead({
  label,
  sortKey,
  activeSortKey,
  activeSortDir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  activeSortDir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sortKey === activeSortKey;
  return (
    <TableHead
      className={`cursor-pointer select-none hover:text-foreground transition-colors ${className ?? ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          activeSortDir === "asc" ? (
            <ArrowUpIcon className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownIcon className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDownIcon className="h-3.5 w-3.5 opacity-30" />
        )}
      </span>
    </TableHead>
  );
}

function AllMetricsSection({
  envId,
  metrics,
  dataFreshness,
  staleOnly,
  onToggleStale,
}: {
  envId: string;
  metrics: Metric[];
  dataFreshness: DataFreshness | null;
  staleOnly: boolean;
  onToggleStale: () => void;
}) {
  const removeMetric = useMutation(api.metrics.remove);

  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<string | null>(
    null,
  );
  const [singleDeleting, setSingleDeleting] = useState<string | null>(null);
  const [integrationFilter, setIntegrationFilter] = useState<string>("all");

  const enrichedMetrics = useMemo<EnrichedMetric[]>(() => {
    if (!dataFreshness) {
      return metrics.map((m) => ({ ...m, eventCount24h: 0, eventCount7d: 0 }));
    }
    const freshnessMap = new Map<
      string,
      { count24h: number; count7d: number }
    >();
    for (const pm of dataFreshness.perMetric) {
      freshnessMap.set(pm.name.toLowerCase(), {
        count24h: pm.count24h,
        count7d: pm.count7d,
      });
    }
    return metrics.map((m) => {
      const f = freshnessMap.get(m.name.toLowerCase());
      return {
        ...m,
        eventCount24h: f?.count24h ?? 0,
        eventCount7d: f?.count7d ?? 0,
      };
    });
  }, [metrics, dataFreshness]);

  const integrationOptions = useMemo(() => {
    const values = new Set(metrics.map((m) => m.integration ?? "Custom"));
    return [...values].sort();
  }, [metrics]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filtered = enrichedMetrics.filter((m) => {
    if (staleOnly && !m.isStale) return false;
    if (
      integrationFilter !== "all" &&
      (m.integration ?? "Custom") !== integrationFilter
    )
      return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) =>
    compareMetrics(a, b, sortKey, sortDir),
  );
  const staleCount = enrichedMetrics.filter((m) => m.isStale).length;

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((m) => m._id)));
    }
  }

  async function handleDeleteSelected() {
    setDeleting(true);
    try {
      for (const id of selected) {
        await removeMetric({ id: id as Id<"metrics"> });
      }
      setSelected(new Set());
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  async function handleSingleDelete() {
    if (!singleDeleteTarget) return;
    setSingleDeleting(singleDeleteTarget);
    setSingleDeleteTarget(null);
    try {
      await removeMetric({ id: singleDeleteTarget as Id<"metrics"> });
    } finally {
      setSingleDeleting(null);
    }
  }

  const headProps = {
    activeSortKey: sortKey,
    activeSortDir: sortDir,
    onSort: handleSort,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">All Metrics</CardTitle>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {metrics.length} total &middot;{" "}
            <span
              className={
                staleCount > 0 ? "text-amber-600 dark:text-amber-400" : ""
              }
            >
              {staleCount} stale
            </span>
            {dataFreshness && (
              <>
                {" "}
                &middot; Events: {dataFreshness.eventCount24h.toLocaleString()}{" "}
                (24h) &middot; {dataFreshness.eventCount7d.toLocaleString()}{" "}
                (7d) &middot; {dataFreshness.eventCount30d.toLocaleString()}{" "}
                (30d)
              </>
            )}
          </span>
          {selected.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon className="h-3.5 w-3.5 mr-1" />
              Delete {selected.size} Selected
            </Button>
          )}
          <Select
            value={integrationFilter}
            onValueChange={(v) => setIntegrationFilter(v ?? "all")}
          >
            <SelectTrigger size="sm">
              <FilterIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Integrations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Integrations</SelectItem>
              {integrationOptions.map((int) => (
                <SelectItem key={int} value={int}>
                  {int}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={staleOnly ? "default" : "outline"}
            size="sm"
            onClick={onToggleStale}
          >
            <FilterIcon className="h-3.5 w-3.5 mr-1" />
            Stale Only
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      filtered.length > 0 && selected.size === filtered.length
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <SortableHead
                  label="Metric Name"
                  sortKey="name"
                  {...headProps}
                />
                <SortableHead
                  label="Integration"
                  sortKey="integration"
                  {...headProps}
                />
                <SortableHead
                  label="24h"
                  sortKey="eventCount24h"
                  className="text-center"
                  {...headProps}
                />
                <SortableHead
                  label="7d"
                  sortKey="eventCount7d"
                  className="text-center"
                  {...headProps}
                />
                <SortableHead
                  label="30d"
                  sortKey="eventCount30d"
                  className="text-center"
                  {...headProps}
                />
                <SortableHead
                  label="Last Event"
                  sortKey="lastEventAt"
                  {...headProps}
                />
                <SortableHead label="Status" sortKey="status" {...headProps} />
                <TableHead className="w-[60px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((metric) => (
                <TableRow key={metric._id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(metric._id)}
                      onCheckedChange={() => toggleSelect(metric._id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{metric.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {metric.integration ?? "Custom"}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {metric.eventCount24h.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {metric.eventCount7d.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {metric.eventCount30d.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {metric.lastEventAt
                      ? formatRelativeTime(metric.lastEventAt)
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    {metric.isStale ? (
                      <Badge variant="destructive" className="text-xs">
                        Stale
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-xs text-emerald-600"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={singleDeleting === metric._id}
                      onClick={() => setSingleDeleteTarget(metric._id)}
                    >
                      {singleDeleting === metric._id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2Icon className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-6"
                  >
                    No{staleOnly ? " stale" : ""} metrics found
                    {integrationFilter !== "all"
                      ? ` for ${integrationFilter}`
                      : ""}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {selected.size} Metrics</DialogTitle>
            <DialogDescription>
              The selected metrics will be removed from this app&apos;s
              tracking. They will still exist in Klaviyo and will reappear on
              the next sync. Klaviyo does not support deleting metrics via API.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : `Delete ${selected.size} Metrics`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!singleDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setSingleDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Metric</DialogTitle>
            <DialogDescription>
              &quot;{metrics.find((m) => m._id === singleDeleteTarget)?.name}
              &quot; will be removed from this app&apos;s tracking. It will
              still exist in Klaviyo and will reappear on the next sync. Klaviyo
              does not support deleting metrics via API.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSingleDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSingleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

type PerformanceData = {
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

type TopItemData = {
  name: string;
  recipients: number;
  openRate: number;
  clickRate: number;
  revenue: number;
};

type CampaignBreakdown = {
  total: number;
  sent: number;
  draft: number;
  scheduled: number;
  emailCount: number;
  smsCount: number;
  recentSent: {
    name: string;
    channel: string;
    sentAt?: string;
  }[];
};

type FlowBreakdown = {
  total: number;
  live: number;
  manual: number;
  draft: number;
  activeFlows: {
    name: string;
    status: string;
    triggerType?: string;
  }[];
};

type FlowsCampaignsData = {
  campaignSends30d: number;
  flowSends30d: number;
  topFlows: { name: string; sends: number }[];
  campaignBreakdown?: CampaignBreakdown;
  flowBreakdown?: FlowBreakdown;
  campaignPerformance?: PerformanceData;
  flowPerformance?: PerformanceData;
  topCampaigns?: TopItemData[];
  score: number;
  status: "green" | "yellow" | "red";
};

function CampaignFlowSection({ flowsCampaigns }: { flowsCampaigns: FlowsCampaignsData }) {
  const cb = flowsCampaigns.campaignBreakdown;
  const fb = flowsCampaigns.flowBreakdown;
  const hasCampaignPerf = !!flowsCampaigns.campaignPerformance;
  const hasFlowPerf = !!flowsCampaigns.flowPerformance;

  return (
    <div className="space-y-8">
      {/* ── Campaigns Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MailIcon className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold tracking-tight">Campaigns</h3>
          </div>
          <Badge variant="outline" className="text-xs">Last 30 days</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <SendIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Recipients</span>
              </div>
              <p className="text-2xl font-bold font-mono">
                {flowsCampaigns.campaignSends30d.toLocaleString()}
              </p>
              {cb && (
                <p className="text-xs text-muted-foreground mt-1">
                  {cb.emailCount} email · {cb.smsCount} SMS
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MailIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Campaigns Sent</span>
              </div>
              <p className="text-2xl font-bold font-mono">{cb?.sent ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {cb ? `${cb.total} total · ${cb.scheduled} scheduled · ${cb.draft} drafts` : "Sync pending"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSignIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Campaign Revenue</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${hasCampaignPerf ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                {hasCampaignPerf
                  ? formatCurrency(flowsCampaigns.campaignPerformance!.conversionValue)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasCampaignPerf ? "Placed Order attribution" : "Awaiting reporting data"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Activity Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cb ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <StatusPill color="emerald" label="Sent" count={cb.sent} />
                    <StatusPill color="blue" label="Scheduled" count={cb.scheduled} />
                    <StatusPill color="slate" label="Draft" count={cb.draft} />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MailIcon className="h-3 w-3" />
                      {cb.emailCount} email
                    </span>
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquareIcon className="h-3 w-3" />
                      {cb.smsCount} SMS
                    </span>
                  </div>
                  {cb.recentSent.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Sends</p>
                      <div className="space-y-1.5">
                        {cb.recentSent.map((c, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              {c.channel === "email" ? (
                                <MailIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                              ) : (
                                <MessageSquareIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                              )}
                              <span className="truncate max-w-[220px]">{c.name}</span>
                            </div>
                            {c.sentAt && (
                              <span className="text-xs text-muted-foreground shrink-0 ml-2">
                                {formatSentDate(c.sentAt)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Campaign breakdown will appear after next health check sync.
                </p>
              )}
            </CardContent>
          </Card>

          {hasCampaignPerf ? (
            <PerformanceCard
              title="Engagement"
              subtitle="Last 30 days"
              icon={<EyeIcon className="h-4 w-4 text-blue-500" />}
              data={flowsCampaigns.campaignPerformance!}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <EyeIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Open rates, click rates, and attribution metrics will appear once reporting data syncs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {flowsCampaigns.topCampaigns && flowsCampaigns.topCampaigns.length > 0 && (
          <TopItemsCard
            title="Top Campaigns by Recipients"
            icon={<MailIcon className="h-4 w-4 text-blue-500" />}
            items={flowsCampaigns.topCampaigns}
          />
        )}
      </section>

      {/* ── Flows Section ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ZapIcon className="h-5 w-5 text-violet-500" />
            <h3 className="text-lg font-semibold tracking-tight">Flows</h3>
          </div>
          <Badge variant="outline" className="text-xs">Last 30 days</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <SendIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Recipients</span>
              </div>
              <p className="text-2xl font-bold font-mono">
                {flowsCampaigns.flowSends30d.toLocaleString()}
              </p>
              {fb && (
                <p className="text-xs text-muted-foreground mt-1">
                  Across {fb.live + fb.manual} active flows
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <ZapIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Active Flows</span>
              </div>
              <p className="text-2xl font-bold font-mono">{fb ? fb.live + fb.manual : "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {fb ? `${fb.total} total · ${fb.live} live · ${fb.manual} manual` : "Sync pending"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSignIcon className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">Flow Revenue</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${hasFlowPerf ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                {hasFlowPerf
                  ? formatCurrency(flowsCampaigns.flowPerformance!.conversionValue)
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFlowPerf ? "Placed Order attribution" : "Awaiting reporting data"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Flow Coverage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {fb ? (
                <>
                  <div className="flex gap-2 flex-wrap">
                    <StatusPill color="emerald" label="Live" count={fb.live} />
                    <StatusPill color="blue" label="Manual" count={fb.manual} />
                    <StatusPill color="slate" label="Draft" count={fb.draft} />
                  </div>
                  {fb.activeFlows.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Active Flows</p>
                      <div className="space-y-1.5">
                        {fb.activeFlows.map((f, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 min-w-0">
                              <PlayIcon className="h-3 w-3 text-emerald-500 shrink-0" />
                              <span className="truncate max-w-[200px]">{f.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {f.triggerType && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                  {f.triggerType}
                                </Badge>
                              )}
                              <Badge
                                variant={f.status === "live" ? "default" : "outline"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {f.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Flow breakdown will appear after next health check sync.
                </p>
              )}
            </CardContent>
          </Card>

          {hasFlowPerf ? (
            <PerformanceCard
              title="Engagement"
              subtitle="Last 30 days"
              icon={<EyeIcon className="h-4 w-4 text-violet-500" />}
              data={flowsCampaigns.flowPerformance!}
            />
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Engagement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <EyeIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Open rates, click rates, and attribution metrics will appear once reporting data syncs.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {flowsCampaigns.topFlows.length > 0 && (
          <TopItemsCard
            title="Top Flows by Recipients"
            icon={<ZapIcon className="h-4 w-4 text-violet-500" />}
            items={flowsCampaigns.topFlows.map((f) => ({
              name: f.name,
              recipients: f.sends,
              openRate: 0,
              clickRate: 0,
              revenue: 0,
            }))}
            hideRates={!hasFlowPerf}
          />
        )}
      </section>
    </div>
  );
}

function StatusPill({ color, label, count }: { color: "emerald" | "blue" | "amber" | "slate"; label: string; count: number }) {
  const colorMap = {
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colorMap[color]}`}>
      <CircleDotIcon className="h-2.5 w-2.5" />
      {count} {label}
    </span>
  );
}

function formatSentDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function PerformanceCard({
  title,
  subtitle,
  icon,
  data,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  data: PerformanceData;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          <PerformanceStat
            label="Recipients"
            value={data.recipients.toLocaleString()}
            icon={<SendIcon className="h-3 w-3" />}
          />
          <PerformanceStat
            label="Delivered"
            value={data.delivered.toLocaleString()}
            icon={<MailIcon className="h-3 w-3" />}
          />
          <PerformanceStat
            label="Revenue"
            value={formatCurrency(data.conversionValue)}
            icon={<DollarSignIcon className="h-3 w-3" />}
            highlight
          />
        </div>
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t">
          <RateStat label="Open Rate" value={data.openRate} icon={<EyeIcon className="h-3 w-3" />} />
          <RateStat label="Click Rate" value={data.clickRate} icon={<MousePointerClickIcon className="h-3 w-3" />} />
          <RateStat label="Bounce" value={data.bounceRate} icon={<AlertTriangleIcon className="h-3 w-3" />} inverted />
          <RateStat label="Unsub" value={data.unsubscribeRate} icon={<MinusIcon className="h-3 w-3" />} inverted />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Conv. Rate</p>
            <p className="text-sm font-semibold font-mono mt-0.5">{formatRate(data.conversionRate)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Rev / Recipient</p>
            <p className="text-sm font-semibold font-mono mt-0.5">{formatCurrency(data.revenuePerRecipient)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PerformanceStat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold font-mono ${highlight ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function RateStat({
  label,
  value,
  icon,
  inverted,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  inverted?: boolean;
}) {
  const getRateColor = (rate: number, inv: boolean) => {
    if (inv) {
      if (rate >= 0.05) return "text-red-600 dark:text-red-400";
      if (rate >= 0.02) return "text-amber-600 dark:text-amber-400";
      return "text-emerald-600 dark:text-emerald-400";
    }
    if (rate >= 0.25) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 0.1) return "text-amber-600 dark:text-amber-400";
    return "text-muted-foreground";
  };

  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-sm font-semibold font-mono ${getRateColor(value, !!inverted)}`}>
        {formatRate(value)}
      </p>
    </div>
  );
}

function TopItemsCard({
  title,
  icon,
  items,
  hideRates,
}: {
  title: string;
  icon: React.ReactNode;
  items: TopItemData[];
  hideRates?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Recipients</TableHead>
                {!hideRates && (
                  <>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead className="text-right">Click</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {item.recipients.toLocaleString()}
                  </TableCell>
                  {!hideRates && (
                    <>
                      <TableCell className="text-right font-mono text-sm">
                        {formatRate(item.openRate)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatRate(item.clickRate)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={hideRates ? 2 : 5}
                    className="text-center text-muted-foreground py-4 text-sm"
                  >
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toFixed(2)}`;
}

function DetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-16 w-16 rounded-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
