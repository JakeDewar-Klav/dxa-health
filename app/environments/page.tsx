"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRefresh } from "@/app/refresh-context";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot } from "@/components/health-score-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EnvironmentsPage() {
  const environments = useQuery(api.environments.list);
  const { isRefreshing } = useRefresh();

  if (environments === undefined || isRefreshing) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const sorted = [...environments].sort((a, b) => a.healthScore - b.healthScore);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
        <p className="text-muted-foreground">
          All demo environments with health status details
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Region</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead className="text-center">Data</TableHead>
              <TableHead className="text-center">Analytics</TableHead>
              <TableHead className="text-center">Forms</TableHead>
              <TableHead className="text-center">Flows</TableHead>
              <TableHead>Last Checked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((env) => (
              <TableRow key={env._id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <StatusDot status={env.status} />
                </TableCell>
                <TableCell>
                  <Link
                    href={`/environments/${env.envId}`}
                    className="font-medium hover:underline"
                  >
                    {env.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{env.platform}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{env.region}</Badge>
                </TableCell>
                <TableCell className="text-center font-mono">
                  {env.healthScore}
                </TableCell>
                <TableCell className="text-center">
                  <SubScore score={env.dataFreshnessScore} />
                </TableCell>
                <TableCell className="text-center">
                  <SubScore score={env.analyticsScore} />
                </TableCell>
                <TableCell className="text-center">
                  <SubScore score={env.formsScore} />
                </TableCell>
                <TableCell className="text-center">
                  <SubScore score={env.flowsCampaignsScore} />
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {env.lastCheckedAt
                    ? formatRelativeTime(env.lastCheckedAt)
                    : "Never"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SubScore({ score }: { score?: number }) {
  if (score === undefined) return <span className="text-muted-foreground">--</span>;
  const pct = (score / 25) * 100;
  const color =
    pct >= 80
      ? "text-emerald-600 dark:text-emerald-400"
      : pct >= 40
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";
  return <span className={`font-mono text-sm ${color}`}>{score}/25</span>;
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
