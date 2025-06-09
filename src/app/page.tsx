"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";
import { saveSound, deleteSound, getSound } from "../idb";

const defaultSounds = [
  { label: "Ding", value: "/sounds/ding.wav" },
  { label: "Beep", value: "/sounds/beep.wav" },
  { label: "Long Beep", value: "/sounds/long_beep.wav" },
];

const DEFAULT_SOUND = "/sounds/beep.wav";

const DEFAULT_TOTAL_SECONDS = 60;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type SoundConfig = {
  id: string;
  second: number;
  secondInput: string;
  label: string;
  src?: string; // URL or default
  customFile?: File;
  customURL?: string;
  sourceType?: "default" | "custom";
  isNew?: boolean;
  isRemoving?: boolean;
};

export default function TimerSoundApp() {
  const [totalSeconds, setTotalSeconds] = useState<number>(
    DEFAULT_TOTAL_SECONDS,
  );
  const [totalSecondsInput, setTotalSecondsInput] = useState("");
  const [currentSecond, setCurrentSecond] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [sounds, setSounds] = useState<SoundConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [includeCountdown, setIncludeCountdown] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimeouts = useRef<NodeJS.Timeout[]>([]);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(
    null,
  );
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const STORAGE_KEY = "freedive-timer-state";

  React.useEffect(() => {
    const load = async () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setTotalSecondsInput(parsed.totalSecondsInput ?? "");
          setTotalSeconds(parsed.totalSeconds ?? DEFAULT_TOTAL_SECONDS);
          setIncludeCountdown(parsed.includeCountdown ?? false);
          if (Array.isArray(parsed.sounds)) {
            const loaded = await Promise.all(
              parsed.sounds.map(async (s: SoundConfig) => {
                if (s.sourceType === "custom") {
                  const data = await getSound(s.id);
                  if (data) {
                    const url = URL.createObjectURL(data.blob);
                    s.customURL = url;
                    s.customFile = new File([data.blob], data.name, {
                      type: data.blob.type,
                    });
                    s.src = url;
                  }
                }
                return s;
              }),
            );
            setSounds(loaded);
          }
        }
      } catch {
        /* ignore malformed data */
      }
    };
    load();
  }, []);

  React.useEffect(() => {
    const minimalSounds = sounds.map(
      ({ id, second, secondInput, label, src, sourceType }) => ({
        id,
        second,
        secondInput,
        label,
        src: sourceType === "default" ? src : undefined,
        sourceType,
      }),
    );
    const data = {
      totalSecondsInput,
      totalSeconds,
      includeCountdown,
      sounds: minimalSounds,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignore write errors */
    }
  }, [totalSecondsInput, totalSeconds, sounds, includeCountdown]);

  const handleTotalSecondsChange = (val: string) => {
    const digits = val.replace(/\D/g, "");
    setTotalSecondsInput(digits);
    setTotalSeconds(digits === "" ? DEFAULT_TOTAL_SECONDS : Number(digits));
  };

  const handleSoundSecondChange = (index: number, val: string) => {
    const digits = val.replace(/\D/g, "");
    const patch: Partial<SoundConfig> = {
      secondInput: digits,
      second: digits === "" ? 1 : Number(digits),
    };
    updateSound(index, patch);
  };

  // Upload custom sound file
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
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            customFile: file,
            customURL: url,
            src: url,
            sourceType: "custom",
          }
          : s,
      ),
    );
  };

  // Select a default sound
  const selectDefaultSound = (index: number, value: string) => {
    const id = sounds[index]?.id;
    if (id) deleteSound(id);
    setSounds((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            src: value,
            sourceType: "default",
            customFile: undefined,
            customURL: undefined,
          }
          : s,
      ),
    );
  };

  // Add a new sound trigger
  const addSound = () => {
    const id = Math.random().toString(36).slice(2);
    const newSound: SoundConfig = {
      id,
      second: 1,
      secondInput: "",
      label: "Sound",
      src: DEFAULT_SOUND,
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

  // Remove a sound trigger
  const removeSound = (id: string) => {
    setSounds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isRemoving: true } : s)),
    );
    setTimeout(() => {
      const sound = sounds.find((s) => s.id === id);
      if (sound?.sourceType === "custom") {
        deleteSound(id);
      }
      setSounds((prev) => prev.filter((s) => s.id !== id));
    }, 200);
  };

  const clearCustomFile = (index: number) => {
    const id = sounds[index]?.id;
    if (id) deleteSound(id);
    setSounds((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
            ...s,
            customFile: undefined,
            customURL: undefined,
            src: undefined,
            sourceType: undefined,
          }
          : s,
      ),
    );
  };

  // Update sound details
  const updateSound = (index: number, patch: Partial<SoundConfig>) => {
    setSounds((s) =>
      s.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  // Timer logic
  const startMainTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownRemaining(null);
    setCurrentSecond(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setCurrentSecond((prev) => {
        const next = (prev ?? 0) + 1;
        // Play any sound scheduled for this second
        sounds.forEach((s) => {
          if (s.second === next && s.src) {
            const audio = new Audio(s.src);
            audio.play();
          }
        });
        if (next > totalSeconds) {
          clearInterval(intervalRef.current!);
          setRunning(false);
          return null;
        }
        return next;
      });
    }, 1000);
  };

  const startTimer = () => {
    if (running) return;
    setError(null);
    if (includeCountdown) {
      setRunning(true);
      setCountdownRemaining(120);
      countdownIntervalRef.current = setInterval(() => {
        setCountdownRemaining((prev) => (prev === null ? null : prev - 1));
      }, 1000);
      const schedule = [
        { delay: 0, text: "two minutes" },
        { delay: 30000, text: "one minute 30" },
        { delay: 60000, text: "one minute" },
        { delay: 90000, text: "30 seconds" },
        { delay: 100000, text: "20 seconds" },
        { delay: 110000, text: "10 seconds" },
        { delay: 115000, text: "5" },
        { delay: 116000, text: "4" },
        { delay: 117000, text: "3" },
        { delay: 118000, text: "2" },
        { delay: 119000, text: "1" },
        { delay: 120000, text: "official top" },
      ];
      schedule.forEach(({ delay, text }) => {
        const t = setTimeout(() => {
          window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        }, delay);
        countdownTimeouts.current.push(t);
      });
      const startTimeout = setTimeout(() => {
        startMainTimer();
      }, 120000);
      countdownTimeouts.current.push(startTimeout);
    } else {
      startMainTimer();
    }
  };

  const stopTimer = () => {
    countdownTimeouts.current.forEach((t) => clearTimeout(t));
    countdownTimeouts.current = [];
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownRemaining(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);
    setCurrentSecond(null);
  };

  // Validation
  const canStart =
    totalSeconds >= 1 && sounds.length > 0 && sounds.every((s) => s.src);
  React.useEffect(() => {
    if (!canStart && sounds.length > 0) {
      setError(
        "Please set both a trigger time and a sound for every sound trigger.",
      );
    } else {
      setError(null);
    }
  }, [sounds, totalSeconds, canStart]);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-0">
      <div className="w-full md:max-w-2xl mx-auto bg-white rounded-2xl shadow-lg px-8 py-10 border border-neutral-100">
        <Header />
        <p className="text-neutral-600 mb-6">
          Enter your total dive time and set sound cues for important moments.
          When you’re ready, hit Start and focus on your breath.
        </p>

        <TotalTimeInput
          value={totalSecondsInput}
          running={running}
          onChange={handleTotalSecondsChange}
        />

        <div>
          <h2 className="font-semibold mb-2 text-neutral-700">
            Sound Triggers
          </h2>
          <ol className="space-y-2">
            {sounds.map((s, i) => (
              <SoundRow
                key={s.id}
                sound={s}
                index={i}
                running={running}
                totalSeconds={totalSeconds}
                onSecondChange={handleSoundSecondChange}
                onUpdate={updateSound}
                onSelectDefault={selectDefaultSound}
                onUpload={handleSoundUpload}
                onClearUpload={clearCustomFile}
                onRemove={() => removeSound(s.id)}
              />
            ))}
          </ol>
          <button
            type="button"
            className="mt-3 w-full sm:w-auto px-4 py-2 rounded-full sm:rounded-md bg-blue-100 text-blue-700 font-semibold shadow hover:bg-blue-200 transition border-0 text-sm disabled:opacity-50 flex items-center justify-center"
            disabled={running}
            onClick={addSound}
          >
            + Add Sound
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <input
            id="includeCountdown"
            type="checkbox"
            className="h-4 w-4"
            checked={includeCountdown}
            disabled={running}
            onChange={(e) => setIncludeCountdown(e.target.checked)}
          />
          <label htmlFor="includeCountdown" className="text-neutral-700">
            Include countdown
          </label>
        </div>

        <div className="text-center text-3xl font-mono py-7 tracking-wider select-none">
          {countdownRemaining !== null
            ? `Countdown: ${formatTime(countdownRemaining)}`
            : currentSecond !== null
              ? `Elapsed: ${currentSecond}s / ${totalSeconds}s`
              : "Timer Ready"}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          <button
            className={`w-full sm:w-auto px-7 py-2 rounded-lg font-bold transition ${canStart && !running
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
            onClick={startTimer}
            disabled={running || !canStart}
          >
            Start
          </button>
          <button
            className="w-full sm:w-auto px-7 py-2 rounded-lg font-bold bg-neutral-200 hover:bg-neutral-300 transition"
            onClick={stopTimer}
            disabled={!running}
          >
            Stop
          </button>
        </div>
        {error && (
          <div className="mt-5 text-red-500 text-center text-sm font-medium">
            {error}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Image src="/timer.svg" alt="timer icon" width={32} height={32} />
      <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
        Freedive Timer
      </h1>
    </div>
  );
}

type TotalTimeInputProps = {
  value: string;
  running: boolean;
  onChange: (val: string) => void;
};

function TotalTimeInput({ value, running, onChange }: TotalTimeInputProps) {
  const isDefault = value === "";
  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center mb-8 w-full">
      <label
        htmlFor="totalSeconds"
        className="font-medium text-neutral-700 shrink-0"
      >
        Total Time (seconds):
      </label>
      <input
        id="totalSeconds"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        min={1}
        value={isDefault ? "" : value}
        placeholder={DEFAULT_TOTAL_SECONDS.toString()}
        disabled={running}
        onChange={(e) => onChange(e.target.value)}
        className={`border border-neutral-300 rounded-lg px-3 py-1 w-full sm:w-24 text-lg focus:outline-none focus:ring-2 focus:ring-blue-200 ${isDefault ? "text-neutral-400" : "text-black"}`}
      />
    </div>
  );
}

type SoundRowProps = {
  sound: SoundConfig;
  index: number;
  running: boolean;
  totalSeconds: number;
  onSecondChange: (index: number, val: string) => void;
  onUpdate: (index: number, patch: Partial<SoundConfig>) => void;
  onSelectDefault: (index: number, val: string) => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, index: number) => void;
  onClearUpload: (index: number) => void;
  onRemove: (id: string) => void;
};

function SoundRow({
  sound,
  index,
  running,
  totalSeconds,
  onSecondChange,
  onSelectDefault,
  onUpload,
  onClearUpload,
  onRemove,
}: SoundRowProps) {
  const isDefault = sound.secondInput === "";
  return (
    <li
      className={`relative flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-2 p-5 sm:p-2 rounded-2xl sm:rounded-lg shadow-lg sm:shadow-none bg-white max-w-xs sm:max-w-none mx-auto my-4 sm:mx-0 sm:my-0 transition-all duration-200 w-full ${sound.isNew ? "fade-in" : ""
        } ${sound.isRemoving ? "fade-out" : ""}`}
    >
      {/* Remove button */}
      <button
        className="
        absolute right-3 top-3
        sm:static sm:ml-2 sm:relative sm:right-0 sm:top-0
        text-red-500 text-xl sm:text-base
        "
        disabled={running}
        onClick={() => onRemove(sound.id)}
        type="button"
        aria-label="remove sound"
        style={{ lineHeight: 1 }}
      >
        &times;
      </button>

      {/* "At" input group */}
      <div
        className="
      flex flex-col sm:flex-row
      items-center
      w-full sm:w-auto
      gap-2 sm:gap-1
      p-3 sm:p-0
      bg-neutral-100 sm:bg-transparent
      rounded-xl sm:rounded-none
      "
      >
        <span className="text-xs sm:text-sm font-semibold text-neutral-500 mb-1 sm:mb-0">
          At
        </span>
        <input
          id={`seconds-input-${index}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          max={totalSeconds}
          value={isDefault ? "" : sound.secondInput}
          placeholder="1"
          disabled={running}
          onChange={(e) => onSecondChange(index, e.target.value)}
          className={`
          text-center
          w-16 sm:w-14
          px-2 py-2 sm:px-2 sm:py-1
          rounded-lg border border-neutral-300
          bg-white text-base font-semibold focus:outline-none
          ${isDefault ? "text-neutral-400" : "text-black"}
        `}
          autoComplete="off"
        />
        <span className="text-xs sm:text-sm text-neutral-500">seconds</span>
      </div>

      {/* Play + Dropdown */}
      <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-center">
        <span className="text-sm font-medium text-neutral-500">Play:</span>
        <select
          disabled={running}
          value={sound.sourceType === "default" ? sound.src : ""}
          onChange={(e) => onSelectDefault(index, e.target.value)}
          className="
          rounded-full sm:rounded-lg
          px-4 py-2 sm:px-2 sm:py-1
          bg-neutral-200 sm:bg-neutral-50
          text-black text-sm focus:outline-none
          w-auto
        "
        >
          {defaultSounds.map((ds) => (
            <option key={ds.value} value={ds.value}>
              {ds.label}
            </option>
          ))}
        </select>
      </div>

      {/* or separator */}
      <div className="text-xs text-neutral-400 text-center w-full sm:w-auto">
        or
      </div>

      {/* Upload and Play row */}
      <div className="flex flex-row items-center gap-2 w-full sm:w-auto justify-center">
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
            className="
            rounded-full sm:rounded-md
            px-4 py-2 sm:px-2 sm:py-1
            bg-blue-100 text-blue-700 text-sm font-medium cursor-pointer
            shadow hover:bg-blue-200
          "
          >
            Upload
          </label>
        )}
        {sound.customFile && (
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full sm:rounded-md bg-neutral-200 text-neutral-600 text-xs truncate max-w-[100px]">
              {sound.customFile.name}
            </span>
            <button
              type="button"
              aria-label="remove custom file"
              onClick={() => onClearUpload(index)}
              className="text-red-400 text-base"
              disabled={running}
            >
              &times;
            </button>
          </div>
        )}
        {(sound.src || sound.customURL) && (
          <button
            type="button"
            onClick={() => {
              const a = new Audio(sound.src || sound.customURL!);
              a.play();
            }}
            disabled={running}
            className="
            rounded-full sm:rounded-md
            px-4 py-2 sm:px-2 sm:py-1
            bg-green-100 text-green-700 text-sm font-semibold shadow hover:bg-green-200
          "
          >
            Play
          </button>
        )}
      </div>
    </li>
  );
}

function Footer() {
  return (
    <>
      <p className="mt-10 text-black text-xs text-center">Happy diving!</p>
      <div className="mt-2 flex items-center justify-center gap-3 text-neutral-500 text-xs">
        <span>Made by Quest Henkart</span>
        <a
          href="https://www.instagram.com/questhenkart"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <Image
            src="/instagram.svg"
            alt="instagram icon"
            width={16}
            height={16}
          />
        </a>
        <a
          href="https://www.linkedin.com/in/questh/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
        >
          <Image
            src="/linkedin.svg"
            alt="linkedin icon"
            width={16}
            height={16}
          />
        </a>
      </div>
    </>
  );
}
