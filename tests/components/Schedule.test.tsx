// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Schedule from "../../src/components/dashboard/Schedule";

function createProps(overrides: Partial<Parameters<typeof Schedule>[0]> = {}) {
  return {
    name: "My repository",
    link: "https://github.com/example/repo.git",
    paused: false,
    lastBackup: "5 minutes ago",
    success: true,
    editClick: vi.fn(),
    backupNowClick: vi.fn(),
    pauseClick: vi.fn(),
    deleteClick: vi.fn(),
    ...overrides,
  };
}

function menuContainer() {
  return screen.getByRole("button", { name: "Edit" }).parentElement!;
}

function menuButton(container: HTMLElement) {
  return container.querySelector("button") as HTMLButtonElement;
}

describe("Schedule", () => {
  it("renders the schedule details", () => {
    render(<Schedule {...createProps()} />);
    expect(screen.getByText("My repository")).toBeInTheDocument();
    expect(
      screen.getByText("https://github.com/example/repo.git")
    ).toBeInTheDocument();
    expect(screen.getByText("Last backup: 5 minutes ago")).toBeInTheDocument();
  });

  it("shows a green dot for the last successful backup", () => {
    render(<Schedule {...createProps({ success: true })} />);
    expect(document.querySelector(".bg-green")).not.toBeNull();
  });

  it("shows a red dot when the last backup failed", () => {
    render(<Schedule {...createProps({ success: false })} />);
    expect(document.querySelector(".bg-red")).not.toBeNull();
  });

  it("shows an orange dot when paused, even after a successful backup", () => {
    render(<Schedule {...createProps({ paused: true, success: true })} />);
    expect(document.querySelector(".bg-orange")).not.toBeNull();
    expect(document.querySelector(".bg-green")).toBeNull();
  });

  it("hides the menu by default and toggles it", async () => {
    const { container } = render(<Schedule {...createProps()} />);
    expect(menuContainer()).toHaveClass("hidden");
    await userEvent.click(menuButton(container));
    expect(menuContainer()).not.toHaveClass("hidden");
  });

  it("closes the menu when clicking outside", async () => {
    const { container } = render(<Schedule {...createProps()} />);
    await userEvent.click(menuButton(container));
    expect(menuContainer()).not.toHaveClass("hidden");

    fireEvent.mouseDown(document.body);
    expect(menuContainer()).toHaveClass("hidden");
  });

  it("calls the edit handler", async () => {
    const props = createProps();
    const { container } = render(<Schedule {...props} />);
    await userEvent.click(menuButton(container));
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(props.editClick).toHaveBeenCalledOnce();
  });

  it("calls the backup now handler", async () => {
    const props = createProps();
    const { container } = render(<Schedule {...props} />);
    await userEvent.click(menuButton(container));
    await userEvent.click(screen.getByRole("button", { name: "Backup now" }));
    expect(props.backupNowClick).toHaveBeenCalledOnce();
  });

  it("calls the pause handler with a Pause label when running", async () => {
    const props = createProps({ paused: false });
    const { container } = render(<Schedule {...props} />);
    await userEvent.click(menuButton(container));
    await userEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(props.pauseClick).toHaveBeenCalledOnce();
  });

  it("shows Resume instead of Pause when paused", async () => {
    const props = createProps({ paused: true });
    const { container } = render(<Schedule {...props} />);
    await userEvent.click(menuButton(container));
    expect(
      screen.queryByRole("button", { name: "Pause" })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(props.pauseClick).toHaveBeenCalledOnce();
  });

  it("calls the delete handler", async () => {
    const props = createProps();
    const { container } = render(<Schedule {...props} />);
    await userEvent.click(menuButton(container));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(props.deleteClick).toHaveBeenCalledOnce();
  });
});
