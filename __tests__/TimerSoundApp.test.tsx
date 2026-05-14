import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
const store = new Map<string, any>();
jest.mock("@/idb", () => ({
  saveSound: jest.fn((id: string, data: any) => {
    store.set(id, data);
    return Promise.resolve();
  }),
  getSound: jest.fn((id: string) => Promise.resolve(store.get(id))),
  deleteSound: jest.fn((id: string) => {
    store.delete(id);
    return Promise.resolve();
  }),
  listSoundIds: jest.fn(() => Promise.resolve(Array.from(store.keys()))),
}));

import TimerSoundApp from "@/app/page";
import { listSoundIds, getSound } from "@/idb";

beforeAll(() => {
  // Mock the Audio constructor to avoid errors in jsdom
  global.Audio = jest.fn().mockImplementation(() => ({ play: jest.fn() }));
  // Mock createObjectURL used for custom sounds
  global.URL.createObjectURL = jest.fn(() => "blob:mock");
  global.URL.revokeObjectURL = jest.fn();
  // Mock speech synthesis for countdown
  global.speechSynthesis = { speak: jest.fn(), cancel: jest.fn() } as any;
  // Mock SpeechSynthesisUtterance constructor
  global.SpeechSynthesisUtterance = function(this: any, text: string) {
    this.text = text;
  } as any;
});

beforeEach(() => {
  (global.speechSynthesis.speak as jest.Mock).mockClear();
  (global.speechSynthesis.cancel as jest.Mock).mockClear();
  (global.URL.createObjectURL as jest.Mock).mockClear();
  (global.URL.revokeObjectURL as jest.Mock).mockClear();
  localStorage.clear();
  store.clear();
  // Reset wake lock between tests
  delete (navigator as any).wakeLock;
});

describe("TimerSoundApp", () => {
  it("shows timer icon", () => {
    render(<TimerSoundApp />);
    const icon = screen.getByAltText(/timer icon/i);
    expect(icon).toBeInTheDocument();
  });

  it("shows social links", () => {
    render(<TimerSoundApp />);
    const instagram = screen.getByLabelText(/instagram/i);
    const linkedin = screen.getByLabelText(/linkedin/i);
    expect(instagram).toBeInTheDocument();
    expect(linkedin).toBeInTheDocument();
  });
  it("disables start button when no sounds", () => {
    render(<TimerSoundApp />);
    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeDisabled();
  });

  it("defaults new sound to beep", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    expect(select.value).toBe("/sounds/beep.wav");
  });

  it("enables start button when a sound is configured", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const select = screen.getAllByRole("combobox")[0];
    fireEvent.change(select, { target: { value: "/sounds/ding.wav" } });
    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeEnabled();
  });

  it("allows selecting beep from the dropdown", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    // change away then back to beep
    fireEvent.change(select, { target: { value: "/sounds/ding.wav" } });
    expect(select.value).toBe("/sounds/ding.wav");
    fireEvent.change(select, { target: { value: "/sounds/beep.wav" } });
    expect(select.value).toBe("/sounds/beep.wav");
  });

  it("increments timer after starting", async () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() =>
      expect(screen.getByText(/elapsed 0:00/i)).toBeInTheDocument(),
    );
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() =>
      expect(screen.getByText(/elapsed 0:01/i)).toBeInTheDocument(),
    );
    jest.useRealTimers();
  });

  it("resets total time to default when cleared", () => {
    render(<TimerSoundApp />);
    const input = screen.getByLabelText(/total time/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(input).toHaveAttribute("placeholder", "1:00");
  });

  it("allows entering '1' for sound seconds", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const secondInput = screen.getByPlaceholderText("1") as HTMLInputElement;
    fireEvent.change(secondInput, { target: { value: "1" } });
    expect(secondInput.value).toBe("1");
  });

  it("removes a sound trigger after clicking remove", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const removeBtn = screen.getByLabelText(/remove sound/i);
    fireEvent.click(removeBtn);
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(screen.queryByLabelText(/remove sound/i)).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it("shows filename after uploading custom sound and clears on remove", async () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const fileInput = screen.getByLabelText(/upload custom sound/i);
    const file = new File(["a"], "sound.mp3", { type: "audio/mpeg" });
    await userEvent.upload(fileInput, file);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove custom file/i }),
      ).toBeInTheDocument(),
    );
    const removeBtn = screen.getByRole("button", {
      name: /remove custom file/i,
    });
    fireEvent.click(removeBtn);
    expect(screen.getByLabelText(/upload custom sound/i)).toBeInTheDocument();
  });

  it("shows countdown option", () => {
    render(<TimerSoundApp />);
    const checkbox = screen.getByLabelText(/official countdown/i);
    expect(checkbox).toBeInTheDocument();
  });

  it("starts countdown when option enabled", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByLabelText(/official countdown/i));
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByText(/until start/i)).toBeInTheDocument();
    // "2:00" also appears as a dropdown option; assert at least one is rendered.
    expect(screen.getAllByText("2:00").length).toBeGreaterThan(0);
    expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getAllByText("1:30").length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(90000);
    });
    expect(screen.queryByText(/until start/i)).not.toBeInTheDocument();
    expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(12);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/elapsed 0:01/i)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("starts timer immediately when countdown disabled", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(screen.queryByText(/until start/i)).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/elapsed 0:01/i)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("plays the first sound trigger", () => {
    jest.useFakeTimers();
    const playMock = jest.fn();
    (global.Audio as jest.Mock).mockImplementation(() => ({
      play: playMock,
      pause: jest.fn(),
      muted: false,
      set muted(val: boolean) {
        /* noop */
      },
    }));
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(playMock).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("preloads audio on start", () => {
    const playMock = jest.fn();
    (global.Audio as jest.Mock).mockImplementation(() => ({
      play: playMock,
      pause: jest.fn(),
      muted: false,
      set muted(val: boolean) {
        /* noop */
      },
    }));
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(playMock).toHaveBeenCalled();
  });

  it("plays multiple sound triggers at the correct times", () => {
    jest.useFakeTimers();
    const playMock = jest.fn();
    (global.Audio as jest.Mock).mockImplementation(() => ({
      play: playMock,
      pause: jest.fn(),
      muted: false,
      set muted(val: boolean) {
        /* noop */
      },
    }));
    render(<TimerSoundApp />);
    // First sound at 1s (default)
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    // Second sound at 2s
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "/sounds/ding.wav" } });
    const secondInputs = screen.getAllByPlaceholderText("1");
    fireEvent.change(secondInputs[1], { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    // After 1 second the first sound should play
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(playMock).toHaveBeenCalledTimes(3); // 2 preload + first sound

    // After another second the second sound should play
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(playMock).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it("saves configuration to localStorage", async () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.change(screen.getByLabelText(/total time/i), {
      target: { value: "90" },
    });
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem("freedive-timer-state") || "{}",
      );
      expect(stored.totalSeconds).toBe(90);
      expect(stored.sounds.length).toBe(1);
    });
  });

  it("loads configuration from localStorage", async () => {
    const stored = {
      totalSecondsInput: "80",
      totalSeconds: 80,
      includeCountdown: true,
      sounds: [
        {
          id: "a",
          second: 10,
          secondInput: "10",
          label: "Sound",
          src: "/sounds/ding.wav",
          sourceType: "default",
        },
      ],
    };
    localStorage.setItem("freedive-timer-state", JSON.stringify(stored));
    render(<TimerSoundApp />);
    const input = await screen.findByLabelText(/total time/i);
    expect((input as HTMLInputElement).value).toBe("80");
    // Wait until both selects exist (sound row's select renders after async load).
    await waitFor(() =>
      expect(screen.getAllByRole("combobox").length).toBeGreaterThan(1),
    );
    const selects = screen.getAllByRole("combobox");
    expect((selects[0] as HTMLSelectElement).value).toBe("/sounds/ding.wav");
    expect(await screen.findByLabelText(/official countdown/i)).toBeChecked();
  });

  it("persists custom sound in indexeddb", async () => {
    const { unmount } = render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const fileInput = screen.getByLabelText(/upload custom sound/i);
    const file = new File(["a"], "sound.mp3", { type: "audio/mpeg" });
    await userEvent.upload(fileInput, file);
    await waitFor(async () => {
      const keys = await listSoundIds();
      expect(keys.length).toBe(1);
    });
    const getSoundMock = getSound as jest.Mock;
    getSoundMock.mockClear();
    unmount();
    render(<TimerSoundApp />);
    await waitFor(() => expect(getSoundMock).toHaveBeenCalled());
  });

  it("disables start and shows error when a trigger exceeds total time", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const secondInput = screen.getByPlaceholderText("1") as HTMLInputElement;
    fireEvent.change(secondInput, { target: { value: "120" } });
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
    expect(
      screen.getByText(/between 1 and 60 seconds/i),
    ).toBeInTheDocument();
  });

  it("disables start when a trigger is set to zero", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const secondInput = screen.getByPlaceholderText("1") as HTMLInputElement;
    fireEvent.change(secondInput, { target: { value: "0" } });
    expect(screen.getByRole("button", { name: /start/i })).toBeDisabled();
    expect(
      screen.getByText(/between 1 and 60 seconds/i),
    ).toBeInTheDocument();
  });

  it("restores default sound after clearing a custom file so Start stays usable", async () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const fileInput = screen.getByLabelText(/upload custom sound/i);
    const file = new File(["a"], "sound.mp3", { type: "audio/mpeg" });
    await userEvent.upload(fileInput, file);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove custom file/i }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /remove custom file/i }),
    );
    const select = screen.getAllByRole("combobox")[0] as HTMLSelectElement;
    expect(select.value).toBe("/sounds/beep.wav");
    expect(screen.getByRole("button", { name: /start/i })).toBeEnabled();
  });

  it("revokes the blob URL when a custom file is cleared", async () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const file = new File(["a"], "sound.mp3", { type: "audio/mpeg" });
    await userEvent.upload(
      screen.getByLabelText(/upload custom sound/i),
      file,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove custom file/i }),
      ).toBeInTheDocument(),
    );
    (global.URL.revokeObjectURL as jest.Mock).mockClear();
    fireEvent.click(
      screen.getByRole("button", { name: /remove custom file/i }),
    );
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("revokes blob URLs on unmount", async () => {
    const { unmount } = render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const file = new File(["a"], "sound.mp3", { type: "audio/mpeg" });
    await userEvent.upload(
      screen.getByLabelText(/upload custom sound/i),
      file,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /remove custom file/i }),
      ).toBeInTheDocument(),
    );
    (global.URL.revokeObjectURL as jest.Mock).mockClear();
    unmount();
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  it("does not overwrite stored config before async load completes", async () => {
    const stored = {
      totalSecondsInput: "80",
      totalSeconds: 80,
      includeCountdown: true,
      sounds: [],
    };
    localStorage.setItem("freedive-timer-state", JSON.stringify(stored));
    render(<TimerSoundApp />);
    // Read immediately, before async load and the post-hydration save can settle.
    const right_after_mount = JSON.parse(
      localStorage.getItem("freedive-timer-state") || "{}",
    );
    expect(right_after_mount.totalSeconds).toBe(80);
    // And after hydration completes, the same data is still there.
    const input = await screen.findByLabelText(/total time/i);
    expect((input as HTMLInputElement).value).toBe("80");
    const after_hydration = JSON.parse(
      localStorage.getItem("freedive-timer-state") || "{}",
    );
    expect(after_hydration.totalSeconds).toBe(80);
  });

  it("requests a wake lock on start and releases it on stop", async () => {
    const release = jest.fn(() => Promise.resolve());
    const request = jest.fn(() => Promise.resolve({ release }));
    (navigator as any).wakeLock = { request };
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(request).toHaveBeenCalledWith("screen");
    // Let the request promise resolve so wakeLockRef is populated before stop.
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    expect(release).toHaveBeenCalled();
  });

  it("uses Date.now-based timing so elapsed reflects wall time", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(screen.getByText(/elapsed 0:05/i)).toBeInTheDocument();
    // Default 60s total - 5 elapsed = 55s remaining = 0:55
    expect(screen.getByText("0:55")).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("plays a missed cue once the tab catches up after a long throttled gap", () => {
    jest.useFakeTimers();
    const playMock = jest.fn();
    (global.Audio as jest.Mock).mockImplementation(() => ({
      play: playMock,
      pause: jest.fn(),
      muted: false,
      set muted(val: boolean) {
        /* noop */
      },
    }));
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    const secondInput = screen.getByPlaceholderText("1") as HTMLInputElement;
    fireEvent.change(secondInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    // Skip past second 3 in one jump (simulates a backgrounded tab catching up).
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    // 1 preload + 1 cue at second 3 (played exactly once even though we jumped past it).
    expect(playMock).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("accepts m:ss format for total time", () => {
    render(<TimerSoundApp />);
    const input = screen.getByLabelText(/total time/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "1:30" } });
    expect(input.value).toBe("1:30");
    // Trigger blur to normalize — already in m:ss, no change.
    fireEvent.blur(input);
    expect(input.value).toBe("1:30");
    // 1:30 = 90 seconds; a trigger at 80s should be in range.
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const secondInput = screen.getByPlaceholderText("1") as HTMLInputElement;
    fireEvent.change(secondInput, { target: { value: "80" } });
    expect(screen.getByRole("button", { name: /start/i })).toBeEnabled();
  });

  it("normalizes plain seconds into m:ss on blur", () => {
    render(<TimerSoundApp />);
    const input = screen.getByLabelText(/total time/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "90" } });
    fireEvent.blur(input);
    expect(input.value).toBe("1:30");
  });

  it("toggles dark mode and persists the choice", () => {
    render(<TimerSoundApp />);
    const toggle = screen.getByLabelText(/switch to dark mode/i);
    fireEvent.click(toggle);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("freedive-timer-theme")).toBe("dark");
    const toggleBack = screen.getByLabelText(/switch to light mode/i);
    fireEvent.click(toggleBack);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("freedive-timer-theme")).toBe("light");
  });

  it("renders one timeline marker per sound trigger", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const markers = screen.getAllByLabelText(/cue at/i);
    expect(markers).toHaveLength(2);
  });

  it("uses the AIDA-style label for the countdown checkbox", () => {
    render(<TimerSoundApp />);
    expect(
      screen.getByLabelText(
        /include 2 minute official countdown \(aida style\)/i,
      ),
    ).toBeInTheDocument();
  });

  it("only schedules announcements that fit within the chosen countdown duration", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByLabelText(/official countdown/i));
    // Pick the 30-second AIDA window.
    const durationSelect = screen.getByLabelText(/countdown start time/i);
    fireEvent.change(durationSelect, { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(0);
    });
    // At t=0 we should hear "30 seconds".
    expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    // 30-second window covers: 30, 20, 10, 5, 4, 3, 2, 1, 0 → 9 announcements.
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(9);
    // Then the main timer kicks in.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/elapsed 0:01/i)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("says \"breathe\" when the timer completes", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    // Shrink total time to 3s so the test runs fast.
    const totalInput = screen.getByLabelText(/total time/i);
    fireEvent.change(totalInput, { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      // Run past the end of the timer.
      jest.advanceTimersByTime(4000);
    });
    const spoken = (global.speechSynthesis.speak as jest.Mock).mock.calls.map(
      (c) => c[0].text,
    );
    expect(spoken).toContain("breathe");
    jest.useRealTimers();
  });

  it("persists countdownDurationSec to localStorage", async () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByLabelText(/official countdown/i));
    const durationSelect = screen.getByLabelText(/countdown start time/i);
    fireEvent.change(durationSelect, { target: { value: "60" } });
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem("freedive-timer-state") || "{}",
      );
      expect(stored.countdownDurationSec).toBe(60);
    });
  });

  it("only allows changing the countdown duration when countdown is enabled", () => {
    render(<TimerSoundApp />);
    const durationSelect = screen.getByLabelText(
      /countdown start time/i,
    ) as HTMLSelectElement;
    expect(durationSelect.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/official countdown/i));
    expect(durationSelect.disabled).toBe(false);
  });
});
