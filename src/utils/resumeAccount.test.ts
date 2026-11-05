import { describe, expect, it } from "vitest";
import {
  createBlankResume,
  isResumeBlank,
  needsSavePrompt,
  resumeSnapshot,
  resumeTitle,
  saveRecordsVersion,
  versionSaveSource,
  versionSnapshotsMatch,
} from "./resumeAccount";
import type { ResumeData } from "./resumeRules";

function namedResume(): ResumeData {
  const data = createBlankResume();
  data.personalInfo.fullName = "Jane Doe";
  return data;
}

describe("resume account save prompt", () => {
  it("treats the empty form as blank", () => {
    expect(isResumeBlank(createBlankResume())).toBe(true);
    expect(needsSavePrompt(createBlankResume(), "resumake-classic", null)).toBe(false);
  });

  it("asks to save after the form changes", () => {
    const data = namedResume();
    expect(needsSavePrompt(data, "resumake-classic", null)).toBe(true);
    const saved = resumeSnapshot(data, "resumake-classic");
    expect(needsSavePrompt(data, "resumake-classic", saved)).toBe(false);
    expect(needsSavePrompt(data, "modern", saved)).toBe(true);
  });

  it("uses the name as the CV title", () => {
    expect(resumeTitle(createBlankResume())).toBe("Untitled CV");
    expect(resumeTitle(namedResume())).toBe("Jane Doe");
  });
});

describe("version write decision", () => {
  it("stores a version when a changed CV is explicitly saved", () => {
    expect(versionSaveSource("header-save")).toBe("explicit-save");
    expect(saveRecordsVersion({
      source: "explicit-save",
      changed: true,
      matchesLatestVersion: false,
    })).toBe(true);
  });

  it("does not store a version when the CV is unchanged or already the latest snapshot", () => {
    expect(saveRecordsVersion({
      source: "explicit-save",
      changed: false,
      matchesLatestVersion: false,
    })).toBe(false);
    expect(saveRecordsVersion({
      source: "explicit-save",
      changed: true,
      matchesLatestVersion: true,
    })).toBe(false);
  });

  it("stores a version for the download sign-in promise and keeps a draft-only save as a draft", () => {
    expect(versionSaveSource("download")).toBe("promised-version");
    expect(saveRecordsVersion({
      source: "promised-version",
      changed: true,
      matchesLatestVersion: false,
    })).toBe(true);
    expect(versionSaveSource("save-draft")).toBe("keep-draft");
    expect(saveRecordsVersion({
      source: "keep-draft",
      changed: true,
      matchesLatestVersion: false,
    })).toBe(false);
  });

  it("treats two copies of the same CV as one snapshot", () => {
    const data = namedResume();
    const copy = namedResume();
    const info = copy.personalInfo;
    copy.personalInfo = {
      summary: info.summary,
      photo: info.photo,
      linkedin: info.linkedin,
      website: info.website,
      location: info.location,
      phone: info.phone,
      email: info.email,
      fullName: info.fullName,
    };
    expect(versionSnapshotsMatch(data, "resumake-classic", copy, "resumake-classic")).toBe(true);
    expect(versionSnapshotsMatch(data, "resumake-classic", copy, "sidebar")).toBe(false);
  });
});
