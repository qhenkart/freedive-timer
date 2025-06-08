import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TimerSoundApp from "@/app/page";

beforeAll(() => {
  // Mock the Audio constructor to avoid errors in jsdom
  global.Audio = jest.fn().mockImplementation(() => ({ play: jest.fn() }));
});

describe("TimerSoundApp", () => {
  it("disables start button when no sounds", () => {
    render(<TimerSoundApp />);
    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeDisabled();
  });

  it("enables start button when a sound is configured", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "/sounds/ding.wav" } });
    const startButton = screen.getByRole("button", { name: /start/i });
    expect(startButton).toBeEnabled();
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
});
