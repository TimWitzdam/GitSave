// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScheduleList from "../../src/components/dashboard/ScheduleList";
import {
  jsonResponse,
  silenceJsdomErrors,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

const schedules = [
  {
    id: 1,
    name: "First repo",
    repository: "https://github.com/example/first.git",
    cron: "*/5 * * * *",
    paused: false,
    username: "alice",
    keepLast: 3,
    backupHistory: [
      {
        id: 1,
        backupJobId: 1,
        timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
        success: true,
        message: null,
      },
    ],
  },
  {
    id: 2,
    name: "Second repo",
    repository: "https://github.com/example/second.git",
    cron: "*/10 * * * *",
    paused: true,
    username: "alice",
    keepLast: 5,
    backupHistory: [],
  },
];

function menuButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll("button")).filter(
    (button) => button.textContent === ""
  );
}

describe("ScheduleList", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads and renders the schedules", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    render(<ScheduleList />);

    expect(await screen.findByText("First repo")).toBeInTheDocument();
    expect(screen.getByText("Second repo")).toBeInTheDocument();
    expect(
      screen.getByText("https://github.com/example/first.git")
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/schedules", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("shows the last backup time or Never", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    render(<ScheduleList />);

    expect(await screen.findByText("Last backup: 5 minutes ago")).toBeInTheDocument();
    expect(screen.getByText("Last backup: Never")).toBeInTheDocument();
  });

  it("shows an empty state when there are no schedules", async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));
    render(<ScheduleList />);

    expect(
      await screen.findByText(/You don't have any schedules yet/)
    ).toBeInTheDocument();
  });

  it("pauses a running schedule", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("First repo");

    await userEvent.click(menuButtons(container)[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Pause" })[0]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/schedules/1/pause", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("resumes a paused schedule", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("Second repo");

    await userEvent.click(menuButtons(container)[1]);
    await userEvent.click(screen.getByRole("button", { name: "Resume" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/schedules/2/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("starts a backup now and shows the server response", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("First repo");

    fetchMock.mockResolvedValueOnce(
      textResponse("Backup started. Depending on the size of the repository, this may take a while.")
    );
    await userEvent.click(menuButtons(container)[0]);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Backup now" })[0]
    );

    expect(await screen.findByText("Backup now", { selector: "h2" })).toBeInTheDocument();
    expect(
      screen.getByText(/Backup started. Depending on the size/)
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(
      screen.queryByText(/Backup started. Depending on the size/)
    ).not.toBeInTheDocument();
  });

  it("asks for confirmation before deleting and deletes on confirm", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("First repo");

    await userEvent.click(menuButtons(container)[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);

    expect(
      await screen.findByText("Are you sure you want to delete this schedule?")
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByText("Are you sure you want to delete this schedule?")
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Delete" }).at(-1)!
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/schedules/1", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("opens the edit popup with the schedule values", async () => {
    silenceJsdomErrors();
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("First repo");

    await userEvent.click(menuButtons(container)[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);

    expect(
      await screen.findByRole("heading", { name: "Edit schedule" })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter schedule name")).toHaveValue(
      "First repo"
    );
    expect(
      screen.getByPlaceholderText("https://github.com/exampleuser/examplerepo.git")
    ).toHaveValue("https://github.com/example/first.git");
  });

  it("closes the edit popup when cancelling", async () => {
    silenceJsdomErrors();
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("First repo");

    await userEvent.click(menuButtons(container)[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    await screen.findByRole("heading", { name: "Edit schedule" });

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("heading", { name: "Edit schedule" })
    ).not.toBeInTheDocument();
  });

  it("closes the delete confirmation when the request fails", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    const { container } = render(<ScheduleList />);
    await screen.findByText("First repo");

    await userEvent.click(menuButtons(container)[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "Delete" })[0]);
    await screen.findByText("Are you sure you want to delete this schedule?");

    fetchMock.mockRejectedValueOnce(new Error("network down"));
    await userEvent.click(
      screen.getAllByRole("button", { name: "Delete" }).at(-1)!
    );

    await waitFor(() =>
      expect(
        screen.queryByText("Are you sure you want to delete this schedule?")
      ).not.toBeInTheDocument()
    );
  });

  it("reloads the schedules when the reloadSchedules event fires", async () => {
    fetchMock.mockResolvedValue(jsonResponse(schedules));
    render(<ScheduleList />);
    await screen.findByText("First repo");
    fetchMock.mockClear();

    document.dispatchEvent(new CustomEvent("reloadSchedules"));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/schedules", {
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("keeps the skeleton visible until the request resolves", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      })
    );
    render(<ScheduleList />);

    expect(
      document.querySelector('[class*="animate-[pulse"]')
    ).not.toBeNull();

    resolveFetch(jsonResponse(schedules));
    expect(await screen.findByText("First repo")).toBeInTheDocument();
  });
});
