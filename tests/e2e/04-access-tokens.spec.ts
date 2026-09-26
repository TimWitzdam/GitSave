import { expect, test } from "@playwright/test";
import { ensureLoggedIn } from "./helpers";

const TOKEN_NAME = "E2E Token";

test.describe.serial("access tokens", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("creates a token through the add schedule popup", async ({ page }) => {
    await page.goto("/dashboard/schedules");
    await page.locator("#add").click();

    await page.getByLabel("Private?").check();
    await page
      .locator("select[name='access-token']")
      .selectOption("new");

    await expect(
      page.getByRole("heading", { name: "Add access token" })
    ).toBeVisible();
    await page
      .getByPlaceholder("Enter access token name")
      .fill(TOKEN_NAME);
    await page
      .getByPlaceholder("Enter access token", { exact: true })
      .fill("ghp_e2e_secret_token");
    await page.getByRole("button", { name: "Add access token" }).click();

    await page.locator("#cancel-add").click();
    await page.goto("/dashboard/settings/access-tokens");
    await expect(page.getByText(TOKEN_NAME)).toBeVisible();
  });

  test("renames the token", async ({ page }) => {
    await page.goto("/dashboard/settings/access-tokens");
    await page
      .getByRole("button", { name: "Access token actions" })
      .click();
    await page.getByRole("button", { name: "Edit" }).click();

    await expect(
      page.getByRole("heading", { name: "Edit access token" })
    ).toBeVisible();
    const nameInput = page.getByPlaceholder("Enter token name");
    await expect(nameInput).toHaveValue(TOKEN_NAME);
    await nameInput.fill(`${TOKEN_NAME} Renamed`);
    await page.getByRole("button", { name: "Save" }).click();

    // The component reloads the page after a successful update.
    await expect(page.getByText(`${TOKEN_NAME} Renamed`)).toBeVisible({
      timeout: 20_000,
    });
  });

  test("deletes the token after confirmation", async ({ page }) => {
    await page.goto("/dashboard/settings/access-tokens");
    await page
      .getByRole("button", { name: "Access token actions" })
      .click();
    await page.getByRole("button", { name: "Delete" }).click();

    const confirmDialog = page
      .locator("div.fixed")
      .filter({ hasText: "Delete access token" });
    await expect(
      confirmDialog.getByText("All schedules using this token will stop working.")
    ).toBeVisible();
    await confirmDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText("No access tokens found")).toBeVisible({
      timeout: 20_000,
    });
  });
});
