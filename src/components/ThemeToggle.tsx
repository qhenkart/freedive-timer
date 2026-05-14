"use client";
import { useTheme } from "@/hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggle, mounted } = useTheme();
  // Hide until mounted so the rendered icon matches the actual theme (avoids
  // hydration mismatch with the inline init script).
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="w-9 h-9 rounded-full border opacity-0"
        style={{ borderColor: "var(--card-border)" }}
      />
    );
  }
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-9 h-9 rounded-full border flex items-center justify-center transition hover:scale-105 active:scale-95"
      style={{
        borderColor: "var(--card-border)",
        background: "var(--bg-elev)",
        color: "var(--text-secondary)",
      }}
    >
      {isDark ? (
        // sun
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m4.93 19.07 1.41-1.41" />
          <path d="m17.66 6.34 1.41-1.41" />
        </svg>
      ) : (
        // moon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
