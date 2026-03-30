"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRefresh } from "@/app/refresh-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function ActionItemsPage() {
  const openItems = useQuery(api.actionItems.list, { status: "open" });
  const resolvedItems = useQuery(api.actionItems.list, { status: "resolved" });
  const dismissedItems = useQuery(api.actionItems.list, { status: "dismissed" });
  const environments = useQuery(api.environments.list);
  const resolveItem = useMutation(api.actionItems.resolve);
  const dismissItem = useMutation(api.actionItems.dismiss);

  const { isRefreshing } = useRefresh();
  const [envFilter, setEnvFilter] = useState<string>("all");

  if (openItems === undefined || environments === undefined || isRefreshing) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const envMap = new Map(environments.map((e) => [e.envId, e.name]));
  const envIds = [...new Set(openItems.map((i) => i.envId))];

  const criticalCount = openItems.filter((i) => i.severity === "critical").length;
  const warningCount = openItems.filter((i) => i.severity === "warning").length;
  const infoCount = openItems.filter((i) => i.severity === "info").length;

  function filterItems(items: typeof openItems) {
    if (!items) return [];
    let filtered = [...items];
    if (envFilter !== "all") {
      filtered = filtered.filter((i) => i.envId === envFilter);
    }
    return filtered.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Action Items</h1>
        <p className="text-muted-foreground">
          Prioritized maintenance tasks across all demo environments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircleIcon className="h-4 w-4 text-red-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangleIcon className="h-4 w-4 text-amber-500" />
              Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <InfoIcon className="h-4 w-4 text-blue-500" />
              Info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3">
        <Select value={envFilter} onValueChange={(v) => setEnvFilter(v ?? "all")}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Environments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Environments</SelectItem>
            {envIds.map((id) => (
              <SelectItem key={id} value={id}>
                {envMap.get(id) ?? id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Open ({openItems.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolved ({resolvedItems?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="dismissed">
            Dismissed ({dismissedItems?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="space-y-2 mt-4">
          {filterItems(openItems).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle2Icon className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-muted-foreground">No open action items</p>
              </CardContent>
            </Card>
          ) : (
            filterItems(openItems).map((item) => (
              <ActionItemRow
                key={item._id}
                item={item}
                envName={envMap.get(item.envId) ?? item.envId}
                onResolve={() => resolveItem({ id: item._id as Id<"actionItems"> })}
                onDismiss={() => dismissItem({ id: item._id as Id<"actionItems"> })}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="resolved" className="space-y-2 mt-4">
          {filterItems(resolvedItems ?? []).map((item) => (
            <ActionItemRow
              key={item._id}
              item={item}
              envName={envMap.get(item.envId) ?? item.envId}
            />
          ))}
        </TabsContent>

        <TabsContent value="dismissed" className="space-y-2 mt-4">
          {filterItems(dismissedItems ?? []).map((item) => (
            <ActionItemRow
              key={item._id}
              item={item}
              envName={envMap.get(item.envId) ?? item.envId}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ActionItemRow({
  item,
  envName,
  onResolve,
  onDismiss,
}: {
  item: {
    _id: string;
    severity: "critical" | "warning" | "info";
    category: string;
    description: string;
    status: string;
    createdAt: number;
  };
  envName: string;
  onResolve?: () => void;
  onDismiss?: () => void;
}) {
  const severityIcon = {
    critical: <AlertCircleIcon className="h-4 w-4 text-red-500" />,
    warning: <AlertTriangleIcon className="h-4 w-4 text-amber-500" />,
    info: <InfoIcon className="h-4 w-4 text-blue-500" />,
  };

  const severityBadge = {
    critical: <Badge variant="destructive" className="text-xs">Critical</Badge>,
    warning: <Badge className="text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-950 dark:text-amber-400">Warning</Badge>,
    info: <Badge variant="secondary" className="text-xs">Info</Badge>,
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border">
      <div className="mt-0.5">{severityIcon[item.severity]}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {severityBadge[item.severity]}
          <Badge variant="outline" className="text-xs">{envName}</Badge>
          <Badge variant="secondary" className="text-xs">{item.category}</Badge>
        </div>
        <p className="text-sm">{item.description}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Created {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>
      {item.status === "open" && (
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onResolve}
            title="Resolve"
          >
            <CheckCircle2Icon className="h-4 w-4 text-emerald-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            title="Dismiss"
          >
            <XCircleIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}
