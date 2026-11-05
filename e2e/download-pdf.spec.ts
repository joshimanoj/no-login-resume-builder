import { createRequire } from "node:module";
import { expect, test, type Page } from "@playwright/test";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
const pdfjs = require("pdf-parse/lib/pdf.js/v1.10.100/build/pdf.js") as {
  disableWorker: boolean;
  getDocument: (data: Buffer) => Promise<{
    numPages: number;
    getPage: (n: number) => Promise<{
      getTextContent: () => Promise<{ items: { str: string }[] }>;
      getAnnotations: () => Promise<{ url?: string; unsafeUrl?: string; subtype?: string }[]>;
    }>;
  }>;
};

const PUBLICATION_URL = "https://jordanhale.dev/layout-systems";

/** Same document the app posts from getResumeHtml in src/utils/pdfGenerator.ts. */
async function previewDownloadHtml(page: Page): Promise<string> {
  return page.evaluate(() => {
    const styles = Array.from(document.styleSheets);
    let cssText = "";
    styles.forEach((styleSheet) => {
      try {
        const rules = Array.from(styleSheet.cssRules);
        rules.forEach((rule) => {
          cssText += rule.cssText + "\n";
        });
      } catch {
        /* Skip external stylesheets. */
      }
    });
    const element = document.getElementById("resume-preview");
    if (!element) throw new Error("Element not found");
    const hidden: HTMLElement[] = [];
    element.querySelectorAll(".preview-only").forEach((node) => {
      const el = node as HTMLElement;
      hidden.push(el);
      el.style.display = "none";
    });
    const outer = element.outerHTML;
    hidden.forEach((el) => {
      el.style.display = "";
    });
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume</title>
  <style>
    ${cssText}
    @import url('https://cdn.tailwindcss.com');
    body { background-color: white !important; padding: 0 !important; min-height: 100vh !important; }
    #resume-preview { background-color: white !important; min-height: 100vh !important; }
    .bg-white { background-color: white !important; }
    @media print {
      body, #resume-preview { background-color: white !important; min-height: 100vh !important; }
      @page { margin-top: 12mm !important; margin-bottom: 12mm !important; margin-left: 10px !important; margin-right: 10px !important; }
      @page :first { margin-top: 3mm !important; margin-bottom: 12mm !important; margin-left: 10px !important; margin-right: 10px !important; }
    }
  </style>
</head>
<body>
  ${outer}
</body>
</html>`;
  });
}

async function downloadPreviewPdf(page: Page): Promise<Buffer> {
  const html = await previewDownloadHtml(page);
  const response = await page.request.post("/api/generate-pdf", {
    data: { html },
    timeout: 120_000,
  });
  expect(response.ok(), await response.text().catch(() => response.statusText())).toBeTruthy();
  return Buffer.from(await response.body());
}

async function pdfDetails(buffer: Buffer) {
  pdfjs.disableWorker = true;
  const parsed = await pdfParse(buffer);
  const doc = await pdfjs.getDocument(buffer);
  const links: string[] = [];
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pdfPage = await doc.getPage(i);
    const text = await pdfPage.getTextContent();
    pageTexts.push(text.items.map((item) => item.str).join(" "));
    const annots = await pdfPage.getAnnotations();
    for (const annot of annots) {
      const url = annot.url || annot.unsafeUrl;
      if (url) links.push(url);
    }
  }
  return { text: parsed.text.replace(/\s+/g, " "), numpages: parsed.numpages, links, pageTexts };
}

test("preview HTML hides a score until a type is chosen", async ({ page }) => {
  await page.goto("/classic");
  await page.getByRole("button", { name: "Education", exact: true }).click();
  await page.getByRole("button", { name: "Add Education" }).click();
  await page.getByPlaceholder("8.5").fill("8.6");
  const html = await previewDownloadHtml(page);
  expect(html).not.toContain("GPA:");
  expect(html).not.toContain("8.6");
});

test("downloaded Sidebar PDF has expiry, a publication link, bullets, and both score labels", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/classic?sample=1&template=sidebar");
  await page.getByRole("button", { name: "Education", exact: true }).click();
  await page.getByPlaceholder("8.5").fill("8.6");
  await page.getByRole("button", { name: "Add Education" }).click();
  await page.getByPlaceholder("University Name").nth(1).fill("State College");
  await page.getByPlaceholder("Bachelor's, Master's, etc.").nth(1).fill("Class 12");
  await page.getByPlaceholder("Computer Science, Business, etc.").nth(1).fill("Science");
  await page.getByPlaceholder("City, State").nth(1).fill("Austin, TX");
  const dates = page.locator('input[type="date"]');
  await dates.nth(2).fill("2018-06-01");
  await dates.nth(3).fill("2019-05-01");
  await page.getByRole("combobox").filter({ hasText: "Percentage or GPA" }).click();
  await page.getByRole("option", { name: "Percentage" }).click();
  await page.getByPlaceholder("85").fill("92");
  await expect(page.locator("#resume-preview")).toContainText("GPA: 8.6/10");
  await expect(page.locator("#resume-preview")).toContainText("Percentage: 92%");
  await expect(page.locator("#resume-preview")).toContainText("Expires:");

  const html = await previewDownloadHtml(page);
  expect(html).toContain("GPA: 8.6/10");
  expect(html).toContain("Percentage: 92%");

  const pdf = await downloadPreviewPdf(page);
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  const details = await pdfDetails(pdf);
  expect(details.numpages).toBeGreaterThanOrEqual(2);
  expect(details.text).toContain("Expires");
  expect(details.text).toContain("Apr 2026");
  expect(details.text).toContain("Led the resume preview system used by 40k monthly applicants.");
  expect(details.text).toContain("GPA: 8.6/10");
  expect(details.text).toContain("Percentage: 92%");
  expect(details.links).toContain(PUBLICATION_URL);
  const websiteHits = details.links.filter((link) => link.replace(/\/$/, "") === "https://jordanhale.dev");
  expect(websiteHits).toHaveLength(1);
  expect(details.links).toContain("https://linkedin.com/in/jordanhale");
  expect(details.pageTexts[0]).toContain("CONTACT");
  expect(details.pageTexts[0]).toContain("555-014-8821");
  const laterPages = details.pageTexts.slice(1).join(" ");
  expect(laterPages).not.toContain("CONTACT");
  expect(laterPages).not.toContain("555-014-8821");
  expect(laterPages).not.toContain("EDUCATION");
  expect(laterPages).not.toContain("SKILLS");
  expect(details.pageTexts.some((text) => /Publications|Layout systems/.test(text))).toBe(true);
});

test("Sidebar PDF keeps every section heading with its first entry", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/classic?sample=1&template=sidebar");
  const pdf = await downloadPreviewPdf(page);
  const details = await pdfDetails(pdf);
  const pairs = [
    ["CONTACT", "555-014-8821"],
    ["EDUCATION", "University of Texas"],
    ["SKILLS", "TypeScript"],
    ["ABOUT ME", "Product engineer"],
    ["EXPERIENCE", "Senior Product Engineer"],
    ["PROJECTS", "Applicant Preview Kit"],
    ["ACHIEVEMENTS", "Shipped zero-login"],
    ["AWARDS", "Engineering Excellence"],
    ["CERTIFICATIONS", "AWS Solutions Architect"],
    ["PUBLICATIONS", "Layout systems"],
  ] as const;
  for (const [heading, entry] of pairs) {
    const headingPage = details.pageTexts.findIndex((text) => text.includes(heading));
    const entryPage = details.pageTexts.findIndex((text) => text.includes(entry));
    expect(headingPage, heading).toBeGreaterThanOrEqual(0);
    expect(entryPage, entry).toBe(headingPage);
  }
});
