import { isRichTextEmpty, type ResumeData } from "@/utils/resumeRules";

// Guest work stays in this browser only. A signed-in header Save, and a
// sign-in that promised to save this version, store one snapshot. Autosave
// does not. Each CV keeps 10 versions; the database trigger drops the oldest.

const DRAFT_KEY = "two-resume-builder-draft";
const PENDING_KEY = "two-resume-builder-pending";

export type AccountAction =
  | { type: "download"; kind: "pdf" | "word" }
  | { type: "new" }
  | { type: "open"; resumeId: string }
  | { type: "restore"; versionId: string }
  | { type: "sign-out" }
  | { type: "save-only" }
  | { type: "save-draft" };

export type PendingAction = AccountAction & { saveFirst: boolean };

export type EditorDraft = {
  resumeData: ResumeData;
  templateId: string;
  resumeId: string | null;
  savedSnapshot: string | null;
};

export function createBlankResume(): ResumeData {
  return {
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      website: "",
      linkedin: "",
      summary: "",
      photo: "",
    },
    experience: [],
    education: [],
    skills: [
      { id: "skill-1", name: "", level: "Intermediate" },
      { id: "skill-2", name: "", level: "Intermediate" },
    ],
    projects: [],
    achievements: [],
    awards: [],
    certifications: [],
    publications: [],
  };
}

export function isResumeBlank(data: ResumeData): boolean {
  const info = data.personalInfo;
  const personal = [
    info.fullName,
    info.email,
    info.phone,
    info.location,
    info.website,
    info.linkedin,
    info.summary,
    info.photo,
  ];
  if (personal.some((value) => !isRichTextEmpty(value))) return false;
  if (data.experience.length > 0) return false;
  if (data.education.length > 0) return false;
  if ((data.projects ?? []).length > 0) return false;
  if ((data.achievements ?? []).length > 0) return false;
  if ((data.awards ?? []).length > 0) return false;
  if ((data.certifications ?? []).length > 0) return false;
  if ((data.publications ?? []).length > 0) return false;
  return !data.skills.some((skill) => skill.name.trim() !== "");
}

export function resumeSnapshot(data: ResumeData, templateId: string): string {
  return JSON.stringify({ templateId, data });
}

export function needsSavePrompt(
  data: ResumeData,
  templateId: string,
  savedSnapshot: string | null
): boolean {
  if (isResumeBlank(data)) return false;
  return resumeSnapshot(data, templateId) !== savedSnapshot;
}

export function resumeTitle(data: ResumeData): string {
  const name = data.personalInfo.fullName.trim();
  return name ? name.slice(0, 120) : "Untitled CV";
}

export type VersionWriteSource = "explicit-save" | "promised-version" | "keep-draft";

export function versionSaveSource(action: AccountAction["type"] | "header-save"): VersionWriteSource {
  if (action === "save-draft") return "keep-draft";
  if (action === "download") return "promised-version";
  return "explicit-save";
}

// Header Save and the download sign-in promise write one version.
// "Keep the work so far" stays a draft. An unchanged CV, or a snapshot
// already stored as the latest version, does not insert another row.
export function saveRecordsVersion(input: {
  source: VersionWriteSource;
  changed: boolean;
  matchesLatestVersion: boolean;
}): boolean {
  if (input.source === "keep-draft") return false;
  if (!input.changed || input.matchesLatestVersion) return false;
  return true;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

export function versionSnapshotsMatch(
  data: ResumeData,
  templateId: string,
  otherData: ResumeData,
  otherTemplateId: string
): boolean {
  return templateId === otherTemplateId && stableJson(data) === stableJson(otherData);
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function sessionStorageOrNull(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

export function readDraft(): EditorDraft | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EditorDraft;
    if (!parsed?.resumeData?.personalInfo) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(draft: EditorDraft): void {
  storage()?.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft(): void {
  storage()?.removeItem(DRAFT_KEY);
}

export function readPending(): PendingAction | null {
  const store = sessionStorageOrNull();
  if (!store) return null;
  const raw = store.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PendingAction;
    if (!parsed?.type) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePending(action: PendingAction): void {
  sessionStorageOrNull()?.setItem(PENDING_KEY, JSON.stringify(action));
}

export function clearPending(): void {
  sessionStorageOrNull()?.removeItem(PENDING_KEY);
}

export function isSampleMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("sample") === "1";
}

export function hasOAuthReturn(): boolean {
  if (typeof window === "undefined") return false;
  const query = `${window.location.search}${window.location.hash}`;
  return query.includes("code=") || query.includes("access_token=");
}
