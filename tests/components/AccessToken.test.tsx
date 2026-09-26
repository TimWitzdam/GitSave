// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessToken from "../../src/components/dashboard/settings/AccessToken";

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "GitHub token",
    editClick: vi.fn(),
    deleteClick: vi.fn(),
    ...overrides,
  };
}

function menuContainer() {
  return screen.getByRole("button", { name: "Edit" }).parentElement!;
}

describe("AccessToken", () => {
  it("renders the token name", () => {
    render(<AccessToken {...createProps()} />);
    expect(screen.getByText("GitHub token")).toBeInTheDocument();
  });

  it("hides the menu by default and toggles it", async () => {
    const { container } = render(<AccessToken {...createProps()} />);
    expect(menuContainer()).toHaveClass("hidden");
    await userEvent.click(container.querySelector("button")!);
    expect(menuContainer()).not.toHaveClass("hidden");
  });

  it("closes the menu when clicking outside", async () => {
    const { container } = render(<AccessToken {...createProps()} />);
    await userEvent.click(container.querySelector("button")!);
    expect(menuContainer()).not.toHaveClass("hidden");

    fireEvent.mouseDown(document.body);
    expect(menuContainer()).toHaveClass("hidden");
  });

  it("calls editClick", async () => {
    const props = createProps();
    const { container } = render(<AccessToken {...props} />);
    await userEvent.click(container.querySelector("button")!);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(props.editClick).toHaveBeenCalledOnce();
  });

  it("calls deleteClick", async () => {
    const props = createProps();
    const { container } = render(<AccessToken {...props} />);
    await userEvent.click(container.querySelector("button")!);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(props.deleteClick).toHaveBeenCalledOnce();
  });
});
