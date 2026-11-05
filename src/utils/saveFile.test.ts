import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SAVE_FILE_REVOKE_MS,
  revokeLater,
  safeDownloadFilename,
  triggerFileDownload,
  withTimeout,
} from "./saveFile";

describe("safeDownloadFilename", () => {
  it("builds a filename phones will accept", () => {
    expect(safeDownloadFilename("Jane Doe", "pdf")).toBe("Jane_Doe_Resume.pdf");
    expect(safeDownloadFilename("Jane Doe", "docx")).toBe("Jane_Doe_Resume.docx");
  });

  it("strips characters that make Android drop the download", () => {
    expect(safeDownloadFilename("A/B:C?", "pdf")).toBe("ABC_Resume.pdf");
    expect(safeDownloadFilename("   ", "pdf")).toBe("Resume_Resume.pdf");
  });
});

describe("triggerFileDownload", () => {
  it("clicks an anchor and does not revoke the blob url", () => {
    const clicks: string[] = [];
    const revoked: string[] = [];
    const doc = {
      body: { appendChild: () => undefined },
      createElement: () => {
        const link = {
          href: "",
          download: "",
          rel: "",
          click: () => clicks.push(link.href),
        };
        return link;
      },
    };
    triggerFileDownload("blob:resume", "Jane_Doe_Resume.pdf", doc);
    expect(clicks).toEqual(["blob:resume"]);
    expect(revoked).toEqual([]);
  });
});

describe("revokeLater", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the blob url alive across the Android save delay", () => {
    vi.useFakeTimers();
    const revoked: string[] = [];
    revokeLater("blob:resume", SAVE_FILE_REVOKE_MS, (url) => revoked.push(url));
    vi.advanceTimersByTime(SAVE_FILE_REVOKE_MS - 1);
    expect(revoked).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(revoked).toEqual(["blob:resume"]);
  });
});

describe("withTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops waiting so a slow network cannot block the file", async () => {
    vi.useFakeTimers();
    const pending = new Promise<string>(() => undefined);
    const result = withTimeout(pending, 8000);
    const assertion = expect(result).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;
  });
});
