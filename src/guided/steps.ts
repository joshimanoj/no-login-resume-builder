import { toTitleCase, type ResumeData } from "@/utils/resumeRules";
import { htmlToBullets, paragraphToHtml, sentence } from "@/utils/plainText";
import { SECTIONS, newId, type GuidedState, type ListSection, type SectionId } from "./state";

type S = GuidedState;
type Get<T> = (s: S) => T;
type Set<T> = (s: S, value: T) => S;

interface Base {
  key: string;
  section: SectionId;
}

export type Step =
  | (Base & { kind: "intro" })
  | (Base & {
      kind: "text";
      q: string;
      hint?: string;
      placeholder?: string;
      multiline?: boolean;
      inputType?: "text" | "email" | "tel" | "url";
      autoComplete?: string;
      /** Label for an alternative answer button, and the value it sets. */
      alt?: { label: string; value: string };
      /** Label for a skip link; skipping clears the value. */
      skip?: string;
      validate?: (value: string) => string | null;
      onDone?: (s: S) => S;
      get: Get<string>;
      set: Set<string>;
    })
  | (Base & {
      kind: "choice";
      q: string;
      hint?: string;
      options: string[];
      allowOther?: boolean;
      skip?: { label: string; apply: (s: S) => S };
      get: Get<string>;
      set: Set<string>;
    })
  | (Base & { kind: "yesno"; q: string; hint?: string; get: Get<boolean | undefined>; set: Set<boolean> })
  | (Base & {
      kind: "month";
      q: string;
      hint?: string;
      noFuture?: boolean;
      skip?: string;
      get: Get<string>;
      set: Set<string>;
    })
  | (Base & { kind: "prompts"; index: number })
  | (Base & { kind: "bullets"; index: number })
  | (Base & { kind: "tools"; index: number })
  | (Base & { kind: "more" })
  | (Base & { kind: "summary" })
  | (Base & { kind: "skills" })
  | (Base & { kind: "levels" })
  | (Base & { kind: "check" });

// ---------- state helpers ----------

type Item = { id: string } & Record<string, unknown>;

export const items = (s: S, sec: ListSection): Item[] => ((s.data[sec] ?? []) as unknown as Item[]);

export const setItem = (s: S, sec: ListSection, i: number, patch: Record<string, unknown>): S => {
  const arr = [...items(s, sec)];
  arr[i] = { ...arr[i], ...patch };
  return { ...s, data: { ...s.data, [sec]: arr } as ResumeData };
};

const setPersonal = (s: S, patch: Partial<ResumeData["personalInfo"]>): S => ({
  ...s,
  data: { ...s.data, personalInfo: { ...s.data.personalInfo, ...patch } },
});

export const setAnswer = (s: S, key: string, value: boolean): S => ({ ...s, answers: { ...s.answers, [key]: value } });

export function newItem(sec: ListSection, preset: Record<string, unknown> = {}): Item {
  const base: Record<ListSection, Record<string, unknown>> = {
    education: { school: "", degree: "", field: "", location: "", startDate: "", endDate: "", current: false, gpa: "" },
    experience: { company: "", position: "", location: "", startDate: "", endDate: "", current: false, description: "" },
    projects: { name: "", description: "", technologies: "", date: "" },
    achievements: { title: "", description: "", date: "" },
    awards: { title: "", issuer: "", date: "", description: "" },
    certifications: { name: "", issuer: "", date: "", expiryDate: "", credentialId: "" },
    publications: { title: "", journal: "", date: "", authors: "", link: "" },
  };
  return { id: newId(sec), ...base[sec], ...preset };
}

export const addItem = (s: S, sec: ListSection, preset?: Record<string, unknown>): S => ({
  ...s,
  data: { ...s.data, [sec]: [...items(s, sec), newItem(sec, preset)] } as ResumeData,
});

const str = (v: unknown) => (typeof v === "string" ? v : "");
const toMonth = (iso: string) => iso.slice(0, 7);
const fromMonth = (month: string) => (month ? `${month}-01` : "");

// ---------- description helpers (shared with the section editors) ----------

export { bulletsToHtml, htmlToBullets, promptsToHtml, sentence } from "@/utils/plainText";

// ---------- question data ----------

export const DEGREES = ["B.Sc.", "B.Com", "B.A.", "B.Tech", "BCA", "BBA", "Diploma", "Class 12", "Class 10"];

const FIELDS: Record<string, string[]> = {
  "B.Sc.": ["Physics", "Chemistry", "Mathematics", "Biology", "Computer Science", "Biotechnology"],
  "B.Com": ["General", "Accounting and Finance", "Banking and Insurance"],
  "B.A.": ["English", "Economics", "History", "Psychology", "Political Science"],
  "B.Tech": ["Computer Science", "Electronics", "Electrical", "Mechanical", "Civil"],
  BCA: ["Computer Applications"],
  BBA: ["Business Administration"],
  "Class 12": ["Science", "Commerce", "Arts"],
  "Class 10": ["CBSE", "ICSE", "State board"],
};

export const isSchool = (degree: string) => degree === "Class 10" || degree === "Class 12";
export const isBachelors = (degree: string) => /^(B\.|BCA|BBA)/i.test(degree.trim());

const scoreValidator = (type: unknown) => (value: string) => {
  const n = Number(value.replace(/%/g, "").trim());
  if (!value.trim()) return null;
  if (!Number.isFinite(n)) return "Enter a number, like 8.4 or 82.";
  if (type === "gpa" && (n <= 0 || n > 10)) return "GPA should be more than 0 and at most 10.";
  if (type === "percentage" && (n < 0 || n > 100)) return "Percentage should be between 0 and 100.";
  return null;
};

const linkValidator = (value: string) =>
  !value.trim() || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(value.trim()) ? null : "That doesn't look like a link. Check it once.";

// ---------- step builders ----------

function personalSteps(): Step[] {
  const sec = "personal" as const;
  const p = (s: S) => s.data.personalInfo;
  return [
    {
      kind: "text", key: "personal.name", section: sec, q: "What's your full name?", hint: "We'll fix the capital letters for you.",
      autoComplete: "name", get: (s) => p(s).fullName, set: (s, v) => setPersonal(s, { fullName: v }),
      onDone: (s) => setPersonal(s, { fullName: toTitleCase(p(s).fullName) }),
    },
    {
      kind: "text", key: "personal.email", section: sec, q: "Your email", hint: "Use the one registered with VigyanShaala, if you have it.",
      inputType: "email", autoComplete: "email", placeholder: "name@gmail.com",
      validate: (v) => (!v.trim() || /^\S+@\S+\.\S+$/.test(v.trim()) ? null : "That doesn't look like an email. Check it once."),
      get: (s) => p(s).email, set: (s, v) => setPersonal(s, { email: v.trim() }),
    },
    {
      kind: "text", key: "personal.phone", section: sec, q: "Your phone number", inputType: "tel", autoComplete: "tel", placeholder: "98765 43210",
      get: (s) => p(s).phone, set: (s, v) => setPersonal(s, { phone: v }),
    },
    {
      kind: "text", key: "personal.location", section: sec, q: "Which city or town do you live in?", placeholder: "Nashik, Maharashtra",
      autoComplete: "address-level2", get: (s) => p(s).location, set: (s, v) => setPersonal(s, { location: v }),
    },
    {
      kind: "yesno", key: "personal.hasLinkedin", section: sec, q: "Do you have a LinkedIn profile?", hint: "Optional.",
      get: (s) => s.answers["personal.linkedin"] ?? (p(s).linkedin ? true : undefined),
      set: (s, v) => setPersonal(setAnswer(s, "personal.linkedin", v), v ? {} : { linkedin: "" }),
    },
    {
      kind: "text", key: "personal.linkedin", section: sec, q: "Your LinkedIn link", inputType: "url", placeholder: "linkedin.com/in/yourname",
      validate: linkValidator, get: (s) => p(s).linkedin ?? "", set: (s, v) => setPersonal(s, { linkedin: v.trim() }),
    },
    {
      kind: "yesno", key: "personal.hasWebsite", section: sec, q: "Do you have a website, portfolio or GitHub?", hint: "Optional.",
      get: (s) => s.answers["personal.website"] ?? (p(s).website ? true : undefined),
      set: (s, v) => setPersonal(setAnswer(s, "personal.website", v), v ? {} : { website: "" }),
    },
    {
      kind: "text", key: "personal.website", section: sec, q: "Your website or GitHub link", inputType: "url", placeholder: "github.com/yourname",
      validate: linkValidator, get: (s) => p(s).website ?? "", set: (s, v) => setPersonal(s, { website: v.trim() }),
    },
    { kind: "summary", key: "personal.summary", section: sec },
  ];
}

function educationSteps(s: S): Step[] {
  const sec = "education" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `education.${i}`;
    const degree = str(item.degree);
    const school = isSchool(degree);
    const steps: Step[] = [
      {
        kind: "choice", key: `${k}.degree`, section: sec,
        q: i === 0 ? "What are you studying now?" : "What do you want to add?",
        options: DEGREES, allowOther: true, get: () => degree, set: (st, v) => setItem(st, sec, i, { degree: v }),
      },
      {
        kind: "choice", key: `${k}.field`, section: sec,
        q: degree === "Class 10" ? "Which board?" : degree === "Class 12" ? "Which stream?" : "Which subject?",
        options: FIELDS[degree] ?? [], allowOther: true, get: () => str(item.field), set: (st, v) => setItem(st, sec, i, { field: v }),
      },
      {
        kind: "text", key: `${k}.school`, section: sec, q: school ? "Your school name" : "Your college name",
        get: () => str(item.school), set: (st, v) => setItem(st, sec, i, { school: v }),
      },
      {
        kind: "text", key: `${k}.location`, section: sec, q: "Which city is it in?", placeholder: "Nashik",
        get: () => str(item.location), set: (st, v) => setItem(st, sec, i, { location: v }),
      },
      {
        kind: "month", key: `${k}.start`, section: sec, q: "When did you start?", hint: "Month and year.",
        get: () => toMonth(str(item.startDate)), set: (st, v) => setItem(st, sec, i, { startDate: fromMonth(v) }),
      },
      {
        kind: "yesno", key: `${k}.current`, section: sec, q: school ? `Are you still in ${degree}?` : "Are you still studying here?",
        get: () => (item.current === true ? true : item.endDate ? false : undefined),
        set: (st, v) => setItem(st, sec, i, v ? { current: true, endDate: "" } : { current: false }),
      },
    ];
    if (!item.current) {
      steps.push({
        kind: "month", key: `${k}.end`, section: sec, q: "When did you finish?", hint: "Month and year.",
        get: () => toMonth(str(item.endDate)), set: (st, v) => setItem(st, sec, i, { endDate: fromMonth(v) }),
      });
    }
    steps.push({
      kind: "choice", key: `${k}.scoreType`, section: sec, q: "How are your marks shown?", hint: "Pick what your marksheet uses.",
      options: ["Percentage", "GPA (out of 10)"],
      get: () => (item.scoreType === "percentage" ? "Percentage" : item.scoreType === "gpa" ? "GPA (out of 10)" : ""),
      set: (st, v) => setItem(st, sec, i, { scoreType: v === "Percentage" ? "percentage" : "gpa" }),
      skip: { label: "I don't have marks yet", apply: (st) => setItem(st, sec, i, { scoreType: undefined, gpa: "" }) },
    });
    if (item.scoreType) {
      steps.push({
        kind: "text", key: `${k}.score`, section: sec,
        q: item.scoreType === "gpa" ? "Your GPA" : "Your percentage",
        hint: item.scoreType === "gpa" ? "A number from 0 to 10, like 8.4." : "A number from 0 to 100, like 82.",
        inputType: "text", validate: scoreValidator(item.scoreType),
        get: () => str(item.gpa), set: (st, v) => setItem(st, sec, i, { gpa: v.replace(/%/g, "").trim() }),
      });
    }
    return steps;
  });
}

function experienceSteps(s: S): Step[] {
  const sec = "experience" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `experience.${i}`;
    const steps: Step[] = [
      {
        kind: "choice", key: `${k}.type`, section: sec, q: "Was it an internship or a job?", options: ["Internship", "Job"],
        get: () => (item.experienceType === "job" ? "Job" : item.experienceType === "internship" ? "Internship" : ""),
        set: (st, v) => setItem(st, sec, i, { experienceType: v === "Job" ? "job" : "internship" }),
      },
      {
        kind: "text", key: `${k}.company`, section: sec, q: "Where did you work?", hint: "Company or organisation name.",
        get: () => str(item.company), set: (st, v) => setItem(st, sec, i, { company: v }),
      },
      {
        kind: "text", key: `${k}.position`, section: sec, q: "What was your role?", placeholder: "Web Development Intern",
        get: () => str(item.position), set: (st, v) => setItem(st, sec, i, { position: v }),
      },
      {
        kind: "text", key: `${k}.location`, section: sec, q: "Which city?", alt: { label: "It was online", value: "Online" },
        get: () => str(item.location), set: (st, v) => setItem(st, sec, i, { location: v }),
      },
      {
        kind: "month", key: `${k}.start`, section: sec, q: "When did you start?", hint: "Month and year.", noFuture: true,
        get: () => toMonth(str(item.startDate)), set: (st, v) => setItem(st, sec, i, { startDate: fromMonth(v) }),
      },
      {
        kind: "yesno", key: `${k}.current`, section: sec, q: "Are you still doing it?",
        get: () => (item.current === true ? true : item.endDate ? false : undefined),
        set: (st, v) => setItem(st, sec, i, v ? { current: true, endDate: "" } : { current: false }),
      },
    ];
    if (!item.current) {
      steps.push({
        kind: "month", key: `${k}.end`, section: sec, q: "When did it end?", hint: "Month and year.", noFuture: true,
        get: () => toMonth(str(item.endDate)), set: (st, v) => setItem(st, sec, i, { endDate: fromMonth(v) }),
      });
    }
    steps.push({ kind: "prompts", key: `${k}.about`, section: sec, index: i });
    steps.push({ kind: "bullets", key: `${k}.points`, section: sec, index: i });
    return steps;
  });
}

function projectSteps(s: S): Step[] {
  const sec = "projects" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `projects.${i}`;
    return [
      {
        kind: "text", key: `${k}.name`, section: sec, q: "What was the project called?", placeholder: "College fest website",
        get: () => str(item.name), set: (st, v) => setItem(st, sec, i, { name: v }),
      },
      {
        kind: "month", key: `${k}.date`, section: sec, q: "When was it?", hint: "Month and year.", skip: "Skip",
        get: () => toMonth(str(item.date)), set: (st, v) => setItem(st, sec, i, { date: fromMonth(v) }),
      },
      { kind: "tools", key: `${k}.tools`, section: sec, index: i },
      { kind: "prompts", key: `${k}.about`, section: sec, index: i },
      { kind: "bullets", key: `${k}.points`, section: sec, index: i },
    ];
  });
}

function achievementSteps(s: S): Step[] {
  const sec = "achievements" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `achievements.${i}`;
    return [
      {
        kind: "text", key: `${k}.title`, section: sec, q: "What was it?", placeholder: "NSS volunteer",
        get: () => str(item.title), set: (st, v) => setItem(st, sec, i, { title: v }),
      },
      {
        kind: "month", key: `${k}.date`, section: sec, q: "When?", hint: "Month and year.", skip: "Skip",
        get: () => toMonth(str(item.date)), set: (st, v) => setItem(st, sec, i, { date: fromMonth(v) }),
      },
      { kind: "prompts", key: `${k}.about`, section: sec, index: i },
      { kind: "bullets", key: `${k}.points`, section: sec, index: i },
    ];
  });
}

function awardSteps(s: S): Step[] {
  const sec = "awards" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `awards.${i}`;
    return [
      {
        kind: "text", key: `${k}.title`, section: sec, q: "What was the award?", placeholder: "2nd place, inter-college science quiz",
        get: () => str(item.title), set: (st, v) => setItem(st, sec, i, { title: v }),
      },
      {
        kind: "text", key: `${k}.issuer`, section: sec, q: "Who gave it?", placeholder: "Savitribai Phule Pune University",
        get: () => str(item.issuer), set: (st, v) => setItem(st, sec, i, { issuer: v }),
      },
      {
        kind: "month", key: `${k}.date`, section: sec, q: "When did you get it?", hint: "Month and year.", noFuture: true,
        get: () => toMonth(str(item.date)), set: (st, v) => setItem(st, sec, i, { date: fromMonth(v) }),
      },
      {
        kind: "text", key: `${k}.description`, section: sec, q: "What was it for?", multiline: true,
        hint: "In your own words. Example: Placed 2nd out of 40 college teams in a science quiz.",
        get: () => htmlToBullets(str(item.description)).join(" "),
        set: (st, v) => setItem(st, sec, i, { description: paragraphToHtml(sentence(v)) }),
      },
    ];
  });
}

const ISSUERS = ["NPTEL", "Coursera", "Google", "Udemy", "Your college"];

function certificationSteps(s: S): Step[] {
  const sec = "certifications" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `certifications.${i}`;
    const expiresKey = `cert.${item.id}.expires`;
    const steps: Step[] = [
      {
        kind: "text", key: `${k}.name`, section: sec, q: "What was the course called?", placeholder: "Programming in Python",
        get: () => str(item.name), set: (st, v) => setItem(st, sec, i, { name: v }),
      },
      {
        kind: "choice", key: `${k}.issuer`, section: sec, q: "Who gave it?", options: ISSUERS, allowOther: true,
        get: () => str(item.issuer), set: (st, v) => setItem(st, sec, i, { issuer: v }),
      },
      {
        kind: "month", key: `${k}.date`, section: sec, q: "When did you get it?", hint: "Month and year.", noFuture: true,
        get: () => toMonth(str(item.date)), set: (st, v) => setItem(st, sec, i, { date: fromMonth(v) }),
      },
      {
        kind: "yesno", key: `${k}.hasExpiry`, section: sec, q: "Does it expire?", hint: "Most courses don't.",
        get: (st) => st.answers[expiresKey] ?? (item.expiryDate ? true : undefined),
        set: (st, v) => setItem(setAnswer(st, expiresKey, v), sec, i, v ? {} : { expiryDate: "" }),
      },
    ];
    if (s.answers[expiresKey]) {
      steps.push({
        kind: "month", key: `${k}.expiry`, section: sec, q: "When does it expire?", hint: "Month and year.",
        get: () => toMonth(str(item.expiryDate)), set: (st, v) => setItem(st, sec, i, { expiryDate: fromMonth(v) }),
      });
    }
    steps.push({
      kind: "text", key: `${k}.credential`, section: sec, q: "Certificate ID or number", hint: "Optional. It helps employers check it.",
      skip: "Skip", get: () => str(item.credentialId), set: (st, v) => setItem(st, sec, i, { credentialId: v.trim() }),
    });
    return steps;
  });
}

function publicationSteps(s: S): Step[] {
  const sec = "publications" as const;
  return items(s, sec).flatMap((item, i): Step[] => {
    const k = `publications.${i}`;
    return [
      {
        kind: "text", key: `${k}.title`, section: sec, q: "What's the title?",
        get: () => str(item.title), set: (st, v) => setItem(st, sec, i, { title: v }),
      },
      {
        kind: "text", key: `${k}.journal`, section: sec, q: "Where was it published?", hint: "Journal, conference or magazine.",
        get: () => str(item.journal), set: (st, v) => setItem(st, sec, i, { journal: v }),
      },
      {
        kind: "month", key: `${k}.date`, section: sec, q: "When was it published?", hint: "Month and year.", noFuture: true,
        get: () => toMonth(str(item.date)), set: (st, v) => setItem(st, sec, i, { date: fromMonth(v) }),
      },
      {
        kind: "text", key: `${k}.authors`, section: sec, q: "Who wrote it with you?", hint: "Names, separated by commas.",
        alt: { label: "Only me", value: "" }, get: () => str(item.authors), set: (st, v) => setItem(st, sec, i, { authors: v }),
      },
      {
        kind: "text", key: `${k}.link`, section: sec, q: "Link to it", inputType: "url", placeholder: "https://doi.org/...", skip: "Skip",
        validate: linkValidator, get: () => str(item.link), set: (st, v) => setItem(st, sec, i, { link: v.trim() }),
      },
    ];
  });
}

const SECTION_STEPS: Record<SectionId, (s: S) => Step[]> = {
  personal: personalSteps,
  education: educationSteps,
  experience: experienceSteps,
  skills: () => [
    { kind: "skills", key: "skills.pick", section: "skills" },
    { kind: "levels", key: "skills.levels", section: "skills" },
  ],
  projects: projectSteps,
  achievements: achievementSteps,
  awards: awardSteps,
  certifications: certificationSteps,
  publications: publicationSteps,
};

export const LIST_SECTIONS: ListSection[] = ["education", "experience", "projects", "achievements", "awards", "certifications", "publications"];
export const isListSection = (id: SectionId): id is ListSection => (LIST_SECTIONS as string[]).includes(id);

export const optInKey = (id: SectionId) => `optin.${id}`;

/** Whether a section is part of her CV: required sections always are; optional ones once she says yes. */
export const sectionIncluded = (s: S, id: SectionId) => {
  const def = SECTIONS.find((d) => d.id === id)!;
  return !def.ask || s.answers[optInKey(id)] === true;
};

export function buildSteps(s: S): Step[] {
  const out: Step[] = [];
  for (const def of SECTIONS) {
    out.push({ kind: "intro", key: `${def.id}.intro`, section: def.id });
    if (!sectionIncluded(s, def.id)) continue;
    let steps = SECTION_STEPS[def.id](s);
    // Personal: the link question only follows a "yes".
    if (def.id === "personal") {
      steps = steps.filter(
        (st) =>
          (st.key !== "personal.linkedin" || s.answers["personal.linkedin"] === true) &&
          (st.key !== "personal.website" || s.answers["personal.website"] === true),
      );
    }
    out.push(...steps);
    if (isListSection(def.id)) out.push({ kind: "more", key: `${def.id}.more`, section: def.id });
    out.push({ kind: "check", key: `${def.id}.check`, section: def.id });
  }
  return out;
}

export const firstStepOfSection = (s: S, id: SectionId) => buildSteps(s).find((st) => st.section === id)!.key;

/** The first step of item `index` in a list section (falls back to the section intro). */
export const firstStepOfItem = (s: S, id: SectionId, index: number) =>
  buildSteps(s).find((st) => st.key.startsWith(`${id}.${index}.`))?.key ?? `${id}.intro`;
