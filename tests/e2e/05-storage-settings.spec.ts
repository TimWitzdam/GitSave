import { expect, test } from "@playwright/test";
import { ensureLoggedIn } from "./helpers";

test.describe.serial("storage settings", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("defaults to the local folder and saves it", async ({ page }) => {
    await page.goto("/dashboard/settings/storage");
    await expect(page.locator("select[name='location']")).toHaveValue(
      "local_folder"
    );
    await expect(
      page.getByPlaceholder("Server address with share (e.g. 192.168.1.1/backups)")
    ).not.toBeVisible();

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Setting saved")).toBeVisible();
  });

  test("reveals the SMB fields when selecting an SMB share", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/storage");
    await page
      .locator("select[name='location']")
      .selectOption("smb_share");

    await expect(
      page.getByPlaceholder("Server address with share (e.g. 192.168.1.1/backups)")
    ).toBeVisible();
    await expect(page.getByPlaceholder("Remote location")).toBeVisible();
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
  });

  test("shows an error when the SMB share cannot be reached", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/storage");
    await page
      .locator("select[name='location']")
      .selectOption("smb_share");
    await page
      .getByPlaceholder("Server address with share (e.g. 192.168.1.1/backups)")
      .fill("127.0.0.1/does-not-exist");
    await page.getByPlaceholder("Remote location").fill("gitsave");
    await page.getByPlaceholder("Username").fill("e2e-user");
    await page.getByPlaceholder("Password").fill("e2e-password");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText("An error occurred. Please check the server logs.")
    ).toBeVisible({ timeout: 30_000 });
  });

  test("switches back to the local folder", async ({ page }) => {
    await page.goto("/dashboard/settings/storage");
    await page
      .locator("select[name='location']")
      .selectOption("local_folder");
    await page.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Setting saved")).toBeVisible();
    await page.reload();
    await expect(page.locator("select[name='location']")).toHaveValue(
      "local_folder"
    );
  });
});
