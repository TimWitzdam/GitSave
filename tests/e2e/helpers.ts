import { expect, type Page } from "@playwright/test";

export const USERNAME = "alice";
export const PASSWORD = "s3cret-password";

export async function login(
  page: Page,
  username = USERNAME,
  password = PASSWORD
) {
  await page.goto("/login");
  await page.getByPlaceholder("Username").fill(username);
  await page.getByPlaceholder("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

/**
 * Makes a test independent of the other specs: if no user exists yet the
 * first-run setup is performed, otherwise the user logs in.
 */
export async function ensureLoggedIn(
  page: Page,
  username = USERNAME,
  password = PASSWORD
) {
  await page.goto("/setup");
  await page.waitForURL(/\/(setup|login)/);

  if (page.url().includes("/setup")) {
    await page.getByRole("button", { name: "Get started" }).click();
    await page.getByPlaceholder("Username").fill(username);
    await page.getByPlaceholder("Password", { exact: true }).fill(password);
    await page.getByPlaceholder("Confirm password").fill(password);
    await page
      .getByRole("button", { name: "Create account" })
      .click();
    await expect(
      page.getByRole("heading", { name: "2. Adding first schedule" })
    ).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 20_000 });
  } else {
    await page.getByPlaceholder("Username").fill(username);
    await page.getByPlaceholder("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard\/overview/, { timeout: 20_000 });
  }

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
}

export function scheduleActions(page: Page) {
  return page.getByRole("button", { name: "Schedule actions" });
}
