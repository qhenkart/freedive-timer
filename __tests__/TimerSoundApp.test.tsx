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
  global.URL.createObjectURL = jest.fn();
  // Mock speech synthesis for countdown
  global.speechSynthesis = { speak: jest.fn() } as any;
  // Mock SpeechSynthesisUtterance constructor
  global.SpeechSynthesisUtterance = function(this: any, text: string) {
    this.text = text;
  } as any;
});

beforeEach(() => {
  (global.speechSynthesis.speak as jest.Mock).mockClear();
  localStorage.clear();
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
    const select = screen.getByRole("combobox") as HTMLSelectElement;
    expect(select.value).toBe("/sounds/beep.wav");
  });

  it("enables start button when a sound is configured", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "/sounds/ding.wav" } });
    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeEnabled();
  });

  it("allows selecting beep from the dropdown", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const select = screen.getByRole("combobox") as HTMLSelectElement;
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
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));

    await waitFor(() =>
      expect(screen.getByText(/elapsed: 0s/i)).toBeInTheDocument(),
    );
    // Advance one second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    await waitFor(() =>
      expect(screen.getByText(/elapsed: 1s/i)).toBeInTheDocument(),
    );
    expect(screen.getByText(/elapsed: 1s/i)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("resets total time to default when cleared", () => {
    render(<TimerSoundApp />);
    const input = screen.getByLabelText(/total time/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("");
    expect(input).toHaveAttribute("placeholder", "60");
    expect(input).toHaveClass("text-neutral-400");
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
    const checkbox = screen.getByLabelText(/include countdown/i);
    expect(checkbox).toBeInTheDocument();
  });

  it("starts countdown when option enabled", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByLabelText(/include countdown/i));
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    act(() => {
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByText(/countdown: 2:00/i)).toBeInTheDocument();
    expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(1);
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getByText(/countdown: 1:30/i)).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(90000);
    });
    expect(screen.queryByText(/countdown:/i)).not.toBeInTheDocument();
    expect(global.speechSynthesis.speak).toHaveBeenCalledTimes(12);
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/elapsed: 1s/i)).toBeInTheDocument();
    jest.useRealTimers();
  });

  it("starts timer immediately when countdown disabled", () => {
    jest.useFakeTimers();
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "/sounds/ding.wav" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(global.speechSynthesis.speak).not.toHaveBeenCalled();
    expect(screen.queryByText(/countdown:/i)).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/elapsed: 1s/i)).toBeInTheDocument();
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
    fireEvent.change(screen.getByRole("combobox"), {
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
    fireEvent.change(screen.getByRole("combobox"), {
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
    fireEvent.change(screen.getByRole("combobox"), {
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
    const select = await screen.findByRole("combobox");
    expect((select as HTMLSelectElement).value).toBe("/sounds/ding.wav");
    expect(await screen.findByLabelText(/include countdown/i)).toBeChecked();
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
});
