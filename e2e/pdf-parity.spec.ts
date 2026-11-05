import { expect, test } from "@playwright/test";
import { TEMPLATE_IDS } from "../src/utils/templates";

test.use({ viewport: { width: 1280, height: 900 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("guided-mock-backend", "1"));
});

// The PDF is made from #resume-preview's HTML plus the page styles, so identical HTML means an identical PDF.
for (const template of TEMPLATE_IDS) {
  test(`guided download matches the original builder: ${template}`, async ({ page }) => {
    await page.route(/supabase\.co/, (r) => r.fulfill({ status: 201, contentType: "application/json", body: "[]" }));
    // The sample's third job overlaps its degree; mark it an internship in both builders so it can be downloaded.
    await page.goto(`/classic?sample=1&template=${template}`);
    await page.getByRole("button", { name: "Experience", exact: true }).click();
    await page.getByRole("combobox").filter({ hasText: "Job" }).last().click();
    await page.getByRole("option", { name: "Internship" }).click();
    const classic = await page.locator("#resume-preview").evaluate((el) => el.outerHTML);

    await page.goto("/");
    await page.evaluate(async (t) => {
      const { SAMPLE_RESUME } = await import("/src/utils/sampleResume.ts");
      const data = structuredClone(SAMPLE_RESUME);
      data.experience[2].experienceType = "internship";
      localStorage.setItem("guided-mock-backend", "1");
      localStorage.setItem("guided-cv-v1", JSON.stringify({ data, template: t, answers: {}, prompts: {}, improved: [], submissions: [], user: null }));
    }, template);
    await page.goto("/download");
    await expect(page.getByRole("heading", { name: "Your CV is ready to send" })).toBeVisible();
    const guided = await page.locator("#resume-preview").evaluate((el) => el.outerHTML);

    const strip = (h: string) => h.replace(/ data-(lov|component)[\w-]*="[^"]*"/g, "");
    expect(strip(guided)).toBe(strip(classic));
  });
}

test("the guided flow downloads a real PDF, with a save link as a fallback", async ({ page }) => {
  await page.route(/supabase\.co/, (r) => r.fulfill({ status: 201, contentType: "application/json", body: "[]" }));
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await page.goto("/download");
  const downloadPromise = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: "Download my CV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Asha_Rao_Resume.pdf");
  await expect(page.getByTestId("save-ready-file")).toHaveAttribute("download", "Asha_Rao_Resume.pdf");
});
