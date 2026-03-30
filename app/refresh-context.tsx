"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

type RefreshProgress = {
  completed: number;
  total: number;
};

type RefreshContextValue = {
  isRefreshing: boolean;
  refreshProgress: RefreshProgress | null;
  triggerGlobalRefresh: () => Promise<void>;
};

const RefreshContext = createContext<RefreshContextValue>({
  isRefreshing: false,
  refreshProgress: null,
  triggerGlobalRefresh: async () => {},
});

const INACTIVITY_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 5 * 60_000;

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const environments = useQuery(api.environments.list);
  const triggerAll = useMutation(api.environments.triggerAllHealthChecks);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] =
    useState<RefreshProgress | null>(null);
  const [refreshRequestedAt, setRefreshRequestedAt] = useState<number | null>(
    null,
  );

  const lastCompletedCountRef = useRef(0);
  const lastProgressChangeRef = useRef(0);
  const maxTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const finishRefresh = useCallback(() => {
    setIsRefreshing(false);
    setRefreshProgress(null);
    setRefreshRequestedAt(null);
    lastCompletedCountRef.current = 0;
    lastProgressChangeRef.current = 0;
    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isRefreshing || !refreshRequestedAt || !environments) return;

    const total = environments.length;
    const completed = environments.filter(
      (e) => e.lastCheckedAt && e.lastCheckedAt >= refreshRequestedAt,
    ).length;

    setRefreshProgress({ completed, total });

    if (total > 0 && completed >= total) {
      finishRefresh();
      return;
    }

    if (completed > lastCompletedCountRef.current) {
      lastCompletedCountRef.current = completed;
      lastProgressChangeRef.current = Date.now();

      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      inactivityTimeoutRef.current = setTimeout(() => {
        if (completed > 0) {
          finishRefresh();
        }
      }, INACTIVITY_TIMEOUT_MS);
    }
  }, [environments, isRefreshing, refreshRequestedAt, finishRefresh]);

  const triggerGlobalRefresh = useCallback(async () => {
    if (isRefreshing) return;

    const now = Date.now();
    setIsRefreshing(true);
    setRefreshRequestedAt(now);
    setRefreshProgress({ completed: 0, total: environments?.length ?? 0 });
    lastCompletedCountRef.current = 0;
    lastProgressChangeRef.current = now;

    maxTimeoutRef.current = setTimeout(finishRefresh, MAX_TIMEOUT_MS);
    inactivityTimeoutRef.current = setTimeout(() => {
      finishRefresh();
    }, INACTIVITY_TIMEOUT_MS);

    await triggerAll();
  }, [isRefreshing, environments, triggerAll, finishRefresh]);

  useEffect(() => {
    return () => {
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      if (inactivityTimeoutRef.current)
        clearTimeout(inactivityTimeoutRef.current);
    };
  }, []);

  return (
    <RefreshContext.Provider
      value={{ isRefreshing, refreshProgress, triggerGlobalRefresh }}
    >
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  return useContext(RefreshContext);
}
