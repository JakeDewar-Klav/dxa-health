"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRefresh } from "@/app/refresh-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2Icon, FilterIcon } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

export default function MetricsManagerPage() {
  const allMetrics = useQuery(api.metrics.listAll);
  const environments = useQuery(api.environments.list);
  const removeMetric = useMutation(api.metrics.remove);

  const [envFilter, setEnvFilter] = useState<string>("all");
  const [staleOnly, setStaleOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [singleDeleteTarget, setSingleDeleteTarget] = useState<string | null>(
    null,
  );
  const [singleDeleting, setSingleDeleting] = useState<string | null>(null);

  const { isRefreshing } = useRefresh();

  if (allMetrics === undefined || environments === undefined || isRefreshing) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const envMap = new Map(environments.map((e) => [e.envId, e.name]));
  const envIds = [...new Set(allMetrics.map((m) => m.envId))];

  const filtered = allMetrics.filter((m) => {
    if (envFilter !== "all" && m.envId !== envFilter) return false;
    if (staleOnly && !m.isStale) return false;
    return true;
  });

  const staleCount = allMetrics.filter((m) => m.isStale).length;
  const customCount = allMetrics.filter((m) => m.isCustom).length;

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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Metrics Manager</h1>
        <p className="text-muted-foreground">
          View, filter, and clean up stale metrics across all environments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allMetrics.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Custom Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customCount}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Stale Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {staleCount}
            </div>
            <p className="text-xs text-muted-foreground">
              No events in 30+ days
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          value={envFilter}
          onValueChange={(v) => setEnvFilter(v ?? "all")}
        >
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
        <Button
          variant={staleOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setStaleOnly(!staleOnly)}
        >
          <FilterIcon className="h-3.5 w-3.5 mr-1" />
          Stale Only
        </Button>
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
        <Badge variant="outline" className="ml-auto">
          {filtered.length} metrics
        </Badge>
      </div>

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
              <TableHead>Metric Name</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead>Integration</TableHead>
              <TableHead className="text-center">Events (30d)</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[60px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice(0, 100).map((metric) => (
              <TableRow key={metric._id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(metric._id)}
                    onCheckedChange={() => toggleSelect(metric._id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{metric.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {envMap.get(metric.envId) ?? metric.envId}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {metric.integration ?? "Custom"}
                </TableCell>
                <TableCell className="text-center font-mono">
                  {metric.eventCount30d.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={metric.isCustom ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {metric.isCustom ? "Custom" : "Integration"}
                  </Badge>
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
          </TableBody>
        </Table>
      </div>

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
              &quot;
              {allMetrics?.find((m) => m._id === singleDeleteTarget)?.name}
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
    </div>
  );
}
