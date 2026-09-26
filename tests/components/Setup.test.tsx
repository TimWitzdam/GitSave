// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Setup from "../../src/components/Setup";
import {
  jsonResponse,
  silenceJsdomErrors,
  stubFetch,
} from "../helpers/frontend";

async function reachStepTwo() {
  render(<Setup />);
  await userEvent.click(screen.getByRole("button", { name: "Get started" }));
  await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
  await userEvent.type(screen.getByPlaceholderText("Password"), "s3cret");
  await userEvent.type(
    screen.getByPlaceholderText("Confirm password"),
    "s3cret"
  );
  await userEvent.click(screen.getByRole("button", { name: /Create account/ }));
  await screen.findByText("2. Adding first schedule", {}, { timeout: 4000 });
}

describe("Setup", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    document.cookie =
      "auth_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("starts on the welcome screen", () => {
    render(<Setup />);
    expect(screen.getByText("Welcome to GitSave")).toBeInTheDocument();
    expect(
      screen.getByText("Let's get you started with a quick 2 step initial setup")
    ).toBeInTheDocument();
  });

  it("moves to the account creation step", async () => {
    render(<Setup />);
    await userEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(screen.getByText("1. Account creation")).toBeInTheDocument();
  });

  it("rejects mismatched passwords without calling the API", async () => {
    render(<Setup />);
    await userEvent.click(screen.getByRole("button", { name: "Get started" }));
    await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
    await userEvent.type(screen.getByPlaceholderText("Password"), "s3cret");
    await userEvent.type(
      screen.getByPlaceholderText("Confirm password"),
      "different"
    );
    await userEvent.click(screen.getByRole("button", { name: /Create account/ }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("registers the user and advances to the schedule step", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: "jwt-token" }));
    render(<Setup />);
    await userEvent.click(screen.getByRole("button", { name: "Get started" }));
    await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
    await userEvent.type(screen.getByPlaceholderText("Password"), "s3cret");
    await userEvent.type(
      screen.getByPlaceholderText("Confirm password"),
      "s3cret"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Create account/ })
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", password: "s3cret" }),
    });
    expect(
      await screen.findByText("Registered successfully. Onto step 2...")
    ).toBeInTheDocument();
    expect(document.cookie).toContain("auth_session=jwt-token");
    expect(
      await screen.findByText("2. Adding first schedule", {}, { timeout: 4000 })
    ).toBeInTheDocument();
  });

  it("creates the first schedule from step 2", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: "jwt-token" }));
    await reachStepTwo();

    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));
    await userEvent.type(
      screen.getByPlaceholderText("Enter schedule name"),
      "My repo"
    );
    await userEvent.type(
      screen.getByPlaceholderText(
        "https://github.com/exampleuser/examplerepo.git"
      ),
      "https://github.com/example/repo.git"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Create schedule/ })
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/schedules",
        expect.objectContaining({ method: "POST" })
      )
    );
    const call = fetchMock.mock.calls.find(
      ([url]) => url === "/api/schedules"
    )!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      name: "My repo",
      repository: "https://github.com/example/repo.git",
      every: 1,
      timespan: "minutes",
      private: null,
      accessTokenId: null,
      keepLast: 5,
    });
    expect(
      await screen.findByText(
        "Schedule created successfully. Redirecting to dashboard..."
      )
    ).toBeInTheDocument();
  });

  it("offers to skip the schedule step", async () => {
    silenceJsdomErrors();
    fetchMock.mockResolvedValue(jsonResponse({ token: "jwt-token" }));
    await reachStepTwo();

    const skipButton = screen.getByRole("button", { name: "Skip for now" });
    await userEvent.click(skipButton);
    expect(skipButton).toBeInTheDocument();
  });

  it("adds an access token from step 2", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ token: "jwt-token" }));
    await reachStepTwo();

    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/access-tokens" && (!init || !init.method)) {
        return Promise.resolve(jsonResponse([{ id: 1, name: "GitHub" }]));
      }
      if (url === "/api/access-tokens" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ id: 2 }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    await userEvent.click(screen.getByLabelText("Private?"));
    await userEvent.selectOptions(
      document.querySelector("select[name='access-token']")!,
      "new"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Enter access token name"),
      "New token"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Enter access token"),
      "ghp_secret"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Add access token" })
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/access-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New token", token: "ghp_secret" }),
      })
    );
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Add access token" }).closest(
          "div.hidden"
        )
      ).not.toBeNull()
    );
  });
});
