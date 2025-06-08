import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TimerSoundApp from "@/app/page";

beforeAll(() => {
  // Mock the Audio constructor to avoid errors in jsdom
  global.Audio = jest.fn().mockImplementation(() => ({ play: jest.fn() }));
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

  it("resets total time to default when cleared", () => {
    render(<TimerSoundApp />);
    const input = screen.getByLabelText(/total time/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "" } });
    expect(input.value).toBe("60");
    expect(input).toHaveClass("text-neutral-400");
  });
});
