import { expect, test } from "@playwright/test";
import {
  addCompleteEducation,
  addEmptyAward,
  addExperience,
  completeChecklist,
  downloadFromChecklist,
  expectToast,
  fillPersonal,
  fillPersonalAndSkills,
  fillTwoSkills,
  openDownloadChecklist,
} from "./helpers/fillValidResume";

test.beforeEach(async ({ page }) => {
  // Downloads would otherwise be recorded in the live Supabase project.
  await page.route(/supabase\.co/, (route) => route.fulfill({ status: 201, contentType: "application/json", body: "[]" }));
  await page.goto("/classic");
});

test("empty download is blocked and checklist does not open", async ({ page }) => {
  await openDownloadChecklist(page);
  await expectToast(page, /Please add your name|Missing Information/i);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("valid personal + two skills opens the checklist", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await openDownloadChecklist(page);
  await expect(page.getByRole("heading", { name: "Have you re-read these points?" })).toBeVisible();
  await expect(page.getByTestId("checklist-download-pdf")).toBeDisabled();
  await expect(page.getByTestId("checklist-download-word")).toBeDisabled();
});

test("checklist download buttons stay off until all Yes or NA", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await openDownloadChecklist(page);
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "Yes" }).nth(0).click();
  await expect(page.getByTestId("checklist-download-pdf")).toBeDisabled();
  await completeChecklist(page);
  await expect(page.getByTestId("checklist-download-pdf")).toBeEnabled();
  await expect(page.getByTestId("checklist-download-word")).toBeEnabled();
});

test("title-cases the name when opening the checklist", async ({ page }) => {
  await fillPersonalAndSkills(page, "jane doe");
  await expect(page.locator("#resume-preview")).toContainText("Jane Doe");
  await openDownloadChecklist(page);
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("education GPA and Percentage labels show in preview", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await addCompleteEducation(page, { scoreType: "gpa", score: "8.5" });
  await expect(page.getByText("GPA: 8.5/10")).toBeVisible();

  await page.getByRole("combobox").filter({ hasText: "GPA (out of 10)" }).click();
  await page.getByRole("option", { name: "Percentage" }).click();
  await page.getByPlaceholder("85").fill("85");
  await expect(page.getByText("Percentage: 85%")).toBeVisible();
});

test("job overlapping education is blocked", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await addCompleteEducation(page);
  await addExperience(page, { type: "Job", start: "2021-01-01", end: "2021-06-01" });
  await openDownloadChecklist(page);
  await expectToast(page, /overlap/i);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("internship overlapping education is allowed", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await addCompleteEducation(page);
  await addExperience(page, { type: "Internship", start: "2021-01-01", end: "2021-06-01" });
  await openDownloadChecklist(page);
  await expect(page.getByRole("heading", { name: "Have you re-read these points?" })).toBeVisible();
});

test("award without description is blocked", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await addEmptyAward(page);
  await openDownloadChecklist(page);
  await expectToast(page, /Description is required/i);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("checklist includes the Bachelor's 10th and 12th question", async ({ page }) => {
  await fillPersonalAndSkills(page);
  await openDownloadChecklist(page);
  await expect(
    page.getByText("If you are pursuing a Bachelor's Degree, have you added your 10th and 12th Education Details?")
  ).toBeVisible();
});

test("smoke: Download PDF and Word produce files", async ({ page }) => {
  test.setTimeout(120_000);
  await fillPersonalAndSkills(page);
  await openDownloadChecklist(page);
  await completeChecklist(page);
  await downloadFromChecklist(page, "pdf");

  await openDownloadChecklist(page);
  await completeChecklist(page);
  await downloadFromChecklist(page, "word");
});

const LIVE_TEMPLATE_NAMES = [
  "Classic",
  "Shaded Headers",
  "Modern",
  "Traditional",
  "Minimal",
  "Professional",
  "Creative",
  "Executive",
  "Sidebar",
] as const;

test("home shows every live template including Sidebar", async ({ page }) => {
  const cards = page.locator("button.shrink-0.w-36");
  await expect(cards).toHaveCount(LIVE_TEMPLATE_NAMES.length);
  for (const name of LIVE_TEMPLATE_NAMES) {
    await expect(cards.filter({ hasText: name })).toHaveCount(1);
  }
});

test("classic preview joins contact with pipes and hides Skills until a name is entered", async ({ page }) => {
  await fillPersonal(page);
  const preview = page.locator("#resume-preview");
  await expect(preview).toContainText("jane@example.com | 9876543210 | Bengaluru");
  await expect(preview.getByRole("heading", { name: "Skills", exact: true })).toHaveCount(0);

  await fillTwoSkills(page);
  await expect(preview).toContainText("Python");
  await expect(preview.getByRole("heading", { name: "Skills", exact: true })).toBeVisible();
});

test("sample=1 loads Jordan Hale on Modern, Creative, and Sidebar", async ({ page }) => {
  for (const template of ["modern", "creative", "sidebar"] as const) {
    await page.goto(`/classic?sample=1&template=${template}`);
    const preview = page.locator("#resume-preview");
    await expect(preview).toContainText("jordan.hale@email.com");
    await expect(preview).toContainText("TypeScript");
    await expect(preview).toContainText("Northstar Labs");
  }
});

test("Modern photo upload opens the crop dialog", async ({ page }) => {
  await page.locator("button.shrink-0.w-36").filter({ hasText: "Modern" }).click();
  await page.getByRole("button", { name: "Personal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Upload Photo" })).toBeVisible();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  await page.locator('input[type="file"]').setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.getByRole("heading", { name: "Crop photo" })).toBeVisible();
});
