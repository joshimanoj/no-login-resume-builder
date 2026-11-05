import { expect, type Page } from "@playwright/test";

export async function fillPersonal(page: Page, name = "Jane Doe") {
  await page.getByRole("button", { name: "Personal", exact: true }).click();
  await page.getByLabel("Full Name *").fill(name);
  await page.getByLabel("Full Name *").blur();
  await page.getByLabel(/Email/).fill("jane@example.com");
  await page.getByLabel("Phone *").fill("9876543210");
  await page.getByLabel("Location *").fill("Bengaluru");
  await page.locator(".ql-editor").first().fill("Computer science student seeking internships.");
}

export async function fillTwoSkills(page: Page) {
  await page.getByRole("button", { name: "Skills", exact: true }).click();
  const skillInputs = page.getByPlaceholder("Skill name (e.g., JavaScript, Project Management)");
  await expect(skillInputs).toHaveCount(2);
  await skillInputs.nth(0).fill("Python");
  await skillInputs.nth(1).fill("Java");
}

export async function fillPersonalAndSkills(page: Page, name = "Jane Doe") {
  await fillPersonal(page, name);
  await fillTwoSkills(page);
}

export async function addCompleteEducation(
  page: Page,
  options: { scoreType: "gpa" | "percentage"; score: string } = { scoreType: "gpa", score: "8.5" }
) {
  await page.getByRole("button", { name: "Education", exact: true }).click();
  await page.getByRole("button", { name: "Add Education" }).click();
  await page.getByPlaceholder("University Name").fill("ABC Public School");
  await page.getByPlaceholder("Bachelor's, Master's, etc.").fill("Class 12");
  await page.getByPlaceholder("Computer Science, Business, etc.").fill("Science");
  await page.getByPlaceholder("City, State").fill("Bengaluru");
  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill("2020-06-01");
  await dates.nth(1).fill("2022-05-01");
  await page.getByRole("combobox").filter({ hasText: "Percentage or GPA" }).click();
  await page.getByRole("option", { name: options.scoreType === "gpa" ? "GPA (out of 10)" : "Percentage" }).click();
  await page.getByPlaceholder(options.scoreType === "gpa" ? "8.5" : "85").fill(options.score);
}

export async function addExperience(
  page: Page,
  options: { type: "Job" | "Internship"; start: string; end: string }
) {
  await page.getByRole("button", { name: "Experience", exact: true }).click();
  await page.getByRole("button", { name: "Add Experience" }).click();
  await page.getByRole("combobox").filter({ hasText: "Internship or Job" }).click();
  await page.getByRole("option", { name: options.type }).click();
  await page.getByPlaceholder("Company Name").fill("Acme");
  await page.getByPlaceholder("Job Title").fill("Intern");
  await page.getByPlaceholder("City, State").fill("Bengaluru");
  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill(options.start);
  await dates.nth(1).fill(options.end);
}

export async function addEmptyAward(page: Page) {
  await page.getByRole("button", { name: "Awards", exact: true }).click();
  await page.getByRole("button", { name: "Add Award" }).click();
  await page.getByPlaceholder("Award Title").fill("Best Project");
  await page.getByPlaceholder("Organization Name").fill("School");
  await page.locator('input[type="date"]').fill("2022-01-01");
}

export async function openDownloadChecklist(page: Page) {
  await page.getByTestId("header-download").click();
  await page.getByTestId("header-download-pdf").click();
}

export async function completeChecklist(page: Page) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const yes = dialog.getByRole("radio", { name: "Yes" });
  const na = dialog.getByRole("radio", { name: "Not Applicable" });
  await yes.nth(0).click();
  await yes.nth(1).click();
  await yes.nth(2).click();
  await yes.nth(3).click();
  await na.nth(4).click();
  await na.nth(5).click();
  await na.nth(6).click();
}

export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 8000 });
}

export async function downloadFromChecklist(page: Page, kind: "pdf" | "word") {
  const testId = kind === "pdf" ? "checklist-download-pdf" : "checklist-download-word";
  const ext = kind === "pdf" ? "pdf" : "docx";
  await page.getByTestId(testId).click();
  const skip = page.getByTestId("save-prompt-skip");
  await expect(skip).toBeVisible();
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await skip.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`Jane_Doe_Resume\\.${ext}$`, "i"));
  const path = await download.path();
  expect(path).toBeTruthy();
  return download;
}
