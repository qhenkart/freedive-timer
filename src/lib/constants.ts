export const defaultSounds = [
  { label: "Ding", value: "/sounds/ding.wav" },
  { label: "Beep", value: "/sounds/beep.wav" },
  { label: "Long Beep", value: "/sounds/long_beep.wav" },
] as const;

export const DEFAULT_SOUND = "/sounds/beep.wav";
export const DEFAULT_TOTAL_SECONDS = 60;
export const STORAGE_KEY = "freedive-timer-state";
export const THEME_STORAGE_KEY = "freedive-timer-theme";
export const DEFAULT_COUNTDOWN_SEC = 120;
export const TIMER_TICK_MS = 200;

// AIDA-style "official top" countdown announcements, keyed by seconds remaining.
// When a user picks a shorter countdown (e.g. 30s), we filter to announcements
// at or below that mark.
export const COUNTDOWN_ANNOUNCEMENTS: readonly {
  remainingSec: number;
  text: string;
}[] = [
  { remainingSec: 120, text: "two minutes" },
  { remainingSec: 90, text: "one minute 30" },
  { remainingSec: 60, text: "one minute" },
  { remainingSec: 30, text: "30 seconds" },
  { remainingSec: 20, text: "20 seconds" },
  { remainingSec: 10, text: "10 seconds" },
  { remainingSec: 5, text: "5" },
  { remainingSec: 4, text: "4" },
  { remainingSec: 3, text: "3" },
  { remainingSec: 2, text: "2" },
  { remainingSec: 1, text: "1" },
  { remainingSec: 0, text: "official top" },
];

export const COUNTDOWN_OPTIONS: readonly { value: number; label: string }[] = [
  { value: 120, label: "2:00" },
  { value: 90, label: "1:30" },
  { value: 60, label: "1:00" },
  { value: 30, label: "0:30" },
  { value: 20, label: "0:20" },
  { value: 10, label: "0:10" },
];

export const TIMER_END_PHRASE = "breathe";
