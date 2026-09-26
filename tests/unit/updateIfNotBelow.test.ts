import { describe, expect, it, vi } from "vitest";
import updateIfNotBelow from "../../src/lib/updateIfNotBelow";

function changeEvent(value: string) {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

describe("updateIfNotBelow", () => {
  it("sets the parsed value when it is at or above the minimum", () => {
    const setValue = vi.fn();
    updateIfNotBelow(changeEvent("5"), setValue);
    expect(setValue).toHaveBeenCalledWith(5);
  });

  it("clamps values below the default minimum of 1", () => {
    const setValue = vi.fn();
    updateIfNotBelow(changeEvent("0"), setValue);
    expect(setValue).toHaveBeenCalledWith(1);

    updateIfNotBelow(changeEvent("-10"), setValue);
    expect(setValue).toHaveBeenLastCalledWith(1);
  });

  it("accepts the minimum value itself", () => {
    const setValue = vi.fn();
    updateIfNotBelow(changeEvent("1"), setValue);
    expect(setValue).toHaveBeenCalledWith(1);
  });

  it("respects a custom minimum value", () => {
    const setValue = vi.fn();
    updateIfNotBelow(changeEvent("3"), setValue, 5);
    expect(setValue).toHaveBeenCalledWith(5);

    updateIfNotBelow(changeEvent("7"), setValue, 5);
    expect(setValue).toHaveBeenLastCalledWith(7);
  });

  it("truncates decimal input to an integer", () => {
    const setValue = vi.fn();
    updateIfNotBelow(changeEvent("4.9"), setValue);
    expect(setValue).toHaveBeenCalledWith(4);
  });
});
