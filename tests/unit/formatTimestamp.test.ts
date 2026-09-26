import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatTimestamp } from "../../src/lib/formatTimestamp";

const NOW = new Date("2026-01-15T12:00:00.000Z");

function secondsBeforeNow(seconds: number) {
  return new Date(NOW.getTime() - seconds * 1000).toISOString();
}

describe("formatTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for timestamps less than a minute old", () => {
    expect(formatTimestamp(secondsBeforeNow(0))).toBe("Just now");
    expect(formatTimestamp(secondsBeforeNow(59))).toBe("Just now");
  });

  it("returns 'Just now' for timestamps in the future", () => {
    expect(formatTimestamp(secondsBeforeNow(-120))).toBe("Just now");
  });

  it("formats minutes with correct pluralization", () => {
    expect(formatTimestamp(secondsBeforeNow(60))).toBe("1 minute ago");
    expect(formatTimestamp(secondsBeforeNow(120))).toBe("2 minutes ago");
    expect(formatTimestamp(secondsBeforeNow(59 * 60))).toBe("59 minutes ago");
  });

  it("formats hours with correct pluralization", () => {
    expect(formatTimestamp(secondsBeforeNow(60 * 60))).toBe("1 hour ago");
    expect(formatTimestamp(secondsBeforeNow(2 * 60 * 60))).toBe("2 hours ago");
    expect(formatTimestamp(secondsBeforeNow(23 * 60 * 60))).toBe(
      "23 hours ago"
    );
  });

  it("formats days with correct pluralization", () => {
    expect(formatTimestamp(secondsBeforeNow(24 * 60 * 60))).toBe("1 day ago");
    expect(formatTimestamp(secondsBeforeNow(2 * 24 * 60 * 60))).toBe(
      "2 days ago"
    );
    expect(formatTimestamp(secondsBeforeNow(29 * 24 * 60 * 60))).toBe(
      "29 days ago"
    );
  });

  it("falls back to a local date for timestamps 30 days or older", () => {
    const oldDate = new Date(2025, 10, 16, 10, 0, 0);
    expect(formatTimestamp(oldDate.toISOString())).toBe(
      oldDate.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    );
    expect(formatTimestamp(oldDate.toISOString())).toMatch(
      /^\d{2}\.\d{2}\.\d{4}$/
    );
  });
});
