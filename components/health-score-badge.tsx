"use client";

import { cn } from "@/lib/utils";

type HealthStatus = "green" | "yellow" | "red";

export function HealthScoreBadge({
  score,
  status,
  size = "md",
}: {
  score: number;
  status: HealthStatus;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-lg",
  };

  const colorClasses = {
    green:
      "bg-emerald-100 text-emerald-700 ring-emerald-500/30 dark:bg-emerald-950 dark:text-emerald-400 dark:ring-emerald-500/20",
    yellow:
      "bg-amber-100 text-amber-700 ring-amber-500/30 dark:bg-amber-950 dark:text-amber-400 dark:ring-amber-500/20",
    red: "bg-red-100 text-red-700 ring-red-500/30 dark:bg-red-950 dark:text-red-400 dark:ring-red-500/20",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-semibold ring-2",
        sizeClasses[size],
        colorClasses[status],
      )}
    >
      {score}
    </div>
  );
}

export function StatusDot({ status }: { status: HealthStatus }) {
  const colorClasses = {
    green: "bg-emerald-500",
    yellow: "bg-amber-500",
    red: "bg-red-500",
  };

  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full",
        colorClasses[status],
      )}
    />
  );
}

export function StatusLabel({ status }: { status: HealthStatus }) {
  const colorClasses = {
    green: "text-emerald-600 dark:text-emerald-400",
    yellow: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400",
  };

  const labels = {
    green: "Healthy",
    yellow: "Warning",
    red: "Critical",
  };

  return (
    <span
      className={cn("text-sm font-medium capitalize", colorClasses[status])}
    >
      {labels[status]}
    </span>
  );
}

export function AnalyticsBadge({
  label,
}: {
  label: "healthy" | "thin" | "broken" | "unknown";
}) {
  const colorClasses = {
    healthy:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    thin: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    broken: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    unknown: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium capitalize",
        colorClasses[label],
      )}
    >
      {label}
    </span>
  );
}
