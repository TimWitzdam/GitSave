// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StorageSettings from "../../src/components/dashboard/settings/StorageSettings";
import {
  jsonResponse,
  stubFetch,
  textResponse,
} from "../helpers/frontend";

const localConfig = {
  defaultLocation: "local_folder",
  smbAddress: "",
  smbLocation: "",
  smbUsername: "",
  smbPassword: "",
};

const smbConfig = {
  defaultLocation: "smb_share",
  smbAddress: "192.168.1.10/backups",
  smbLocation: "gitsave",
  smbUsername: "backup-user",
  smbPassword: "",
};

describe("StorageSettings", () => {
  let fetchMock: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    fetchMock = stubFetch();
    fetchMock.mockResolvedValue(jsonResponse(localConfig));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("loads the current configuration", async () => {
    render(<StorageSettings />);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/config/storage", {
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(document.querySelector("select[name='location']")).toHaveValue(
      "local_folder"
    );
    expect(
      document.querySelector("input[placeholder='Server address with share (e.g. 192.168.1.1/backups)']")
    ).toBeNull();
  });

  it("shows the SMB fields for a stored SMB configuration", async () => {
    fetchMock.mockResolvedValue(jsonResponse(smbConfig));
    render(<StorageSettings />);

    await waitFor(() =>
      expect(document.querySelector("select[name='location']")).toHaveValue(
        "smb_share"
      )
    );
    expect(
      screen.getByPlaceholderText(
        "Server address with share (e.g. 192.168.1.1/backups)"
      )
    ).toHaveValue("192.168.1.10/backups");
    expect(screen.getByPlaceholderText("Remote location")).toHaveValue(
      "gitsave"
    );
    expect(screen.getByPlaceholderText("Username")).toHaveValue("backup-user");
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("reveals the SMB fields when selecting the SMB share", async () => {
    render(<StorageSettings />);
    await waitFor(() =>
      expect(document.querySelector("select[name='location']")).toHaveValue(
        "local_folder"
      )
    );

    await userEvent.selectOptions(
      document.querySelector("select[name='location']")!,
      "smb_share"
    );
    expect(
      screen.getByPlaceholderText(
        "Server address with share (e.g. 192.168.1.1/backups)"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText("Password will be stored in plain text.")
    ).toBeInTheDocument();
  });

  it("saves the local folder configuration", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(jsonResponse({ message: "Setting saved" }));
      }
      return Promise.resolve(jsonResponse(localConfig));
    });
    render(<StorageSettings />);
    await waitFor(() =>
      expect(document.querySelector("select[name='location']")).toHaveValue(
        "local_folder"
      )
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(fetchMock).toHaveBeenCalledWith("/api/config/storage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "local_folder",
        serverAddress: "",
        remoteLocation: "",
        username: "",
        password: "",
      }),
    });
    expect(await screen.findByText("Setting saved")).toBeInTheDocument();
  });

  it("sends the SMB details", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(jsonResponse({ message: "Setting saved" }));
      }
      return Promise.resolve(jsonResponse(smbConfig));
    });
    render(<StorageSettings />);
    await waitFor(() =>
      expect(document.querySelector("select[name='location']")).toHaveValue(
        "smb_share"
      )
    );

    await userEvent.clear(
      screen.getByPlaceholderText(
        "Server address with share (e.g. 192.168.1.1/backups)"
      )
    );
    await userEvent.type(
      screen.getByPlaceholderText(
        "Server address with share (e.g. 192.168.1.1/backups)"
      ),
      "10.0.0.5/share"
    );
    await userEvent.clear(screen.getByPlaceholderText("Remote location"));
    await userEvent.type(
      screen.getByPlaceholderText("Remote location"),
      "remote"
    );
    await userEvent.clear(screen.getByPlaceholderText("Username"));
    await userEvent.type(screen.getByPlaceholderText("Username"), "user2");
    await userEvent.type(screen.getByPlaceholderText("Password"), "secret");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    const putCall = fetchMock.mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "PUT"
    )!;
    expect(JSON.parse((putCall[1] as RequestInit).body as string)).toEqual({
      location: "smb_share",
      serverAddress: "10.0.0.5/share",
      remoteLocation: "remote",
      username: "user2",
      password: "secret",
    });
  });

  it("shows an error when saving fails", async () => {
    fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
      if (init?.method === "PUT") {
        return Promise.resolve(
          textResponse("Error connecting to storage.", {
            ok: false,
            status: 500,
          })
        );
      }
      return Promise.resolve(jsonResponse(localConfig));
    });
    render(<StorageSettings />);
    await waitFor(() =>
      expect(document.querySelector("select[name='location']")).toHaveValue(
        "local_folder"
      )
    );

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByText("An error occurred. Please check the server logs.")
    ).toBeInTheDocument();
  });
});
