// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import BurgerMenuIcon from "../../src/components/icons/BurgerMenuIcon";
import ReloadIcon from "../../src/components/icons/ReloadIcon";
import UserIcon from "../../src/components/icons/UserIcon";
import GitIcon from "../../src/components/icons/GitIcon";
import MenuIcon from "../../src/components/icons/MenuIcon";
import TimeIcon from "../../src/components/icons/TimeIcon";
import ShortArrow from "../../src/components/icons/ShortArrow";

describe("icons", () => {
  it.each([
    ["BurgerMenuIcon", BurgerMenuIcon],
    ["ReloadIcon", ReloadIcon],
    ["UserIcon", UserIcon],
    ["GitIcon", GitIcon],
    ["MenuIcon", MenuIcon],
    ["TimeIcon", TimeIcon],
    ["ShortArrow", ShortArrow],
  ])("%s renders an svg", (_name, Icon) => {
    const { container } = render(<Icon />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("viewBox");
  });
});
