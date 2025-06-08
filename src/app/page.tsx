"use client";
import React, { useRef, useState } from "react";
import Image from "next/image";

const defaultSounds = [
  { label: "Ding", value: "/sounds/ding.wav" },
  { label: "Beep", value: "/sounds/beep.wav" },
  { label: "Long Beep", value: "/sounds/long_beep.wav" },
];

type SoundConfig = {
  second: number;
  label: string;
  src?: string; // URL or default
  customFile?: File;
  customURL?: string;
  sourceType?: "default" | "custom";
};

export default function TimerSoundApp() {
  const [totalSeconds, setTotalSeconds] = useState(60);
  const [currentSecond, setCurrentSecond] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [sounds, setSounds] = useState<SoundConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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
      { second: 1, label: "Sound", src: undefined, sourceType: undefined },
    ]);
  };

  // Remove a sound trigger
  const removeSound = (index: number) => {
    setSounds(sounds.filter((_, i) => i !== index));
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
        <div className="flex items-center gap-2 mb-2">
          <Image src="/clock.svg" alt="timer icon" width={32} height={32} />
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">
            Freedive Timer
          </h1>
        </div>
        <p className="text-neutral-600 mb-6">
          Enter your total dive time and set sound cues for important moments.
          When you’re ready, hit Start and focus on your breath.
        </p>

        <div className="flex gap-3 items-center mb-8">
          <label className="font-medium text-neutral-700 shrink-0">
            Total Time (seconds):
          </label>
          <input
            type="number"
            min={1}
            value={totalSeconds}
            disabled={running}
            onChange={(e) => setTotalSeconds(Number(e.target.value))}
            className="border border-neutral-300 rounded-lg px-3 py-1 w-24 text-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div>
          <h2 className="font-semibold mb-2 text-neutral-700">
            Sound Triggers
          </h2>
          {sounds.map((s, i) => (
            <div
              key={i}
              className="flex flex-wrap items-center gap-2 mb-2 border-b border-neutral-100 pb-2"
            >
              <label className="text-neutral-600">At</label>
              <input
                type="number"
                min={1}
                max={totalSeconds}
                value={s.second}
                disabled={running}
                onChange={(e) =>
                  updateSound(i, { second: Number(e.target.value) })
                }
                placeholder="sec"
                className="w-16 px-2 border rounded-lg text-base focus:outline-none"
              />
              <label className="text-neutral-600">sec</label>
              <input
                type="text"
                value={s.label}
                disabled={running}
                onChange={(e) => updateSound(i, { label: e.target.value })}
                placeholder="label"
                className="px-2 border rounded-lg w-32 text-base focus:outline-none"
              />
              {/* Sound select */}
              <select
                disabled={running}
                value={s.sourceType === "default" ? s.src : ""}
                onChange={(e) => selectDefaultSound(i, e.target.value)}
                className="px-2 border rounded-lg text-base bg-neutral-50"
              >
                <option value="">Select Default</option>
                {defaultSounds.map((ds) => (
                  <option key={ds.value} value={ds.value}>
                    {ds.label}
                  </option>
                ))}
              </select>
              <span className="text-neutral-400 mx-1">or</span>
              <input
                type="file"
                accept="audio/*"
                disabled={running}
                onChange={(e) => handleSoundUpload(e, i)}
                className="w-40 text-sm file:mr-2 file:py-1 file:px-2 file:bg-blue-50 file:border file:border-neutral-300 file:rounded-md file:text-blue-700 hover:file:bg-blue-100"
              />
              <button
                className="ml-1 text-red-400 font-bold px-2 rounded hover:bg-red-100 transition"
                disabled={running}
                onClick={() => removeSound(i)}
                type="button"
              >
                &times;
              </button>
              {(s.src || s.customURL) && (
                <button
                  type="button"
                  onClick={() => {
                    const a = new Audio(s.src || s.customURL!);
                    a.play();
                  }}
                  disabled={running}
                  className="ml-1 px-3 py-1 rounded-md border border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                >
                  Play
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="mt-3 px-4 py-1 border border-blue-400 text-blue-700 rounded-lg bg-blue-50 hover:bg-blue-100 transition"
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

        <div className="flex gap-4 justify-center">
          <button
            className={`px-7 py-2 rounded-lg font-bold transition ${canStart && !running
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
              }`}
            onClick={startTimer}
            disabled={running || !canStart}
          >
            Start
          </button>
          <button
            className="px-7 py-2 rounded-lg font-bold bg-neutral-200 hover:bg-neutral-300 transition"
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
      <p className="mt-10 text-neutral-500 text-xs text-center">
        Happy diving!
      </p>
    </div>
  );
}
