// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "../../src/components/login/LoginForm";
import {
  jsonResponse,
  silenceJsdomErrors,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

describe("LoginForm", () => {
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

  it("renders the login form", () => {
    render(<LoginForm />);
    expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("posts the credentials, stores the cookie and shows success", async () => {
    silenceJsdomErrors();
    fetchMock.mockResolvedValue(jsonResponse({ token: "jwt-token" }));
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
    await userEvent.type(screen.getByPlaceholderText("Password"), "s3cret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "alice", password: "s3cret" }),
    });
    expect(
      await screen.findByText("Logged in successfully. Redirecting...")
    ).toBeInTheDocument();
    expect(document.cookie).toContain("auth_session=jwt-token");
  });

  it("shows an error for invalid credentials", async () => {
    fetchMock.mockResolvedValue(
      textResponse("Invalid credentials", { ok: false, status: 401 })
    );
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
    await userEvent.type(screen.getByPlaceholderText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("Invalid username or password")
    ).toBeInTheDocument();
    expect(document.cookie).not.toContain("auth_session=jwt-token");
  });

  it("shows a generic error for unexpected response codes", async () => {
    fetchMock.mockResolvedValue(
      textResponse("boom", { ok: false, status: 500 })
    );
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
    await userEvent.type(screen.getByPlaceholderText("Password"), "s3cret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("An error occurred. Please try again.")
    ).toBeInTheDocument();
  });

  it("shows a generic error when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<LoginForm />);

    await userEvent.type(screen.getByPlaceholderText("Username"), "alice");
    await userEvent.type(screen.getByPlaceholderText("Password"), "s3cret");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("An error occurred. Please try again.")
    ).toBeInTheDocument();
  });
});
