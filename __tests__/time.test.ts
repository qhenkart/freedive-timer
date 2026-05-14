import { formatTime, parseTimeInput, sanitizeTimeInput } from "@/lib/time";

describe("formatTime", () => {
  it("formats whole seconds as m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(60)).toBe("1:00");
    expect(formatTime(90)).toBe("1:30");
    expect(formatTime(3725)).toBe("62:05");
  });

  it("clamps negatives to zero", () => {
    expect(formatTime(-10)).toBe("0:00");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(59.9)).toBe("0:59");
  });
});

describe("parseTimeInput", () => {
  it("parses plain seconds", () => {
    expect(parseTimeInput("0")).toBe(0);
    expect(parseTimeInput("60")).toBe(60);
    expect(parseTimeInput("125")).toBe(125);
  });

  it("parses m:ss", () => {
    expect(parseTimeInput("1:30")).toBe(90);
    expect(parseTimeInput("0:30")).toBe(30);
    expect(parseTimeInput("2:00")).toBe(120);
  });

  it("accepts an open trailing colon", () => {
    expect(parseTimeInput("1:")).toBe(60);
  });

  it("returns null for empty input", () => {
    expect(parseTimeInput("")).toBeNull();
    expect(parseTimeInput("   ")).toBeNull();
  });

  it("returns null for invalid formats", () => {
    expect(parseTimeInput("abc")).toBeNull();
    expect(parseTimeInput("1:60")).toBeNull(); // seconds component must be < 60
    expect(parseTimeInput("1:5x")).toBeNull();
  });
});

describe("sanitizeTimeInput", () => {
  it("keeps digits and a single colon", () => {
    expect(sanitizeTimeInput("1:30")).toBe("1:30");
    expect(sanitizeTimeInput("90")).toBe("90");
  });

  it("strips disallowed characters", () => {
    expect(sanitizeTimeInput("1m30s")).toBe("130");
    expect(sanitizeTimeInput("a1:b2c")).toBe("1:2");
  });

  it("ignores a leading colon", () => {
    expect(sanitizeTimeInput(":30")).toBe("30");
  });

  it("collapses multiple colons to one", () => {
    expect(sanitizeTimeInput("1::30")).toBe("1:30");
    expect(sanitizeTimeInput("1:2:3")).toBe("1:23");
  });
});
