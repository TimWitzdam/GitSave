import { expect, test } from "@playwright/test";
import {
  PASSWORD,
  USERNAME,
  ensureLoggedIn,
  login,
} from "./helpers";

const NEW_USERNAME = "alice-renamed";
const NEW_PASSWORD = "brand-new-password";

test.describe.serial("user settings", () => {
  test("renames the user", async ({ page }) => {
    await ensureLoggedIn(page);
    await page.goto("/dashboard/settings/user");

    const usernameInput = page.getByPlaceholder("Username");
    await expect(usernameInput).toHaveValue(USERNAME);
    await usernameInput.fill(NEW_USERNAME);
    await page.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText("Username updated successfully.")
    ).toBeVisible();
    await page.reload();
    await expect(page.getByPlaceholder("Username")).toHaveValue(NEW_USERNAME);
  });

  test("changes the password and logs in with it", async ({ page }) => {
    await ensureLoggedIn(page, NEW_USERNAME, PASSWORD);
    await page.goto("/dashboard/settings/user");

    await page.getByPlaceholder("Current password", { exact: true }).fill(PASSWORD);
    await page.getByPlaceholder("New password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByPlaceholder("Confirm new password").fill(NEW_PASSWORD);
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(
      page.getByText("Password updated successfully.")
    ).toBeVisible();

    await page.locator("#user-menu-button").click();
    await page.locator("#logout-button").click();
    await expect(page).toHaveURL(/\/login/);

    await login(page, NEW_USERNAME, NEW_PASSWORD);
  });

  test("rejects mismatched new passwords", async ({ page }) => {
    await ensureLoggedIn(page, NEW_USERNAME, NEW_PASSWORD);
    await page.goto("/dashboard/settings/user");

    await page.getByPlaceholder("Current password", { exact: true }).fill(NEW_PASSWORD);
    await page.getByPlaceholder("New password", { exact: true }).fill("one-password");
    await page.getByPlaceholder("Confirm new password").fill("another");
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(page.getByText("Passwords do not match.")).toBeVisible();
  });
});
