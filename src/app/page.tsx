"use client";
import { useEffect, useMemo, useState } from "react";
import { saveSound, deleteSound } from "@/idb";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SoundRow } from "@/components/SoundRow";
import { Timeline } from "@/components/Timeline";
import { TimerDisplay } from "@/components/TimerDisplay";
import { TotalTimeInput } from "@/components/TotalTimeInput";
import { usePersistedConfig } from "@/hooks/usePersistedConfig";
import { useTimer } from "@/hooks/useTimer";
import { COUNTDOWN_OPTIONS, DEFAULT_SOUND } from "@/lib/constants";
import { formatTime } from "@/lib/time";
import type { SoundConfig } from "@/lib/types";

export default function TimerSoundApp() {
  const {
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
  } = usePersistedConfig();

  const { currentSecond, countdownRemaining, running, start, stop } = useTimer();
  const [error, setError] = useState<string | null>(null);

  const handleTotalTimeChange = (raw: string, parsed: number) => {
    setTotalSecondsInput(raw);
    setTotalSeconds(parsed);
  };

  const updateSound = (index: number, patch: Partial<SoundConfig>) => {
    setSounds((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const handleSoundSecondChange = (index: number, raw: string, parsed: number) => {
    updateSound(index, { secondInput: raw, second: parsed });
  };

  const handleSoundUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = sounds[index]?.id;
    if (id) saveSound(id, { name: file.name, blob: file });
    setSounds((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (s.customURL) URL.revokeObjectURL(s.customURL);
        return {
          ...s,
          customFile: file,
          customURL: url,
          sourceType: "custom",
        };
      }),
    );
  };

  const selectDefaultSound = (index: number, value: string) => {
    setSounds((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, defaultSrc: value, sourceType: "default" } : s,
      ),
    );
  };

  const addSound = () => {
    const id = Math.random().toString(36).slice(2);
    const newSound: SoundConfig = {
      id,
      second: 1,
      secondInput: "",
      defaultSrc: DEFAULT_SOUND,
      sourceType: "default",
      isNew: true,
    };
    setSounds((prev) => [...prev, newSound]);
    setTimeout(() => {
      setSounds((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isNew: false } : s)),
      );
    }, 200);
  };

  const removeSound = (id: string) => {
    setSounds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isRemoving: true } : s)),
    );
    setTimeout(() => {
      setSounds((prev) => {
        const target = prev.find((s) => s.id === id);
        if (target?.customURL) URL.revokeObjectURL(target.customURL);
        if (target?.sourceType === "custom") deleteSound(id);
        return prev.filter((s) => s.id !== id);
      });
    }, 200);
  };

  const clearCustomFile = (index: number) => {
    const id = sounds[index]?.id;
    if (id) deleteSound(id);
    setSounds((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (s.customURL) URL.revokeObjectURL(s.customURL);
        return {
          ...s,
          customFile: undefined,
          customURL: undefined,
          sourceType: "default",
        };
      }),
    );
  };

  const hasOutOfRange = sounds.some(
    (s) => s.second < 1 || s.second > totalSeconds,
  );
  const allHaveSrc = sounds.every(
    (s) => (s.sourceType === "custom" ? s.customURL : s.defaultSrc),
  );
  const canStart =
    totalSeconds >= 1 && sounds.length > 0 && allHaveSrc && !hasOutOfRange;

  useEffect(() => {
    if (sounds.length === 0) {
      setError(null);
      return;
    }
    if (!allHaveSrc) {
      setError("Please choose a sound for every trigger.");
    } else if (hasOutOfRange) {
      setError(
        `Each trigger time must be between 1 and ${totalSeconds} seconds.`,
      );
    } else {
      setError(null);
    }
  }, [sounds, totalSeconds, allHaveSrc, hasOutOfRange]);

  const cues = useMemo(
    () =>
      sounds.map((s) => ({
        id: s.id,
        second: s.second,
        valid: s.second >= 1 && s.second <= totalSeconds,
      })),
    [sounds, totalSeconds],
  );

  // Decide what the display shows: countdown, running timer, or idle.
  const display = countdownRemaining !== null
    ? {
        phase: "countdown" as const,
        total: countdownDurationSec,
        elapsed: countdownDurationSec - countdownRemaining,
        bigText: formatTime(countdownRemaining),
        subText: "Until start",
      }
    : currentSecond !== null
      ? {
          phase: "running" as const,
          total: totalSeconds,
          elapsed: currentSecond,
          bigText: undefined,
          subText: undefined,
        }
      : {
          phase: "idle" as const,
          total: totalSeconds,
          elapsed: 0,
          bigText: formatTime(totalSeconds),
          subText: "Timer ready",
        };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-6 sm:py-10">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-xl backdrop-blur p-6 sm:p-10"
        style={{
          background: "var(--card)",
          border: "1px solid var(--card-border)",
        }}
      >
        <Header />
        <p
          className="mt-3 text-sm sm:text-base"
          style={{ color: "var(--text-secondary)" }}
        >
          Enter your total dive time and set sound cues for important moments.
          When you&rsquo;re ready, hit Start and focus on your breath.
        </p>

        {/* HERO TIMER */}
        <div className="mt-8 mb-2 flex flex-col items-center">
          <TimerDisplay
            total={display.total}
            elapsed={display.elapsed}
            phase={display.phase}
            bigText={display.bigText}
            subText={display.subText}
          />
          <Timeline
            totalSeconds={totalSeconds}
            elapsed={currentSecond}
            cues={cues}
            running={running}
          />

          <div className="flex gap-3 mt-6 w-full sm:w-auto">
            <button
              onClick={() =>
                start({
                  totalSeconds,
                  sounds,
                  includeCountdown,
                  countdownDurationSec,
                })
              }
              disabled={running || !canStart}
              className="flex-1 sm:flex-initial sm:w-32 px-6 py-2.5 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background:
                  canStart && !running ? "var(--accent)" : "var(--track)",
                color:
                  canStart && !running ? "white" : "var(--text-muted)",
                boxShadow:
                  canStart && !running
                    ? "0 4px 16px color-mix(in oklab, var(--accent) 35%, transparent)"
                    : "none",
              }}
            >
              Start
            </button>
            <button
              onClick={stop}
              disabled={!running}
              className="flex-1 sm:flex-initial sm:w-32 px-6 py-2.5 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: "var(--bg-elev)",
                border: "1px solid var(--card-border)",
                color: "var(--text-primary)",
              }}
            >
              Stop
            </button>
          </div>
          {error && (
            <div
              className="mt-4 text-sm font-medium text-center"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* CONFIG SECTION */}
        <div
          className="mt-10 pt-6 border-t"
          style={{ borderColor: "var(--card-border)" }}
        >
          <TotalTimeInput
            value={totalSecondsInput}
            running={running}
            onChange={handleTotalTimeChange}
          />
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Sound Triggers
            </h2>
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              {sounds.length === 0
                ? "Add a cue to get started"
                : `${sounds.length} cue${sounds.length === 1 ? "" : "s"}`}
            </span>
          </div>
          <ol className="space-y-3">
            {sounds.map((s, i) => (
              <SoundRow
                key={s.id}
                sound={s}
                index={i}
                running={running}
                totalSeconds={totalSeconds}
                onSecondChange={handleSoundSecondChange}
                onSelectDefault={selectDefaultSound}
                onUpload={handleSoundUpload}
                onClearUpload={clearCustomFile}
                onRemove={removeSound}
              />
            ))}
          </ol>
          <button
            type="button"
            onClick={addSound}
            disabled={running}
            className="mt-3 px-4 py-2 rounded-full text-sm font-semibold transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent-soft-text)",
            }}
          >
            + Add Sound
          </button>
        </div>

        <div
          className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ color: "var(--text-secondary)" }}
        >
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              id="includeCountdown"
              type="checkbox"
              className="h-4 w-4 accent-current"
              style={{ accentColor: "var(--accent)" }}
              checked={includeCountdown}
              disabled={running}
              onChange={(e) => setIncludeCountdown(e.target.checked)}
            />
            <span className="text-sm">
              Include 2 minute official countdown (AIDA style)
            </span>
          </label>
          <label
            className={`flex items-center gap-2 sm:ml-auto text-xs uppercase tracking-[0.18em] transition ${includeCountdown ? "opacity-100" : "opacity-40"}`}
          >
            <span style={{ color: "var(--text-muted)" }}>Start at</span>
            <select
              aria-label="countdown start time"
              value={countdownDurationSec}
              disabled={running || !includeCountdown}
              onChange={(e) =>
                setCountdownDurationSec(Number(e.target.value))
              }
              className="rounded-lg px-2 py-1.5 text-sm font-mono focus:outline-none transition cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: "var(--bg-elev)",
                border: `1px solid var(--card-border)`,
                color: "var(--text-primary)",
              }}
            >
              {COUNTDOWN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Footer />
      </div>
    </div>
  );
}
