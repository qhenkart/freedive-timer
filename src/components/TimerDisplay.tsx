"use client";
import { formatTime } from "@/lib/time";

type Props = {
  // Total length of the *current* phase in seconds (countdown or main timer).
  total: number;
  // Elapsed seconds within that phase.
  elapsed: number;
  // What kind of phase we're in — affects the label and (subtly) the ring color.
  phase: "idle" | "countdown" | "running";
  // The big number to render. If omitted, derived from total - elapsed.
  bigText?: string;
  // Secondary line under the big number.
  subText?: string;
};

const SIZE = 280;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export function TimerDisplay({ total, elapsed, phase, bigText, subText }: Props) {
  const safeTotal = Math.max(1, total);
  const safeElapsed = Math.max(0, Math.min(elapsed, safeTotal));
  const progress = safeElapsed / safeTotal;
  const dashOffset = CIRC * (1 - progress);

  const remaining = Math.max(0, safeTotal - safeElapsed);
  const big = bigText ?? formatTime(remaining);
  const sub =
    subText ??
    (phase === "running"
      ? `Elapsed ${formatTime(safeElapsed)}`
      : phase === "countdown"
        ? "Until start"
        : "Timer ready");

  return (
    <div
      className="relative mx-auto select-none aspect-square"
      style={{ width: `min(${SIZE}px, 80vw)` }}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--track)"
          strokeWidth={STROKE}
        />
        {progress > 0 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={dashOffset}
            style={{
              transition: "stroke-dashoffset 0.3s linear",
              filter:
                "drop-shadow(0 0 12px color-mix(in oklab, var(--accent) 50%, transparent))",
            }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className={`font-mono font-semibold tracking-tight text-4xl sm:text-6xl ${phase === "countdown" ? "pulse-soft" : ""}`}
          style={{ color: "var(--text-primary)" }}
        >
          {big}
        </div>
        <div
          className="mt-1 text-[10px] sm:text-sm uppercase tracking-[0.18em]"
          style={{ color: "var(--text-secondary)" }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}
