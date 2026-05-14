import type { SoundConfig } from "./types";

export const effectiveSrc = (s: SoundConfig): string | undefined =>
  s.sourceType === "custom" ? s.customURL : s.defaultSrc;
