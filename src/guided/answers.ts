import { MONTHS, splitMonth } from "@/utils/monthInput";
import { htmlToBullets } from "@/utils/plainText";
import type { GuidedState, ListSection, SectionId } from "./state";
import { buildSteps, items, type Step } from "./steps";

/**
 * A section's answers, read back from the same steps that ask for them, so the section overview
 * always matches the questions and every row opens the question it came from.
 */

// Short labels for the overview, by the last part of a step's key.
const LABELS: Record<string, string> = {
  "personal.name": "Full name",
  email: "Email",
  phone: "Phone",
  "personal.location": "City or town",
  hasLinkedin: "LinkedIn profile?",
  linkedin: "LinkedIn link",
  hasWebsite: "Website or GitHub?",
  website: "Website or GitHub link",
  summary: "Professional summary",
  degree: "Course or class",
  school: "School/University",
  location: "City",
  start: "Started",
  current: "Still going on?",
  end: "Finished",
  scoreType: "Marks shown as",
  score: "Marks",
  type: "Internship or job",
  company: "Company",
  position: "Role",
  about: "What you did",
  name: "Name",
  date: "Date",
  tools: "Tools used",
  title: "Title",
  issuer: "Given by",
  description: "What it was for",
  "certifications.description": "What it covered",
  hasExpiry: "Does it expire?",
  expiry: "Expires",
  credential: "Certificate ID",
  journal: "Published in",
  authors: "Written with",
  link: "Link",
  pick: "Skills",
  levels: "Skill levels",
};

const FIELD_LABEL: Record<string, string> = { "Class 10": "Board", "Class 12": "Stream" };

export function answerLabel(step: Step, s: GuidedState): string {
  const last = step.key.split(".").pop()!;
  if (last === "field") {
    const index = Number(step.key.split(".")[1]);
    return FIELD_LABEL[String(items(s, "education")[index]?.degree ?? "")] ?? "Subject";
  }
  return LABELS[step.key] ?? LABELS[`${step.section}.${last}`] ?? LABELS[last] ?? ("q" in step ? step.q : last);
}

const monthText = (iso: string) => {
  const { month, year } = splitMonth(iso);
  return iso ? `${MONTHS[Number(month) - 1] ?? ""} ${year}`.trim() : "";
};

/** What she answered, as plain text ("" when not answered yet). */
export function answerText(step: Step, s: GuidedState): string {
  switch (step.kind) {
    case "text":
    case "choice":
      return step.get(s).trim();
    case "month":
      return monthText(step.get(s));
    case "yesno": {
      const v = step.get(s);
      return v === undefined ? "" : v ? "Yes" : "No";
    }
    case "describe": {
      const item = items(s, step.section as ListSection)[step.index];
      return htmlToBullets(String(item?.description ?? ""))
        .map((b) => `• ${b}`)
        .join("\n");
    }
    case "tools":
      return String(items(s, step.section as ListSection)[step.index]?.technologies ?? "").trim();
    case "summary":
      return htmlToBullets(s.data.personalInfo.summary).join(" ");
    case "skills":
      return s.data.skills.map((k) => k.name).join(", ");
    case "levels":
      return s.data.skills.map((k) => `${k.name}: ${k.level}`).join(", ");
    default:
      return "";
  }
}

const isQuestion = (st: Step) => st.kind !== "intro" && st.kind !== "more" && st.kind !== "check";

/** The part of a step key that names one entry: "experience.2" for "experience.2.company", "personal" for personal steps. */
export const entryOf = (key: string) => {
  const [sec, second] = key.split(".");
  return /^\d+$/.test(second ?? "") ? `${sec}.${second}` : sec;
};

export interface AnswerRow {
  key: string;
  label: string;
  value: string;
}

/** The section's answers, grouped by entry (one group for personal details and skills). */
export function sectionAnswers(s: GuidedState, section: SectionId): { entry: string; index?: number; rows: AnswerRow[] }[] {
  const groups = new Map<string, AnswerRow[]>();
  for (const st of buildSteps(s)) {
    if (st.section !== section || !isQuestion(st)) continue;
    const entry = entryOf(st.key);
    if (!groups.has(entry)) groups.set(entry, []);
    groups.get(entry)!.push({ key: st.key, label: answerLabel(st, s), value: answerText(st, s) });
  }
  return [...groups].map(([entry, rows]) => {
    const index = Number(entry.split(".")[1]);
    return { entry, index: Number.isNaN(index) ? undefined : index, rows };
  });
}

/** A one-line name for an entry, like "Web Development Intern, Ankur Tech Solutions". */
export function itemLabel(sec: ListSection, it: Record<string, unknown>): string {
  const v = (k: string) => String(it[k] ?? "").trim();
  const parts: Record<ListSection, string[]> = {
    education: [[v("degree"), v("field")].filter(Boolean).join(" "), v("school")],
    experience: [v("position"), v("company")],
    projects: [v("name")],
    achievements: [v("title")],
    awards: [v("title")],
    certifications: [v("name"), v("issuer")],
    publications: [v("title")],
  };
  return parts[sec].filter(Boolean).join(", ") || "Not filled in yet";
}
