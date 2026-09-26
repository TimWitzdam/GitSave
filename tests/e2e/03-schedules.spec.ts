import { expect, test } from "@playwright/test";
import { e2eRepoUrl } from "./e2e.config.mjs";
import { ensureLoggedIn, scheduleActions } from "./helpers";

const SCHEDULE_NAME = "E2E Repo";
let currentName = SCHEDULE_NAME;

test.describe.serial("schedules", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLoggedIn(page);
  });

  test("creates a schedule for a reachable repository", async ({ page }) => {
    await page.goto("/dashboard/schedules");
    await page.locator("#add").click();

    const addPopup = page.locator("#add-schedule");
    await addPopup
      .getByPlaceholder("Enter schedule name", { exact: true })
      .fill(SCHEDULE_NAME);
    await addPopup
      .getByPlaceholder("https://github.com/exampleuser/examplerepo.git")
      .fill(e2eRepoUrl);
    await addPopup.getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Schedule added")).toBeVisible();
    await page.locator("#close-add").click();

    await expect(page.getByText(SCHEDULE_NAME)).toBeVisible();
    await expect(page.getByText("Last backup: Never")).toBeVisible();
  });

  test("rejects an unreachable repository", async ({ page }) => {
    await page.goto("/dashboard/schedules");
    await page.locator("#add").click();

    const addPopup = page.locator("#add-schedule");
    await addPopup
      .getByPlaceholder("Enter schedule name", { exact: true })
      .fill("Bad E2E Repo");
    await addPopup
      .getByPlaceholder("https://github.com/exampleuser/examplerepo.git")
      .fill("file:///definitely/not/a/repository.git");
    await addPopup.getByRole("button", { name: "Save" }).click();

    await expect(
      page.getByText(
        "Invalid repository. Either it does not exist or you forgot to select an access token."
      )
    ).toBeVisible();
    await expect(
      page.locator("#add-schedule").getByText("Schedule added")
    ).not.toBeVisible();
  });

  test("runs a real backup and shows it in the history", async ({ page }) => {
    await page.goto("/dashboard/schedules");
    await scheduleActions(page).click();
    await page.getByRole("button", { name: "Backup now" }).click();

    await expect(
      page.getByText(/Backup started. Depending on the size/)
    ).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await expect
      .poll(
        async () => {
          const response = await page.request.get(
            "/api/history?limit=10&offset=0"
          );
          const body = await response.json();
          return body.backupHistory?.[0]?.success ?? null;
        },
        { timeout: 30_000, message: "backup should complete successfully" }
      )
      .toBe(true);

    await page.goto("/dashboard/history");
    await expect(page.getByText(currentName)).toBeVisible();
    await expect(page.getByText("Backup successful")).toBeVisible();
  });

  test("pauses and resumes a schedule", async ({ page }) => {
    await page.goto("/dashboard/schedules");

    await scheduleActions(page).click();
    await page.getByRole("button", { name: "Pause" }).click();

    await expect
      .poll(async () => {
        const response = await page.request.get("/api/schedules");
        const schedules = await response.json();
        return schedules.find(
          (schedule: { name: string }) => schedule.name === currentName
        )?.paused;
      })
      .toBe(true);

    await page.reload();
    await scheduleActions(page).click();
    await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();
    await page.getByRole("button", { name: "Resume" }).click();

    await expect
      .poll(async () => {
        const response = await page.request.get("/api/schedules");
        const schedules = await response.json();
        return schedules.find(
          (schedule: { name: string }) => schedule.name === currentName
        )?.paused;
      })
      .toBe(false);
  });

  test("edits a schedule", async ({ page }) => {
    await page.goto("/dashboard/schedules");
    await scheduleActions(page).click();
    await page.getByRole("button", { name: "Edit" }).click();

    await expect(
      page.getByRole("heading", { name: "Edit schedule" })
    ).toBeVisible();
    const nameInput = page
      .locator("#edit-schedule")
      .getByPlaceholder("Enter schedule name", { exact: true });
    await expect(nameInput).toHaveValue(currentName);
    await nameInput.fill(`${SCHEDULE_NAME} Renamed`);
    await page.locator("#edit-schedule").getByRole("button", { name: "Save" }).click();

    await expect(page.getByText("Schedule edited")).toBeVisible();
    await page.locator("#close-edit").click();

    currentName = `${SCHEDULE_NAME} Renamed`;
    await expect(page.getByText(currentName)).toBeVisible();
  });

  test("deletes a schedule after confirmation", async ({ page }) => {
    await page.goto("/dashboard/schedules");
    await scheduleActions(page).click();
    await page.getByRole("button", { name: "Delete" }).click();

    const confirmDialog = page
      .locator("div.fixed")
      .filter({ hasText: "Delete schedule" });
    await confirmDialog.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByText(currentName)).not.toBeVisible();
    await expect(
      page.getByText(/You don't have any schedules yet/)
    ).toBeVisible();
  });
});
