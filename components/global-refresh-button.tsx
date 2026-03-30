"use client";

import { useRefresh } from "@/app/refresh-context";
import { Button } from "@/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

export function GlobalRefreshButton() {
  const { isRefreshing, refreshProgress, triggerGlobalRefresh } = useRefresh();

  const label =
    isRefreshing && refreshProgress
      ? `Refreshing ${refreshProgress.completed}/${refreshProgress.total}…`
      : "Refresh All";

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isRefreshing}
      onClick={() => triggerGlobalRefresh()}
      className="gap-1.5"
      title={
        isRefreshing
          ? `Health checks running (${refreshProgress?.completed ?? 0}/${refreshProgress?.total ?? 0})`
          : "Run health checks for all environments"
      }
    >
      <RefreshCwIcon
        className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
      />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
