import { expect, test } from "@playwright/test";
import { DOWNLOAD_CHECKLIST } from "../src/utils/resumeRules";
import { completeChecklist, downloadFromChecklist, fillPersonalAndSkills, openDownloadChecklist } from "./helpers/fillValidResume";

const PHONES = [
  { width: 320, height: 700 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/classic?sample=1");
});

for (const phone of PHONES) {
  test(`skill name stays typeable at ${phone.width}px`, async ({ page }) => {
    await page.setViewportSize(phone);
    await page.getByRole("button", { name: "Skills", exact: true }).click();
    const input = page.getByPlaceholder("Skill name (e.g., JavaScript, Project Management)").first();
    const level = page.getByRole("combobox").first();
    await expect(input).toBeVisible();
    const inputBox = await input.boundingBox();
    const levelBox = await level.boundingBox();
    expect(inputBox).toBeTruthy();
    expect(levelBox).toBeTruthy();
    expect(inputBox!.width).toBeGreaterThanOrEqual(160);
    expect(inputBox!.width).toBeGreaterThanOrEqual(levelBox!.width);
  });

  test(`level menu shows every option at ${phone.width}px`, async ({ page }) => {
    await page.setViewportSize(phone);
    await page.getByRole("button", { name: "Skills", exact: true }).click();
    await page.getByRole("combobox").first().click();
    const list = page.getByRole("listbox");
    await expect(list).toBeVisible();
    const fit = await list.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const options = [...node.querySelectorAll("[role='option']")];
      return {
        height: box.height,
        count: options.length,
        allVisible: options.every((option) => {
          const item = option.getBoundingClientRect();
          return item.height >= 24 && item.top >= box.top - 2 && item.bottom <= box.bottom + 2;
        }),
      };
    });
    expect(fit.count).toBe(4);
    expect(fit.height).toBeGreaterThanOrEqual(120);
    expect(fit.allVisible).toBe(true);
  });
}

for (const phone of PHONES) {
  test(`every checklist question is reachable at ${phone.width}px`, async ({ page }) => {
    await page.setViewportSize(phone);
    await page.goto("/classic");
    await fillPersonalAndSkills(page);
    await openDownloadChecklist(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(phone.height + 2);
    expect(box!.height).toBeGreaterThanOrEqual(phone.height * 0.5);
    for (const question of DOWNLOAD_CHECKLIST) {
      const line = dialog.getByText(question);
      await line.scrollIntoViewIfNeeded();
      await expect(line).toBeVisible();
    }
  });
}

for (const phone of PHONES) {
  test(`header save and download menu stay tappable at ${phone.width}px`, async ({ page }) => {
    await page.setViewportSize(phone);
    const controls = [
      page.getByTestId("header-save-cv"),
      page.getByTestId("header-download"),
      page.getByTestId("header-google-sign-in"),
    ];
    for (const control of controls) {
      await expect(control).toBeVisible();
      await expect(control).toBeEnabled();
      const box = await control.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width + 1);
    }
    await page.getByTestId("header-download").click();
    for (const item of [page.getByTestId("header-download-pdf"), page.getByTestId("header-download-word")]) {
      await expect(item).toBeVisible();
      const box = await item.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(-1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(phone.width + 1);
    }
  });
}

test("phone download keeps a tappable save link", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/classic");
  await fillPersonalAndSkills(page);
  await openDownloadChecklist(page);
  await completeChecklist(page);
  await downloadFromChecklist(page, "pdf");
  const save = page.getByTestId("save-ready-file");
  await expect(save).toBeVisible({ timeout: 60_000 });
  await expect(save).toHaveAttribute("href", /^blob:/);
  await expect(save).toHaveAttribute("download", /Jane_Doe_Resume\.pdf$/);

  const secondPromise = page.waitForEvent("download", { timeout: 15_000 });
  await save.click();
  const second = await secondPromise;
  expect(second.suggestedFilename()).toMatch(/Jane_Doe_Resume\.pdf$/);
  expect(await second.path()).toBeTruthy();
});
