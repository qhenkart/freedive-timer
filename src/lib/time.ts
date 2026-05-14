// Format a non-negative whole number of seconds as m:ss.
export function formatTime(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Parse user input as either plain seconds ("90") or m:ss ("1:30"). Returns null
// for unrecognised input. Empty string returns null so the caller can use a default.
export function parseTimeInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  if (trimmed.includes(":")) {
    const [mStr, sStr = ""] = trimmed.split(":");
    if (!/^\d+$/.test(mStr) || !/^\d*$/.test(sStr)) return null;
    const m = Number(mStr);
    const s = sStr === "" ? 0 : Number(sStr);
    if (s >= 60) return null;
    return m * 60 + s;
  }
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
}

// Strip a partially-typed time input down to the characters the format allows.
// Used as a controlled-input sanitizer so users can type "1:30" naturally.
export function sanitizeTimeInput(raw: string): string {
  // Keep digits and a single colon. Drop everything else.
  let out = "";
  let sawColon = false;
  for (const ch of raw) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else if (ch === ":" && !sawColon && out.length > 0) {
      out += ":";
      sawColon = true;
    }
  }
  return out;
}
