"use client";
import { defaultSounds } from "@/lib/constants";
import { effectiveSrc } from "@/lib/sounds";
import { formatTime, parseTimeInput, sanitizeTimeInput } from "@/lib/time";
import type { SoundConfig } from "@/lib/types";

type Props = {
  sound: SoundConfig;
  index: number;
  running: boolean;
  totalSeconds: number;
  onSecondChange: (index: number, raw: string, second: number) => void;
  onSelectDefault: (index: number, value: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onClearUpload: (index: number) => void;
  onRemove: (id: string) => void;
};

export function SoundRow({
  sound,
  index,
  running,
  totalSeconds,
  onSecondChange,
  onSelectDefault,
  onUpload,
  onClearUpload,
  onRemove,
}: Props) {
  const previewSrc = effectiveSrc(sound);
  const isOutOfRange = sound.second < 1 || sound.second > totalSeconds;
  const isDefault = sound.secondInput === "";

  const handleSecondChange = (raw: string) => {
    const cleaned = sanitizeTimeInput(raw);
    const parsed = parseTimeInput(cleaned);
    onSecondChange(index, cleaned, parsed === null ? 1 : parsed);
  };

  const handleSecondBlur = () => {
    if (sound.secondInput === "") return;
    const parsed = parseTimeInput(sound.secondInput);
    if (parsed !== null && parsed > 0) {
      const normalised = formatTime(parsed);
      if (normalised !== sound.secondInput) {
        onSecondChange(index, normalised, parsed);
      }
    }
  };

  return (
    <li
      className={`relative rounded-2xl border p-3 sm:p-4 transition-all duration-200 ${
        sound.isNew ? "fade-in" : ""
      } ${sound.isRemoving ? "fade-out" : ""}`}
      style={{
        background: "var(--bg-elev)",
        borderColor: isOutOfRange
          ? "var(--danger)"
          : "var(--card-border)",
      }}
    >
      <button
        type="button"
        aria-label="remove sound"
        onClick={() => onRemove(sound.id)}
        disabled={running}
        className="absolute -top-2 -right-2 w-8 h-8 rounded-full grid place-items-center text-base font-bold transition hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed z-10"
        style={{
          background: "var(--bg-elev)",
          border: `1px solid var(--card-border)`,
          color: "var(--danger)",
        }}
      >
        ×
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        {/* Time pill */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="hidden sm:inline text-xs uppercase tracking-[0.18em] shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            At
          </span>
          <input
            id={`seconds-input-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9:]*"
            value={isDefault ? "" : sound.secondInput}
            placeholder="1"
            disabled={running}
            onChange={(e) => handleSecondChange(e.target.value)}
            onBlur={handleSecondBlur}
            autoComplete="off"
            aria-invalid={isOutOfRange ? "true" : undefined}
            className="w-16 sm:w-20 rounded-lg px-2 py-1.5 text-center text-base font-mono font-semibold focus:outline-none transition"
            style={{
              background: "var(--bg)",
              border: `1px solid ${isOutOfRange ? "var(--danger)" : "var(--card-border)"}`,
              color: isDefault ? "var(--text-muted)" : "var(--text-primary)",
            }}
          />
          <span
            className="text-[10px] sm:text-xs shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            <span className="sm:hidden">sec</span>
            <span className="hidden sm:inline">sec or m:ss</span>
          </span>
        </div>

        <div
          className="hidden sm:block w-px h-6"
          style={{ background: "var(--card-border)" }}
        />

        {/* Controls row */}
        <div className="flex items-center gap-2 sm:min-w-0 sm:flex-1">
          <span
            className="hidden sm:inline text-xs uppercase tracking-[0.18em] shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            Play
          </span>
          <select
            disabled={running}
            value={sound.defaultSrc}
            onChange={(e) => onSelectDefault(index, e.target.value)}
            className="shrink-0 rounded-lg px-2 py-1.5 text-sm focus:outline-none transition cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: "var(--bg)",
              border: `1px solid var(--card-border)`,
              color: "var(--text-primary)",
            }}
          >
            {defaultSounds.map((ds) => (
              <option key={ds.value} value={ds.value}>
                {ds.label}
              </option>
            ))}
          </select>

          <span
            className="hidden sm:inline text-xs shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            or
          </span>

          <input
            key={sound.customFile ? sound.customFile.name : "new"}
            id={`custom-file-${index}`}
            type="file"
            accept="audio/*"
            disabled={running}
            onChange={(e) => onUpload(e, index)}
            className="hidden"
          />
          {!sound.customFile && (
            <label
              htmlFor={`custom-file-${index}`}
              aria-label="upload custom sound"
              className={`shrink-0 inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition ${running ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:brightness-110"}`}
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-soft-text)",
              }}
            >
              Upload
            </label>
          )}
          {sound.customFile && (
            <span
              className="flex items-center gap-1 min-w-0 px-2 py-1 rounded-lg text-xs"
              style={{
                background: "var(--accent-soft)",
                color: "var(--accent-soft-text)",
              }}
            >
              <span className="truncate min-w-0 max-w-[80px] sm:max-w-[110px]">
                {sound.customFile.name}
              </span>
              <button
                type="button"
                aria-label="remove custom file"
                onClick={() => onClearUpload(index)}
                disabled={running}
                className="shrink-0 ml-1 leading-none text-base hover:opacity-80 disabled:opacity-40"
                style={{ color: "var(--danger)" }}
              >
                ×
              </button>
            </span>
          )}

          {previewSrc && (
            <button
              type="button"
              aria-label="preview sound"
              onClick={() => {
                const a = new Audio(previewSrc);
                const p = a.play();
                if (p && typeof p.catch === "function") p.catch(() => {});
              }}
              disabled={running}
              className="shrink-0 ml-auto sm:ml-0 inline-flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-lg text-sm font-medium transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent)",
                color: "white",
              }}
            >
              <span aria-hidden="true">▶</span>
              <span className="hidden sm:inline sm:ml-1">Play</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
