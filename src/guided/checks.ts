import {
  validateAwards,
  validateCertifications,
  validateEducation,
  validateExperience,
  validatePersonal,
  validateSkills,
  type ResumeData,
} from "@/utils/resumeRules";
import { SECTIONS, type GuidedState, type SectionId } from "./state";
import { firstStepOfItem, firstStepOfSection, isBachelors, sectionIncluded } from "./steps";

export interface Issue {
  message: string;
  /** Step to jump to so she can fix it. */
  target: string;
  /** Preset for a new item when the fix is "add something" (e.g. Class 10). */
  addPreset?: Record<string, unknown>;
}

const VALIDATORS: Partial<Record<SectionId, (d: ResumeData) => string | null>> = {
  personal: validatePersonal,
  education: validateEducation,
  skills: validateSkills,
  experience: validateExperience,
  awards: validateAwards,
  certifications: validateCertifications,
};

const ITEM_PREFIX: Record<string, SectionId> = {
  Education: "education",
  Experience: "experience",
  Award: "awards",
  Certification: "certifications",
};

const PERSONAL_TARGETS: [RegExp, string][] = [
  [/name/i, "personal.name"],
  [/email/i, "personal.email"],
  [/phone/i, "personal.phone"],
  [/location/i, "personal.location"],
  [/summary/i, "personal.summary"],
];

/** Validation messages were written for a download error; reword them as next steps. */
const friendly = (m: string) =>
  m
    .replace(/^Please add your /, "Add your ")
    .replace(/ before downloading\./, ".")
    .replace(/ is required\./, " is missing.")
    .replace(/^Full Name must be in Title Case.*$/, "Check the capital letters in your name.");

function targetFor(s: GuidedState, section: SectionId, message: string): string {
  const m = message.match(/^(Education|Experience|Award|Certification) (\d+):/);
  if (m) return firstStepOfItem(s, ITEM_PREFIX[m[1]], Number(m[2]) - 1);
  if (section === "personal") return PERSONAL_TARGETS.find(([re]) => re.test(message))?.[1] ?? "personal.name";
  if (section === "skills") return "skills.pick";
  return firstStepOfSection(s, section);
}

export function sectionIssues(s: GuidedState, section: SectionId): Issue[] {
  if (!sectionIncluded(s, section)) return [];
  const issues: Issue[] = [];
  const message = VALIDATORS[section]?.(s.data);
  if (message) issues.push({ message: friendly(message), target: targetFor(s, section, message) });

  if (section === "education") {
    const degrees = s.data.education.map((e) => e.degree.trim());
    if (degrees.length === 0) {
      issues.push({ message: "Add what you're studying now.", target: "education.intro" });
    } else if (degrees.some(isBachelors)) {
      for (const cls of ["Class 12", "Class 10"]) {
        if (!degrees.includes(cls)) {
          issues.push({
            message: `${cls} is missing. It's expected for Bachelor's students.`,
            target: "education.more",
            addPreset: { degree: cls },
          });
        }
      }
    }
  }
  return issues;
}

export const allSectionsPass = (s: GuidedState) => SECTIONS.every((d) => sectionIssues(s, d.id).length === 0);

export const firstFailingSection = (s: GuidedState) => SECTIONS.find((d) => sectionIssues(s, d.id).length > 0);
