// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BaseButton from "../../src/components/BaseButton";

describe("BaseButton", () => {
  it("renders its children as a button", () => {
    render(<BaseButton>Save</BaseButton>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
  });

  it("uses the primary style by default", () => {
    render(<BaseButton>Save</BaseButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-bg-300");
  });

  it("uses the secondary style when requested", () => {
    render(<BaseButton type="secondary">Cancel</BaseButton>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button).toHaveClass("bg-transparent");
    expect(button).not.toHaveClass("bg-bg-300");
  });

  it("supports submit and reset button types", () => {
    const { rerender } = render(
      <BaseButton buttonType="submit">Save</BaseButton>
    );
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
    rerender(<BaseButton buttonType="reset">Reset</BaseButton>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "reset");
  });

  it("applies full width styling", () => {
    render(<BaseButton fullWidth>Save</BaseButton>);
    expect(screen.getByRole("button")).toHaveClass("w-full");
  });

  it("renders the given id", () => {
    render(<BaseButton id="cancel-add">Cancel</BaseButton>);
    expect(screen.getByRole("button")).toHaveAttribute("id", "cancel-add");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(<BaseButton onClick={onClick}>Save</BaseButton>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
