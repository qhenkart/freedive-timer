"use client";
import { useState } from "react";
import { DEFAULT_TOTAL_SECONDS } from "@/lib/constants";
import { formatTime, parseTimeInput, sanitizeTimeInput } from "@/lib/time";

type Props = {
  value: string;
  running: boolean;
  onChange: (rawInput: string, totalSeconds: number) => void;
};

export function TotalTimeInput({ value, running, onChange }: Props) {
  const [focused, setFocused] = useState(false);
  const isDefault = value === "";

  const handleChange = (raw: string) => {
    const cleaned = sanitizeTimeInput(raw);
    const parsed = parseTimeInput(cleaned);
    onChange(cleaned, parsed === null ? DEFAULT_TOTAL_SECONDS : parsed);
  };

  // On blur, normalise the input to m:ss for clarity (only if user typed something).
  const handleBlur = () => {
    setFocused(false);
    if (value === "") return;
    const parsed = parseTimeInput(value);
    if (parsed !== null && parsed > 0) {
      const normalised = formatTime(parsed);
      if (normalised !== value) onChange(normalised, parsed);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="totalSeconds"
        className="text-sm font-medium"
        style={{ color: "var(--text-secondary)" }}
      >
        Total time
      </label>
      <input
        id="totalSeconds"
        type="text"
        inputMode="numeric"
        pattern="[0-9:]*"
        value={isDefault ? "" : value}
        placeholder={formatTime(DEFAULT_TOTAL_SECONDS)}
        disabled={running}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={handleBlur}
        autoComplete="off"
        aria-describedby="totalSeconds-hint"
        className="w-28 rounded-lg px-3 py-2 text-lg font-mono font-semibold focus:outline-none transition disabled:opacity-60"
        style={{
          background: "var(--bg-elev)",
          border: `1px solid ${focused ? "var(--accent)" : "var(--card-border)"}`,
          color: isDefault ? "var(--text-muted)" : "var(--text-primary)",
        }}
      />
      <span
        id="totalSeconds-hint"
        className="hidden sm:inline text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        seconds or m:ss
      </span>
    </div>
  );
}
