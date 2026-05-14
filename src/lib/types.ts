export type SoundConfig = {
  id: string;
  second: number;
  secondInput: string;
  defaultSrc: string;
  customFile?: File;
  customURL?: string;
  sourceType: "default" | "custom";
  isNew?: boolean;
  isRemoving?: boolean;
};

export type StoredSound = {
  id: string;
  second: number;
  secondInput: string;
  defaultSrc?: string;
  sourceType?: "default" | "custom";
  // Legacy single-src field from earlier versions.
  src?: string;
};

export type StoredState = {
  totalSecondsInput?: string;
  totalSeconds?: number;
  includeCountdown?: boolean;
  countdownDurationSec?: number;
  sounds?: StoredSound[];
};

export type Theme = "light" | "dark";

export type WakeLockSentinelLike = { release: () => Promise<void> };
