"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScoreBadge, StatusDot } from "@/components/health-score-badge";

type HealthStatus = "green" | "yellow" | "red";

export function EnvironmentCard({
  envId,
  name,
  platform,
  region,
  narrative,
  healthScore,
  status,
  dataFreshnessScore,
  analyticsScore,
  formsScore,
  flowsCampaignsScore,
  lastCheckedAt,
}: {
  envId: string;
  name: string;
  platform: string;
  region: string;
  narrative: string;
  healthScore: number;
  status: HealthStatus;
  dataFreshnessScore?: number;
  analyticsScore?: number;
  formsScore?: number;
  flowsCampaignsScore?: number;
  lastCheckedAt?: number;
}) {
  return (
    <Link href={`/environments/${envId}`}>
      <Card className="transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-sm font-medium">{name}</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {platform}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {region}
              </Badge>
            </div>
          </div>
          <HealthScoreBadge score={healthScore} status={status} size="sm" />
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">{narrative}</p>
          <div className="grid grid-cols-4 gap-2">
            <ScoreBar label="Data" score={dataFreshnessScore} />
            <ScoreBar label="Analytics" score={analyticsScore} />
            <ScoreBar label="Forms" score={formsScore} />
            <ScoreBar label="Flows" score={flowsCampaignsScore} />
          </div>
          {lastCheckedAt && (
            <p className="text-xs text-muted-foreground mt-3">
              Last checked: {formatRelativeTime(lastCheckedAt)}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function ScoreBar({ label, score }: { label: string; score?: number }) {
  const pct = score !== undefined ? (score / 25) * 100 : 0;
  const color =
    pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
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
