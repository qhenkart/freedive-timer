"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  COUNTDOWN_ANNOUNCEMENTS,
  TIMER_END_PHRASE,
  TIMER_TICK_MS,
} from "@/lib/constants";
import { effectiveSrc } from "@/lib/sounds";
import type { SoundConfig } from "@/lib/types";
import { useWakeLock } from "./useWakeLock";

type StartOptions = {
  totalSeconds: number;
  sounds: SoundConfig[];
  includeCountdown: boolean;
  countdownDurationSec: number;
};

function speak(text: string) {
  if (typeof window === "undefined") return;
  if (typeof window.speechSynthesis === "undefined") return;
  try {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } catch {
    /* ignore */
  }
}

export function useTimer() {
  const [currentSecond, setCurrentSecond] = useState<number | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(
    null,
  );
  const [running, setRunning] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const countdownTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioSrcMap = useRef<Map<string, string>>(new Map());
  const runningRef = useRef(false);

  const wakeLock = useWakeLock(useCallback(() => runningRef.current, []));

  const ensureAudio = useCallback(
    (s: SoundConfig): HTMLAudioElement | undefined => {
      const src = effectiveSrc(s);
      if (!src) return undefined;
      let audio = audioMap.current.get(s.id);
      if (!audio) {
        audio = new Audio(src);
        audioMap.current.set(s.id, audio);
      } else if (audioSrcMap.current.get(s.id) !== src) {
        audio.src = src;
      }
      audioSrcMap.current.set(s.id, src);
      return audio;
    },
    [],
  );

  const startMainTimer = useCallback(
    ({ totalSeconds, sounds }: { totalSeconds: number; sounds: SoundConfig[] }) => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setCountdownRemaining(null);
      setCurrentSecond(0);
      setRunning(true);
      runningRef.current = true;
      wakeLock.request();

      const startTime = Date.now();
      const playedCues = new Set<string>();
      const snapshot = sounds.map((s) => ({
        id: s.id,
        second: s.second,
        src: effectiveSrc(s),
      }));

      intervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);

        snapshot.forEach((s) => {
          const key = `${s.id}:${s.second}`;
          if (
            s.src &&
            s.second >= 1 &&
            s.second <= elapsed &&
            !playedCues.has(key)
          ) {
            playedCues.add(key);
            const audio = audioMap.current.get(s.id);
            if (audio) {
              audio.currentTime = 0;
              const p = audio.play();
              if (p && typeof p.catch === "function") p.catch(() => {});
            }
          }
        });

        if (elapsed >= totalSeconds) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          intervalRef.current = null;
          speak(TIMER_END_PHRASE);
          setRunning(false);
          runningRef.current = false;
          setCurrentSecond(null);
          wakeLock.release();
          return;
        }

        setCurrentSecond(elapsed);
      }, TIMER_TICK_MS);
    },
    [wakeLock],
  );

  const start = useCallback(
    ({
      totalSeconds,
      sounds,
      includeCountdown,
      countdownDurationSec,
    }: StartOptions) => {
      if (runningRef.current) return;
      // Prime audio so first cue isn't blocked by autoplay policy.
      sounds.forEach((s) => {
        const audio = ensureAudio(s);
        if (!audio) return;
        try {
          audio.muted = true;
          const p = audio.play();
          if (p instanceof Promise) {
            p
              .then(() => {
                audio.pause();
                audio.currentTime = 0;
                audio.muted = false;
              })
              .catch(() => {});
          }
        } catch {
          /* ignore */
        }
      });

      if (!includeCountdown) {
        startMainTimer({ totalSeconds, sounds });
        return;
      }

      const durationMs = countdownDurationSec * 1000;
      setRunning(true);
      runningRef.current = true;
      wakeLock.request();
      const countdownStart = Date.now();
      setCountdownRemaining(countdownDurationSec);
      countdownIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - countdownStart;
        const remaining = Math.max(
          0,
          Math.ceil((durationMs - elapsed) / 1000),
        );
        setCountdownRemaining(remaining);
      }, TIMER_TICK_MS);

      // Only schedule announcements that fit within the chosen countdown length.
      COUNTDOWN_ANNOUNCEMENTS.filter(
        (a) => a.remainingSec <= countdownDurationSec,
      ).forEach(({ remainingSec, text }) => {
        const delay = (countdownDurationSec - remainingSec) * 1000;
        const t = setTimeout(() => speak(text), delay);
        countdownTimeouts.current.push(t);
      });

      const startTimeout = setTimeout(() => {
        startMainTimer({ totalSeconds, sounds });
      }, durationMs);
      countdownTimeouts.current.push(startTimeout);
    },
    [ensureAudio, startMainTimer, wakeLock],
  );

  const stop = useCallback(() => {
    countdownTimeouts.current.forEach((t) => clearTimeout(t));
    countdownTimeouts.current = [];
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownRemaining(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRunning(false);
    runningRef.current = false;
    setCurrentSecond(null);
    audioMap.current.forEach((a) => {
      a.pause();
      a.currentTime = 0;
    });
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    wakeLock.release();
  }, [wakeLock]);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownIntervalRef.current)
        clearInterval(countdownIntervalRef.current);
      countdownTimeouts.current.forEach((t) => clearTimeout(t));
      wakeLock.release();
    };
  }, [wakeLock]);

  return { currentSecond, countdownRemaining, running, start, stop };
}
