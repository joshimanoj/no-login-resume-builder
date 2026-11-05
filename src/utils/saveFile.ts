export type ReadyDownload = { url: string; filename: string };

/** How long a phone can still open the file after we hand it back. Android often starts the save late. */
export const SAVE_FILE_REVOKE_MS = 120_000;

/** Storage must not block the file. A slow phone network used to leave students on "Generating...". */
export const STORAGE_WAIT_MS = 8_000;

export function safeDownloadFilename(fullName: string, extension: "pdf" | "docx"): string {
  const base = fullName
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9._-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return `${base || "Resume"}_Resume.${extension}`;
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

type DownloadDocument = {
  body: { appendChild: (node: DownloadLink) => void };
  createElement: (tag: string) => DownloadLink;
};

type DownloadLink = {
  href: string;
  download: string;
  rel: string;
  click: () => void;
};

/** A real anchor click. Callers must keep `url` alive; revoking it in the same turn drops the file on Android. */
export function triggerFileDownload(url: string, filename: string, doc: DownloadDocument = document): void {
  const link = doc.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  doc.body.appendChild(link);
  link.click();
}

export function revokeLater(
  url: string,
  delay = SAVE_FILE_REVOKE_MS,
  revoke: (url: string) => void = URL.revokeObjectURL,
  schedule: (fn: () => void, ms: number) => void = setTimeout
): void {
  schedule(() => revoke(url), delay);
}
