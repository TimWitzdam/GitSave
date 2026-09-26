// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSchedulePopup from "../../src/components/dashboard/AddSchedulePopup";
import {
  jsonResponse,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

const accessTokens = [
  { id: 3, name: "GitHub token" },
  { id: 4, name: "GitLab token" },
];

function mockApi(fetchMock: ReturnType<typeof stubFetch>) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    if (url === "/api/access-tokens" && (!init || !init.method)) {
      return Promise.resolve(jsonResponse(accessTokens));
    }
    if (url === "/api/access-tokens" && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ id: 9 }));
    }
    if (url === "/api/schedules" && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ id: 1, name: "My repo" }));
    }
    return Promise.resolve(jsonResponse({}));
  });
}

async function fillBasics() {
  await userEvent.type(
    screen.getByPlaceholderText("Enter schedule name"),
    "My repo"
  );
  await userEvent.type(
    screen.getByPlaceholderText("https://github.com/exampleuser/examplerepo.git"),
    "https://github.com/example/repo.git"
  );
}

describe("AddSchedulePopup", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    mockApi(fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the available access tokens", async () => {
    render(<AddSchedulePopup />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/access-tokens")
    );
  });

  it("submits the default values", async () => {
    render(<AddSchedulePopup />);
    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My repo",
          repository: "https://github.com/example/repo.git",
          every: 1,
          timespan: "minutes",
          private: null,
          accessTokenId: null,
          keepLast: 5,
        }),
      })
    );
    expect(await screen.findByText("Schedule added")).toBeInTheDocument();
  });

  it("rejects values below the minimum before submitting", async () => {
    render(<AddSchedulePopup />);
    const everyInput = document.querySelector<HTMLInputElement>(
      'input[name="every"]'
    )!;
    const keepLastInput = document.querySelector<HTMLInputElement>(
      'input[name="keep-last"]'
    )!;

    fireEvent.change(everyInput, { target: { value: "0" } });
    expect(everyInput).toHaveValue(1);

    fireEvent.change(keepLastInput, { target: { value: "-5" } });
    expect(keepLastInput).toHaveValue(1);

    fireEvent.change(everyInput, { target: { value: "7" } });
    expect(everyInput).toHaveValue(7);
  });

  it("shows the server error message when saving fails", async () => {
    fetchMock.mockImplementation((url: string, init?: RequestInit) => {
      if (url === "/api/access-tokens" && (!init || !init.method)) {
        return Promise.resolve(jsonResponse(accessTokens));
      }
      return Promise.resolve(
        textResponse("Invalid repository URL", { ok: false, status: 400 })
      );
    });

    render(<AddSchedulePopup />);
    await fillBasics();
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(await screen.findByText("Invalid repository URL")).toBeInTheDocument();
  });

  it("reveals the token select when the repository is private", async () => {
    render(<AddSchedulePopup />);
    expect(document.querySelector("select[name='access-token']")).toBeNull();

    await userEvent.click(screen.getByLabelText("Private?"));
    const select = document.querySelector("select[name='access-token']");
    expect(select).not.toBeNull();
    expect(screen.getByRole("option", { name: "GitHub token" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "GitLab token" })).toBeInTheDocument();
  });

  it("submits the selected access token for a private repository", async () => {
    render(<AddSchedulePopup />);
    await fillBasics();
    await userEvent.click(screen.getByLabelText("Private?"));
    await userEvent.selectOptions(
      document.querySelector("select[name='access-token']")!,
      "3"
    );
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/schedules",
        expect.objectContaining({
          body: expect.stringContaining('"private":"on"'),
        })
      )
    );
    const call = fetchMock.mock.calls.find(
      ([url, init]) =>
        url === "/api/schedules" &&
        (init as RequestInit)?.method === "POST"
    )!;
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.accessTokenId).toBe("3");
    expect(body.private).toBe("on");
  });

  it("creates a new access token from the token form", async () => {
    render(<AddSchedulePopup />);
    await userEvent.click(screen.getByLabelText("Private?"));
    await userEvent.selectOptions(
      document.querySelector("select[name='access-token']")!,
      "new"
    );

    expect(
      await screen.findByRole("heading", { name: "Add access token" })
    ).toBeInTheDocument();

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
        screen.getByRole("heading", { name: "Add access token" }).parentElement
      ).toHaveClass("hidden")
    );
  });
});
