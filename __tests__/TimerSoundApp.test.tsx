import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TimerSoundApp from "@/app/page";

beforeAll(() => {
  // Mock the Audio constructor to avoid errors in jsdom
  global.Audio = jest.fn().mockImplementation(() => ({ play: jest.fn() }));
  // Mock createObjectURL used for custom sounds
  global.URL.createObjectURL = jest.fn();
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

  it("numbers sound triggers and shows remove button after number", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const items = screen.getAllByRole("listitem");
    expect(items[0].textContent).toMatch(/^1.*×/);
    expect(items[1].textContent).toMatch(/^2.*×/);
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

  it("keeps play button inline on larger screens", () => {
    render(<TimerSoundApp />);
    fireEvent.click(screen.getByRole("button", { name: /add sound/i }));
    const playButton = screen.getByRole("button", { name: /play/i });
    expect(playButton.parentElement).toHaveClass("sm:flex-nowrap");
  });
});
