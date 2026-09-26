import { expect, test } from "@playwright/test";
import { PASSWORD, USERNAME, ensureLoggedIn } from "./helpers";

test.describe.serial("first run setup", () => {
  test("shows an error for mismatched passwords", async ({ page }) => {
    await page.goto("/setup");
    await expect(
      page.getByRole("heading", { name: "Welcome to GitSave" })
    ).toBeVisible();

    await page.getByRole("button", { name: "Get started" }).click();
    await expect(
      page.getByRole("heading", { name: "1. Account creation" })
    ).toBeVisible();

    await page.getByPlaceholder("Username").fill(USERNAME);
    await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
    await page.getByPlaceholder("Confirm password").fill("something-else");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText("Passwords do not match")).toBeVisible();
    expect(page.url()).toContain("/setup");
  });

  test("registers the first user and reaches the dashboard", async ({
    page,
  }) => {
    await page.goto("/setup");
    await page.getByRole("button", { name: "Get started" }).click();
    await page.getByPlaceholder("Username").fill(USERNAME);
    await page.getByPlaceholder("Password", { exact: true }).fill(PASSWORD);
    await page.getByPlaceholder("Confirm password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("Registered successfully. Onto step 2...")
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "2. Adding first schedule" })
    ).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText(/no history found/i)).toBeVisible();
  });

  test("redirects /setup to the login page once a user exists", async ({
    page,
  }) => {
    await page.goto("/setup");
    await expect(page).toHaveURL(/\/login/);
  });

  test("logs the created user in after the setup", async ({ page }) => {
    await ensureLoggedIn(page);
    await expect(
      page.getByRole("heading", { name: "Overview" })
    ).toBeVisible();
  });
});
