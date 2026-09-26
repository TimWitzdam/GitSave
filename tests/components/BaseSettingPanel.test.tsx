// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import BaseSettingPanel from "../../src/components/dashboard/settings/BaseSettingPanel";

describe("BaseSettingPanel", () => {
  it("renders the heading and the children", () => {
    render(
      <BaseSettingPanel heading="Access tokens">
        <p>content</p>
      </BaseSettingPanel>
    );
    expect(
      screen.getByRole("heading", { name: "Access tokens" })
    ).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
