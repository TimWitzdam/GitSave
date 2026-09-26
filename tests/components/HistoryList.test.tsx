// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryList from "../../src/components/dashboard/HistoryList";
import {
  jsonResponse,
  setLocationSearch,
  stubFetch,
} from "../helpers/frontend";

const history = [
  {
    id: 1,
    backupJobId: 1,
    backupJob: { name: "First repo" },
    timestamp: new Date(Date.now() - 60_000).toISOString(),
    success: true,
    message: null,
  },
  {
    id: 2,
    backupJobId: null,
    backupJob: null,
    timestamp: new Date(Date.now() - 120_000).toISOString(),
    success: false,
    message: "Missing privileges or cannot access",
  },
];

function addReloadButton() {
  const button = document.createElement("button");
  button.id = "reload";
  document.body.appendChild(button);
  return button;
}

describe("HistoryList", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    addReloadButton();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.getElementById("reload")?.remove();
    window.history.pushState({}, "", "/");
  });

  it("loads ten entries for the first page by default", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ backupHistory: history, totalCount: 2 }));
    render(<HistoryList />);

    await screen.findByText("First repo");
    expect(fetchMock).toHaveBeenCalledWith("/api/history?limit=10&offset=0");
  });

  it("shows the history entries with names and status", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ backupHistory: history, totalCount: 2 }));
    render(<HistoryList />);

    expect(await screen.findByText("First repo")).toBeInTheDocument();
    expect(screen.getByText("Deleted schedule")).toBeInTheDocument();
    expect(screen.getByText("Backup successful")).toBeInTheDocument();
    expect(
      screen.getByText("Backup failed (Missing privileges or cannot access)")
    ).toBeInTheDocument();
  });

  it("shows an empty state when there is no history", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ backupHistory: [], totalCount: 0 })
    );
    render(<HistoryList />);

    expect(await screen.findByText("No history found")).toBeInTheDocument();
  });

  it("shows pagination only when there is more than one page", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ backupHistory: history, totalCount: 2 }));
    const { unmount } = render(<HistoryList />);
    await screen.findByText("First repo");
    expect(document.querySelectorAll("a[href^='?page=']")).toHaveLength(0);
    unmount();

    fetchMock.mockResolvedValue(
      jsonResponse({ backupHistory: history, totalCount: 35 })
    );
    render(<HistoryList />);
    await screen.findByText("First repo");
    expect(
      document.querySelectorAll("a[href^='?page=']").length
    ).toBeGreaterThan(0);
  });

  it("uses a limit of five and links to the full history when paging is disabled", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ backupHistory: history, totalCount: 2 }));
    render(<HistoryList disablePaging />);

    await screen.findByText("First repo");
    expect(fetchMock).toHaveBeenCalledWith("/api/history?limit=5&offset=0");
    expect(screen.getByRole("link", { name: "Show all" })).toHaveAttribute(
      "href",
      "/dashboard/history"
    );
    expect(document.querySelectorAll("a[href^='?page=']")).toHaveLength(0);
  });

  it("loads the requested page from the URL", async () => {
    setLocationSearch("?page=3");
    fetchMock.mockResolvedValue(jsonResponse({ backupHistory: history, totalCount: 100 }));
    render(<HistoryList />);

    await screen.findByText("First repo");
    expect(fetchMock).toHaveBeenCalledWith("/api/history?limit=10&offset=20");
    const current = Array.from(
      document.querySelectorAll("a[href^='?page=']")
    ).find((link) => link.className.includes("bg-white"));
    expect(current?.textContent).toBe("3");
  });

  it("reloads the same page when the reload button is clicked", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ backupHistory: history, totalCount: 2 }));
    render(<HistoryList />);
    await screen.findByText("First repo");
    fetchMock.mockClear();

    await userEvent.click(document.getElementById("reload")!);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/history?limit=10&offset=0")
    );
  });

  it("keeps the skeleton visible until the request resolves", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    render(<HistoryList />);

    expect(
      document.querySelector('[class*="animate-[pulse"]')
    ).not.toBeNull();

    resolveFetch(jsonResponse({ backupHistory: history, totalCount: 2 }));
    expect(await screen.findByText("First repo")).toBeInTheDocument();
  });
});
