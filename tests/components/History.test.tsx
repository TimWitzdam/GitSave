// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import History from "../../src/components/dashboard/History";

const NOW = new Date("2026-01-15T12:00:00.000Z");

describe("History", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a successful backup", () => {
    render(
      <History
        timestamp={NOW.toISOString()}
        name="My repository"
        success={true}
        message={null}
      />
    );
    expect(screen.getByText("My repository")).toBeInTheDocument();
    expect(screen.getByText("Backup successful")).toBeInTheDocument();
    expect(screen.getByText("Just now")).toBeInTheDocument();
    expect(document.querySelector(".bg-green")).not.toBeNull();
    expect(document.querySelector(".bg-red")).toBeNull();
  });

  it("renders a failed backup with its message", () => {
    render(
      <History
        timestamp={NOW.toISOString()}
        name="My repository"
        success={false}
        message="Missing privileges or cannot access"
      />
    );
    expect(
      screen.getByText("Backup failed (Missing privileges or cannot access)")
    ).toBeInTheDocument();
    expect(document.querySelector(".bg-red")).not.toBeNull();
    expect(document.querySelector(".bg-green")).toBeNull();
  });

  it("renders a relative timestamp", () => {
    const tenMinutesAgo = new Date(NOW.getTime() - 10 * 60 * 1000);
    render(
      <History
        timestamp={tenMinutesAgo.toISOString()}
        name="My repository"
        success={true}
        message={null}
      />
    );
    expect(screen.getByText("10 minutes ago")).toBeInTheDocument();
  });

  it("draws a separator unless it is the last entry", () => {
    const { rerender } = render(
      <History
        timestamp={NOW.toISOString()}
        name="a"
        success={true}
        message={null}
      />
    );
    expect(document.querySelector(".border-b")).not.toBeNull();

    rerender(
      <History
        timestamp={NOW.toISOString()}
        name="a"
        success={true}
        message={null}
        last
      />
    );
    expect(document.querySelector(".border-b")).toBeNull();
  });
});
