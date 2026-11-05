import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dialogs = ["DownloadChecklistDialog.tsx"];

describe("phone dialogs", () => {
  it("pins sheets to the screen edges and does not use viewport-height units", () => {
    for (const name of dialogs) {
      const source = readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
      expect(source, name).not.toMatch(/dvh|svh|lvh|\bvh\b|vmin|vmax/);
      expect(source, name).not.toMatch(/min-h-0/);
      expect(source, name).toContain("!top-3");
      expect(source, name).toContain("!bottom-3");
      expect(source, name).toContain("!left-3");
      expect(source, name).toContain("!right-3");
    }
  });
});
