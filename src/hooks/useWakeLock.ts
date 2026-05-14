"use client";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { WakeLockSentinelLike } from "@/lib/types";

export function useWakeLock(isActive: () => boolean) {
  const ref = useRef<WakeLockSentinelLike | null>(null);

  const request = useCallback(async () => {
    const nav = navigator as Navigator & {
      wakeLock?: {
        request: (type: "screen") => Promise<WakeLockSentinelLike>;
      };
    };
    if (!nav.wakeLock) return;
    try {
      ref.current = await nav.wakeLock.request("screen");
    } catch {
      /* low battery, permission denied, etc — ignore */
    }
  }, []);

  const release = useCallback(() => {
    ref.current?.release().catch(() => {});
    ref.current = null;
  }, []);

  useEffect(() => {
    const handler = () => {
      if (
        isActive() &&
        document.visibilityState === "visible" &&
        !ref.current
      ) {
        request();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [isActive, request]);

  // Return a stable object so consumers can use it as an effect dep without
  // re-triggering on every render.
  return useMemo(() => ({ request, release }), [request, release]);
}
