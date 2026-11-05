import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { width: 360, height: 800, scale: "down" },
  { width: 390, height: 844, scale: "down" },
  { width: 430, height: 932, scale: "down" },
  { width: 768, height: 1024, scale: "down" },
  { width: 1280, height: 800, scale: "down" },
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto("/classic?sample=1");
});

for (const viewport of VIEWPORTS) {
  test(`preview fits a ${viewport.width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const frame = page.getByTestId("resume-preview-frame");
    const preview = page.locator("#resume-preview");
    await frame.scrollIntoViewIfNeeded();
    await expect(preview).toBeVisible();
    if (viewport.scale === "down") {
      await expect.poll(async () => Number(await frame.getAttribute("data-preview-scale"))).toBeLessThan(1);
    } else {
      await expect.poll(async () => Number(await frame.getAttribute("data-preview-scale"))).toBe(1);
    }

    const fit = await page.evaluate(() => {
      const root = document.documentElement;
      const frameEl = document.querySelector("[data-testid='resume-preview-frame']");
      const previewEl = document.querySelector("#resume-preview");
      if (!(frameEl instanceof HTMLElement) || !(previewEl instanceof HTMLElement)) {
        throw new Error("preview frame missing");
      }
      const frameBox = frameEl.getBoundingClientRect();
      const previewBox = previewEl.getBoundingClientRect();
      return {
        pageOverflow: root.scrollWidth - root.clientWidth,
        scale: Number(frameEl.dataset.previewScale),
        previewPastFrame: previewBox.right - frameBox.right,
        previewAboveFrame: frameBox.left - previewBox.left,
        heightGap: Math.abs(frameBox.bottom - previewBox.bottom),
        previewHasTransform: previewEl.getAttribute("style")?.includes("transform") ?? false,
      };
    });

    expect(fit.pageOverflow).toBeLessThanOrEqual(1);
    expect(fit.previewPastFrame).toBeLessThanOrEqual(2);
    expect(fit.previewAboveFrame).toBeLessThanOrEqual(2);
    expect(fit.heightGap).toBeLessThanOrEqual(4);
    expect(fit.previewHasTransform).toBe(false);
    if (viewport.scale === "down") {
      expect(fit.scale).toBeGreaterThan(0);
      expect(fit.scale).toBeLessThan(1);
    } else {
      expect(fit.scale).toBe(1);
    }
  });
}
