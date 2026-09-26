// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import BaseInput from "../../src/components/BaseInput";

describe("BaseInput", () => {
  it("renders an input of the given type", () => {
    render(<BaseInput type="password" />);
    const input = document.querySelector("input");
    expect(input).toHaveAttribute("type", "password");
  });

  it("renders a label linked to the input name", () => {
    render(<BaseInput type="text" label="Name" name="name" />);
    const label = screen.getByText("Name");
    expect(label).toHaveAttribute("for", "name");
  });

  it("does not render a label when none is given", () => {
    render(<BaseInput type="text" name="name" />);
    expect(document.querySelector("label")).toBeNull();
  });

  it("forwards value, placeholder and name", () => {
    render(
      <BaseInput
        type="text"
        value="hello"
        placeholder="Type here"
        name="greeting"
      />
    );
    const input = screen.getByPlaceholderText("Type here");
    expect(input).toHaveValue("hello");
    expect(input).toHaveAttribute("name", "greeting");
  });

  it("marks the input as required", () => {
    render(<BaseInput type="text" name="name" required />);
    expect(document.querySelector("input")).toBeRequired();
  });

  it("calls onChange when the user types", () => {
    const onChange = vi.fn();
    render(
      <BaseInput type="text" placeholder="Type here" onChange={onChange} />
    );
    fireEvent.change(screen.getByPlaceholderText("Type here"), {
      target: { value: "abc" },
    });
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("applies the custom width class", () => {
    render(<BaseInput type="number" width="sm:w-24" />);
    expect(document.querySelector("input")?.className).toContain("sm:w-24");
  });
});
