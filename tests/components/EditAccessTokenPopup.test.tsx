// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditAccessTokenPopup from "../../src/components/dashboard/settings/EditAccessTokenPopup";
import {
  jsonResponse,
  silenceJsdomErrors,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

function createProps(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    name: "GitHub token",
    closeEdit: vi.fn(),
    ...overrides,
  };
}

describe("EditAccessTokenPopup", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonResponse({ id: 5 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the current token name and the warning", () => {
    render(<EditAccessTokenPopup {...createProps()} />);
    expect(screen.getByPlaceholderText("Enter token name")).toHaveValue(
      "GitHub token"
    );
    expect(
      screen.getByText("Note: Changing the token value will delete the old value.")
    ).toBeInTheDocument();
  });

  it("saves the edited name", async () => {
    silenceJsdomErrors();
    render(<EditAccessTokenPopup {...createProps()} />);

    const nameInput = screen.getByPlaceholderText("Enter token name");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed");
    await userEvent.click(screen.getByRole("button", { name: /Save/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/access-tokens/5",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"name":"Renamed"'),
      })
    );
    expect(
      await screen.findByText("Access token edited")
    ).toBeInTheDocument();
  });

  it("shows the server error message when saving fails", async () => {
    fetchMock.mockResolvedValue(
      textResponse("Invalid request body", { ok: false, status: 400 })
    );
    render(<EditAccessTokenPopup {...createProps()} />);

    await userEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(
      await screen.findByText("Invalid request body")
    ).toBeInTheDocument();
  });

  it("calls closeEdit when cancelling", async () => {
    const props = createProps();
    render(<EditAccessTokenPopup {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(props.closeEdit).toHaveBeenCalledOnce();
  });
});
