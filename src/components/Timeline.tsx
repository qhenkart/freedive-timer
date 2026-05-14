"use client";
import { formatTime } from "@/lib/time";

type Cue = { id: string; second: number; valid: boolean };

type Props = {
  totalSeconds: number;
  elapsed: number | null; // null when idle
  cues: Cue[];
  running: boolean;
};

export function Timeline({ totalSeconds, elapsed, cues, running }: Props) {
  const safeTotal = Math.max(1, totalSeconds);
  const progress = elapsed === null ? 0 : Math.min(elapsed, safeTotal) / safeTotal;

  return (
    <div className="w-full mt-6 px-1.5" aria-label="Sound trigger timeline">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: "var(--text-muted)" }}>
        <span>0:00</span>
        <span>{formatTime(safeTotal)}</span>
      </div>
      <div
        className="relative h-2 rounded-full"
        style={{ background: "var(--track)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-200 ease-linear"
          style={{
            width: `${progress * 100}%`,
            background: "var(--accent)",
            opacity: running ? 1 : 0.45,
          }}
        />
        {cues.map((cue) => {
          const pct = Math.min(100, Math.max(0, (cue.second / safeTotal) * 100));
          const passed = elapsed !== null && cue.second <= elapsed;
          return (
            <span
              key={cue.id}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 transition-colors"
              style={{
                left: `${pct}%`,
                background: passed ? "var(--accent)" : "var(--bg-elev)",
                borderColor: cue.valid
                  ? "var(--accent)"
                  : "var(--danger)",
              }}
              title={`At ${formatTime(cue.second)}`}
              aria-label={`Cue at ${formatTime(cue.second)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
