"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";

const defaultSounds = [
  { label: "Ding", value: "/sounds/ding.wav" },
  { label: "Beep", value: "/sounds/beep.wav" },
  { label: "Long Beep", value: "/sounds/long_beep.wav" },
];

const DEFAULT_SOUND = "/sounds/beep.wav";

const DEFAULT_TOTAL_SECONDS = 60;

type SoundConfig = {
  second: number;
  secondInput: string;
  label: string;
  src?: string; // URL or default
  customFile?: File;
  customURL?: string;
  sourceType?: "default" | "custom";
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
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
    setSounds([
      ...sounds,
      {
        second: 1,
        secondInput: "",
        label: "Sound",
        src: DEFAULT_SOUND,
        sourceType: "default",
      },
    ]);
  };

  // Remove a sound trigger
  const removeSound = (index: number) => {
    setSounds(sounds.filter((_, i) => i !== index));
  };

  const clearCustomFile = (index: number) => {
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
  const startTimer = () => {
    if (running) return;
    setCurrentSecond(0);
    setRunning(true);
    setError(null);
    intervalRef.current = setInterval(() => {
      setCurrentSecond((prev) => {
        if (prev === null) return 0;
        const next = prev + 1;
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

  const stopTimer = () => {
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
      <div className="w-full max-w-xl mx-auto bg-white rounded-2xl shadow-lg px-8 py-10 border border-neutral-100">
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
          {sounds.map((s, i) => (
            <SoundRow
              key={i}
              sound={s}
              index={i}
              running={running}
              totalSeconds={totalSeconds}
              onSecondChange={handleSoundSecondChange}
              onUpdate={updateSound}
              onSelectDefault={selectDefaultSound}
              onUpload={handleSoundUpload}
              onClearUpload={clearCustomFile}
              onRemove={removeSound}
            />
          ))}
          <button
            type="button"
            className="mt-3 px-4 py-1 border border-blue-400 text-blue-700 rounded-lg bg-blue-50 hover:bg-blue-100 transition w-full sm:w-auto"
            disabled={running}
            onClick={addSound}
          >
            + Add Sound
          </button>
        </div>

        <div className="text-center text-3xl font-mono py-7 tracking-wider select-none">
          {currentSecond !== null
            ? `Elapsed: ${currentSecond}s / ${totalSeconds}s`
            : "Timer Ready"}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
          <button
            className={`w-full sm:w-auto px-7 py-2 rounded-lg font-bold transition ${
              canStart && !running
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
  onRemove: (index: number) => void;
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
    <div className="flex flex-wrap items-center gap-2 mb-2 border-b border-neutral-100 pb-2">
      <label className="text-neutral-600">At</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        min={1}
        max={totalSeconds}
        value={isDefault ? "" : sound.secondInput}
        placeholder={"1"}
        disabled={running}
        onChange={(e) => onSecondChange(index, e.target.value)}
        className={`w-full sm:w-16 px-2 border rounded-lg text-base focus:outline-none ${isDefault ? "text-neutral-400" : "text-black"}`}
      />

      <label className="text-neutral-600">seconds, Play: </label>
      <select
        disabled={running}
        value={sound.sourceType === "default" ? sound.src : ""}
        onChange={(e) => onSelectDefault(index, e.target.value)}
        className="px-2 border rounded-lg text-base bg-neutral-50 w-full sm:w-auto text-black"
      >
        <option value={DEFAULT_SOUND}>Default</option>
        {defaultSounds.map((ds) => (
          <option key={ds.value} value={ds.value}>
            {ds.label}
          </option>
        ))}
      </select>
      <span className="text-neutral-400 mx-1">or</span>
      <input
        key={sound.customFile ? sound.customFile.name : "new"}
        id={`custom-file-${index}`}
        type="file"
        accept="audio/*"
        disabled={running}
        onChange={(e) => onUpload(e, index)}
        className="hidden"
      />
      {!sound.customFile ? (
        <label
          htmlFor={`custom-file-${index}`}
          aria-label="upload custom sound"
          className="cursor-pointer text-center text-sm px-2 py-1 bg-blue-50 border border-neutral-300 rounded-md text-blue-700 hover:bg-blue-100"
        >
          Choose File
        </label>
      ) : (
        <div className="flex items-center w-full sm:w-auto group">
          <span className="px-2 py-1 text-sm border border-neutral-300 rounded-md bg-neutral-50 mr-1 text-gray-500 whitespace-nowrap">
            {sound.customFile.name}
          </span>
          <button
            type="button"
            aria-label="remove custom file"
            onClick={() => onClearUpload(index)}
            className="text-red-400 font-bold px-2 rounded hover:bg-red-100 transition opacity-0 group-hover:opacity-100"
            disabled={running}
          >
            &times;
          </button>
        </div>
      )}
      <button
        className="ml-1 text-red-400 font-bold px-2 rounded hover:bg-red-100 transition"
        disabled={running}
        onClick={() => onRemove(index)}
        type="button"
      >
        &times;
      </button>
      {(sound.src || sound.customURL) && (
        <button
          type="button"
          onClick={() => {
            const a = new Audio(sound.src || sound.customURL!);
            a.play();
          }}
          disabled={running}
          className="ml-1 px-3 py-1 rounded-md border border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
        >
          Play
        </button>
      )}
    </div>
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
