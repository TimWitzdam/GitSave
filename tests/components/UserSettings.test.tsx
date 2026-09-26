// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserSettings from "../../src/components/dashboard/settings/UserSettings";
import {
  jsonResponse,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

describe("UserSettings", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    localStorage.clear();
    document.cookie =
      "auth_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    fetchMock = stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the cached username and refreshes it from the server", async () => {
    localStorage.setItem("username", "cached-user");
    fetchMock.mockResolvedValue(jsonResponse({ username: "alice" }));
    render(<UserSettings />);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/user/name", {
        headers: { "Content-Type": "application/json" },
      })
    );
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Username")).toHaveValue("alice")
    );
    expect(localStorage.getItem("username")).toBe("alice");
  });

  it("does not crash when refreshing the username fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem("username", "cached-user");
    fetchMock.mockRejectedValue(new Error("network down"));
    render(<UserSettings />);

    expect(screen.getByPlaceholderText("Username")).toHaveValue(
      "cached-user"
    );
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
  });

  it("updates the username, the stored session and the cookie", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(
          jsonResponse({ username: "bob", token: "new-jwt" })
        );
      }
      return Promise.resolve(jsonResponse({ username: "alice" }));
    });
    render(<UserSettings />);

    const input = screen.getByPlaceholderText("Username");
    await waitFor(() => expect(input).toHaveValue("alice"));
    await userEvent.clear(input);
    await userEvent.type(input, "bob");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/user/name", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "bob" }),
    });
    expect(
      await screen.findByText("Username updated successfully.")
    ).toBeInTheDocument();
    expect(localStorage.getItem("username")).toBe("bob");
    expect(document.cookie).toContain("auth_session=new-jwt");
  });

  it("shows an error when the username is taken", async () => {
    fetchMock.mockResolvedValue(
      textResponse("Username already exists", { ok: false, status: 409 })
    );
    render(<UserSettings />);

    const input = screen.getByPlaceholderText("Username");
    await userEvent.type(input, "bob");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByText("An error occurred. Please check the server logs.")
    ).toBeInTheDocument();
  });

  it("rejects mismatched new passwords without calling the API", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ username: "alice" }));
    render(<UserSettings />);

    await userEvent.type(
      screen.getByPlaceholderText("Current password"),
      "old-password"
    );
    await userEvent.type(
      screen.getByPlaceholderText("New password"),
      "new-password"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Confirm new password"),
      "different"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" })
    );

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/user/password",
      expect.anything()
    );
  });

  it("changes the password and resets the form", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/user/password" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ message: "Password updated" }));
      }
      return Promise.resolve(jsonResponse({ username: "alice" }));
    });
    render(<UserSettings />);

    await userEvent.type(
      screen.getByPlaceholderText("Current password"),
      "old-password"
    );
    await userEvent.type(
      screen.getByPlaceholderText("New password"),
      "new-password"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Confirm new password"),
      "new-password"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" })
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/user/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password: "old-password",
        newPassword: "new-password",
      }),
    });
    expect(
      await screen.findByText("Password updated successfully.")
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Current password")).toHaveValue("");
    expect(screen.getByPlaceholderText("New password")).toHaveValue("");
  });

  it("shows an error when the current password is wrong", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/user/password" && init?.method === "POST") {
        return Promise.resolve(
          textResponse("Invalid credentials", { ok: false, status: 401 })
        );
      }
      return Promise.resolve(jsonResponse({ username: "alice" }));
    });
    render(<UserSettings />);

    await userEvent.type(
      screen.getByPlaceholderText("Current password"),
      "wrong"
    );
    await userEvent.type(
      screen.getByPlaceholderText("New password"),
      "new-password"
    );
    await userEvent.type(
      screen.getByPlaceholderText("Confirm new password"),
      "new-password"
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Update password" })
    );

    expect(
      await screen.findByText("An error occurred. Please check the server logs.")
    ).toBeInTheDocument();
  });
});
