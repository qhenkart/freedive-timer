"use client";
import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_COUNTDOWN_SEC,
  DEFAULT_SOUND,
  DEFAULT_TOTAL_SECONDS,
  STORAGE_KEY,
} from "@/lib/constants";
import { getSound } from "@/idb";
import type { SoundConfig, StoredState } from "@/lib/types";

export function usePersistedConfig() {
  const [totalSecondsInput, setTotalSecondsInput] = useState("");
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_TOTAL_SECONDS);
  const [includeCountdown, setIncludeCountdown] = useState(false);
  const [countdownDurationSec, setCountdownDurationSec] = useState(
    DEFAULT_COUNTDOWN_SEC,
  );
  const [sounds, setSounds] = useState<SoundConfig[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const soundsRef = useRef<SoundConfig[]>([]);

  useEffect(() => {
    soundsRef.current = sounds;
  }, [sounds]);

  // Load saved state once on mount.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StoredState;
          if (cancelled) return;
          setTotalSecondsInput(parsed.totalSecondsInput ?? "");
          setTotalSeconds(parsed.totalSeconds ?? DEFAULT_TOTAL_SECONDS);
          setIncludeCountdown(parsed.includeCountdown ?? false);
          setCountdownDurationSec(
            parsed.countdownDurationSec ?? DEFAULT_COUNTDOWN_SEC,
          );
          if (Array.isArray(parsed.sounds)) {
            const loaded: SoundConfig[] = await Promise.all(
              parsed.sounds.map(async (raw) => {
                const legacyDefault =
                  raw.sourceType !== "custom" ? raw.src : undefined;
                const base: SoundConfig = {
                  id: raw.id,
                  second: raw.second,
                  secondInput: raw.secondInput,
                  defaultSrc: raw.defaultSrc ?? legacyDefault ?? DEFAULT_SOUND,
                  sourceType: raw.sourceType ?? "default",
                };
                if (base.sourceType === "custom") {
                  const data = await getSound(raw.id);
                  if (data) {
                    const url = URL.createObjectURL(data.blob);
                    base.customURL = url;
                    base.customFile = new File([data.blob], data.name, {
                      type: data.blob.type,
                    });
                  } else {
                    base.sourceType = "default";
                  }
                }
                return base;
              }),
            );
            if (!cancelled) setSounds(loaded);
          }
        }
      } catch {
        /* ignore malformed data */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist after hydration.
  useEffect(() => {
    if (!hydrated) return;
    const minimalSounds = sounds.map((s) => ({
      id: s.id,
      second: s.second,
      secondInput: s.secondInput,
      defaultSrc: s.defaultSrc,
      sourceType: s.sourceType,
    }));
    const data: StoredState = {
      totalSecondsInput,
      totalSeconds,
      includeCountdown,
      countdownDurationSec,
      sounds: minimalSounds,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore write errors */
    }
  }, [
    hydrated,
    totalSecondsInput,
    totalSeconds,
    sounds,
    includeCountdown,
    countdownDurationSec,
  ]);

  // Revoke blob URLs on unmount.
  useEffect(() => {
    return () => {
      soundsRef.current.forEach((s) => {
        if (s.customURL) URL.revokeObjectURL(s.customURL);
      });
    };
  }, []);

  return {
    totalSecondsInput,
    setTotalSecondsInput,
    totalSeconds,
    setTotalSeconds,
    includeCountdown,
    setIncludeCountdown,
    countdownDurationSec,
    setCountdownDurationSec,
    sounds,
    setSounds,
    hydrated,
  };
}
