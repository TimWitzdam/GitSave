// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditSchedulePopup from "../../src/components/dashboard/EditSchedulePopup";
import {
  jsonResponse,
  silenceJsdomErrors,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    name: "My repo",
    cron: "*/15 * * * *",
    repository: "https://github.com/example/repo.git",
    keepLast: 4,
    closeEdit: vi.fn(),
    ...overrides,
  };
}

describe("EditSchedulePopup", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonResponse({ id: 7 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the current schedule values", () => {
    render(<EditSchedulePopup {...createProps()} />);
    expect(screen.getByPlaceholderText("Enter schedule name")).toHaveValue(
      "My repo"
    );
    expect(
      screen.getByPlaceholderText(
        "https://github.com/exampleuser/examplerepo.git"
      )
    ).toHaveValue("https://github.com/example/repo.git");
    expect(document.querySelector('input[name="every"]')).toHaveValue(15);
    expect(document.querySelector('input[name="keep-last"]')).toHaveValue(4);
    expect(document.querySelector("select[name='timespan']")).toHaveValue(
      "minutes"
    );
  });

  it("extracts an hours interval from the cron expression", () => {
    render(<EditSchedulePopup {...createProps({ cron: "30 */6 * * *" })} />);
    expect(document.querySelector('input[name="every"]')).toHaveValue(6);
    expect(document.querySelector("select[name='timespan']")).toHaveValue(
      "hours"
    );
  });

  it("extracts a days interval from the cron expression", () => {
    render(<EditSchedulePopup {...createProps({ cron: "15 3 */2 * *" })} />);
    expect(document.querySelector('input[name="every"]')).toHaveValue(2);
    expect(document.querySelector("select[name='timespan']")).toHaveValue(
      "days"
    );
  });

  it("throws for a cron expression with the wrong number of parts", () => {
    silenceJsdomErrors();
    expect(() =>
      render(<EditSchedulePopup {...createProps({ cron: "*/5 * * *" })} />)
    ).toThrow("Invalid cron expression");
  });

  it("throws when no interval can be determined from the cron expression", () => {
    silenceJsdomErrors();
    expect(() =>
      render(<EditSchedulePopup {...createProps({ cron: "5 5 5 5 5" })} />)
    ).toThrow("Unable to determine timespan from cron expression");
  });

  it("saves the edited schedule", async () => {
    render(<EditSchedulePopup {...createProps()} />);

    await userEvent.clear(screen.getByPlaceholderText("Enter schedule name"));
    await userEvent.type(
      screen.getByPlaceholderText("Enter schedule name"),
      "Renamed repo"
    );
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/schedules/7", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Renamed repo",
          repository: "https://github.com/example/repo.git",
          every: 15,
          timespan: "minutes",
          keepLast: 4,
        }),
      })
    );
    expect(await screen.findByText("Schedule edited")).toBeInTheDocument();
  });

  it("saves changed interval and keepLast values", async () => {
    render(<EditSchedulePopup {...createProps()} />);

    const everyInput = document.querySelector<HTMLInputElement>(
      'input[name="every"]'
    )!;
    const keepLastInput = document.querySelector<HTMLInputElement>(
      'input[name="keep-last"]'
    )!;
    fireEvent.change(everyInput, { target: { value: "3" } });
    fireEvent.change(keepLastInput, { target: { value: "9" } });
    await userEvent.selectOptions(
      document.querySelector("select[name='timespan']")!,
      "days"
    );
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/schedules/7",
        expect.objectContaining({
          body: expect.stringContaining('"every":3'),
        })
      )
    );
    const call = fetchMock.mock.calls.find(
      ([url]) => url === "/api/schedules/7"
    )!;
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({
      name: "My repo",
      repository: "https://github.com/example/repo.git",
      every: 3,
      timespan: "days",
      keepLast: 9,
    });
  });

  it("shows the server error message when saving fails", async () => {
    fetchMock.mockResolvedValue(
      textResponse("Invalid repository URL", { ok: false, status: 400 })
    );
    render(<EditSchedulePopup {...createProps()} />);

    await userEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(await screen.findByText("Invalid repository URL")).toBeInTheDocument();
  });

  it("calls closeEdit when cancelling", async () => {
    const props = createProps();
    render(<EditSchedulePopup {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.closeEdit).toHaveBeenCalledOnce();
  });
});
