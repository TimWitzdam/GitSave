// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PhoneNavMenu from "../../src/components/PhoneNavMenu";

const links = [
  { name: "Overview", href: "/dashboard/overview" },
  { name: "Schedules", href: "/dashboard/schedules/" },
  { name: "History", href: "/dashboard/history/" },
  { name: "Settings", href: "/dashboard/settings/" },
];

describe("PhoneNavMenu", () => {
  it("renders every link with its href", () => {
    render(<PhoneNavMenu links={links} />);
    for (const link of links) {
      expect(screen.getByRole("link", { name: link.name })).toHaveAttribute(
        "href",
        link.href
      );
    }
  });

  it("renders the close button", () => {
    render(<PhoneNavMenu links={links} />);
    expect(document.getElementById("close-phone-nav-menu")).not.toBeNull();
  });
});
