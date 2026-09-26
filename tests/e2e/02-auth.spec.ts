import { expect, test } from "@playwright/test";
import { PASSWORD, USERNAME, ensureLoggedIn, login } from "./helpers";

test.describe.serial("authentication", () => {
  test("redirects unauthenticated dashboard visits to the login page", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("rejects a wrong password", async ({ page }) => {
    await ensureLoggedIn(page);

    // A valid cookie redirects back to the dashboard, so clear it first.
    await page.context().clearCookies();
    await page.goto("/login");

    await page.getByPlaceholder("Username").fill(USERNAME);
    await page.getByPlaceholder("Password", { exact: true }).fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid username or password")).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("logs in and logs out again", async ({ page }) => {
    await login(page);

    await page.locator("#user-menu-button").click();
    await page.locator("#logout-button").click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("keeps logged in users out of the login page", async ({ page }) => {
    await login(page);
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("logs in with the correct credentials", async ({ page }) => {
    await login(page, USERNAME, PASSWORD);
  });
});
