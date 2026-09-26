// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AccessTokensSettings from "../../src/components/dashboard/settings/AccessTokensSettings";
import {
  jsonResponse,
  silenceJsdomErrors,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

const tokens = [
  { id: 1, name: "GitHub token" },
  { id: 2, name: "GitLab token" },
];

function openMenu(container: HTMLElement, index: number, name: string) {
  const menuButton = Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent === ""
  )[index];
  return userEvent.click(menuButton).then(() =>
    userEvent.click(screen.getAllByRole("button", { name })[0])
  );
}

describe("AccessTokensSettings", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(tokens));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads and renders the access tokens", async () => {
    render(<AccessTokensSettings />);
    expect(await screen.findByText("GitHub token")).toBeInTheDocument();
    expect(screen.getByText("GitLab token")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/access-tokens", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("shows an empty state", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    render(<AccessTokensSettings />);
    expect(
      await screen.findByText("No access tokens found")
    ).toBeInTheDocument();
  });

  it("keeps the empty state when loading the tokens fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockResolvedValue(
      textResponse("Internal server error", { ok: false, status: 500 })
    );
    render(<AccessTokensSettings />);

    expect(
      await screen.findByText("No access tokens found")
    ).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith("Failed to load access tokens");
  });

  it("closes the edit popup when cancelling", async () => {
    const { container } = render(<AccessTokensSettings />);
    await screen.findByText("GitHub token");

    await openMenu(container, 0, "Edit");
    await screen.findByRole("heading", { name: "Edit access token" });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("heading", { name: "Edit access token" })
    ).not.toBeInTheDocument();
  });

  it("deletes a token after confirmation", async () => {
    silenceJsdomErrors();
    const { container } = render(<AccessTokensSettings />);
    await screen.findByText("GitHub token");

    await openMenu(container, 0, "Delete");
    expect(
      await screen.findByRole("heading", { name: "Delete access token" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("All schedules using this token will stop working.")
    ).toBeInTheDocument();

    const popup = screen
      .getByRole("heading", { name: "Delete access token" })
      .closest("div.fixed") as HTMLElement;
    await userEvent.click(within(popup).getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/access-tokens/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("cancels the delete confirmation", async () => {
    const { container } = render(<AccessTokensSettings />);
    await screen.findByText("GitHub token");

    await openMenu(container, 0, "Delete");
    const popup = screen
      .getByRole("heading", { name: "Delete access token" })
      .closest("div.fixed") as HTMLElement;
    await userEvent.click(within(popup).getByRole("button", { name: "Cancel" }));

    expect(
      screen.queryByRole("heading", { name: "Delete access token" })
    ).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/access-tokens/1"),
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("opens the edit popup and saves a new name", async () => {
    silenceJsdomErrors();
    const { container } = render(<AccessTokensSettings />);
    await screen.findByText("GitHub token");

    await openMenu(container, 0, "Edit");
    expect(
      await screen.findByRole("heading", { name: "Edit access token" })
    ).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText("Enter token name");
    expect(nameInput).toHaveValue("GitHub token");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed token");
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/access-tokens/1",
        expect.objectContaining({
          method: "PUT",
          body: expect.stringContaining('"name":"Renamed token"'),
        })
      )
    );
  });
});
