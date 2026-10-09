import type { ResumeData } from "@/utils/resumeRules";

export type SectionId =
  | "personal"
  | "education"
  | "experience"
  | "skills"
  | "projects"
  | "achievements"
  | "awards"
  | "certifications"
  | "publications";

export type ListSection = Exclude<SectionId, "personal" | "skills">;

export interface SectionDef {
  id: SectionId;
  label: string;
  intro: string;
  /** Optional sections open with this yes/no question; "No" skips the section. */
  ask?: string;
  /** What she'll be asked for, shown on the section's opening screen. */
  covers: string[];
}

export const SECTIONS: SectionDef[] = [
  {
    id: "personal",
    label: "Personal Information",
    intro: "A few details so employers can reach you.",
    covers: ["Full name", "Email and phone number", "City or town", "LinkedIn and website (optional)", "A short professional summary"],
  },
  {
    id: "education",
    label: "Education",
    intro: "Start with what you're studying now. Then add Class 12 and Class 10.",
    covers: ["What you are studying now", "Class 12 and Class 10", "College or school, city and dates", "Your marks (percentage or GPA)"],
  },
  {
    id: "experience",
    label: "Work Experience",
    intro: "Internships and jobs. Part-time work, tuition teaching, family business and freelance work count too.",
    ask: "Have you done an internship or a job?",
    covers: ["Internship or job", "Where, your role and the city", "Start and end dates", "What you did, in a few points"],
  },
  {
    id: "skills",
    label: "Skills",
    intro: "Pick at least 2 skills. Then say how good you are at each.",
    covers: ["Pick your skills (at least 2)", "How good you are at each"],
  },
  {
    id: "projects",
    label: "Projects",
    intro: "College, home, competition or research projects all count.",
    ask: "Have you made or worked on a project?",
    covers: ["Project name and date", "Tools you used", "What you did, in a few points"],
  },
  {
    id: "achievements",
    label: "Achievements",
    intro: "Competitions, olympiads, hackathons, ranks, leadership roles, NSS, NCC, sports and volunteering.",
    ask: "Have you achieved something you're proud of?",
    covers: ["What you achieved and when", "A few points about it"],
  },
  {
    id: "awards",
    label: "Awards",
    intro: "Prizes, scholarships and medals all count.",
    ask: "Have you won an award or prize?",
    covers: ["Award name and who gave it", "When you got it", "What it was for"],
  },
  {
    id: "certifications",
    label: "Courses & Certifications",
    intro: "Online courses count, like NPTEL, Coursera or Google.",
    ask: "Have you done a course or got a certificate?",
    covers: ["Course name and who gave it", "When you got it", "Certificate ID (optional)"],
  },
  {
    id: "publications",
    label: "Publications",
    intro: "A paper or article published in a journal, at a conference, or in a college magazine.",
    ask: "Have you written something that was published?",
    covers: ["Title and where it was published", "Date and co-authors", "A link (optional)"],
  },
];

export const sectionDef = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
export const sectionNumber = (id: SectionId) => SECTIONS.findIndex((s) => s.id === id) + 1;

export type Verdict = "accepted" | "rejected";

export interface SectionFeedback {
  id: SectionId;
  status: "good" | "needs_work";
  comment: string;
}

export interface Review {
  verdict: Verdict;
  stars: number; // 1-5
  overall: string;
  sections: SectionFeedback[];
}

export interface Submission {
  id: string;
  attempt: number;
  submittedAt: number;
  snapshot: ResumeData;
  review?: Review;
}

export interface GuidedUser {
  id: string;
  name: string;
  email: string;
}

export interface GuidedState {
  data: ResumeData;
  template: string;
  /** Answers to flow-only questions (yes/no choices), keyed by question. */
  answers: Record<string, boolean | undefined>;
  /** The three "Tell me about it" boxes, keyed by item id. */
  prompts: Record<string, string[]>;
  /** Section ids she has marked improved since the last review. */
  improved: SectionId[];
  submissions: Submission[];
  user: GuidedUser | null;
  /** Last question she was on, for "continue where you left off". */
  lastStep?: string;
  /** When the CV (or her answers) last changed, to pick the newer copy between this phone and her account. */
  updatedAt?: number;
}

export const MAX_ATTEMPTS = 10;

export const emptyResume = (): ResumeData => ({
  personalInfo: { fullName: "", email: "", phone: "", location: "", website: "", linkedin: "", summary: "", photo: "" },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  achievements: [],
  awards: [],
  certifications: [],
  publications: [],
});

export const initialState = (): GuidedState => ({
  data: emptyResume(),
  template: "resumake-classic",
  answers: {},
  prompts: {},
  improved: [],
  submissions: [],
  user: null,
});

export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Whether she has entered anything at all in her CV. */
export const hasEnteredAnything = (d: ResumeData) =>
  Object.values(d.personalInfo).some((v) => v?.trim()) ||
  [d.education, d.experience, d.skills, d.projects, d.achievements, d.awards, d.certifications, d.publications].some((l) => (l ?? []).length > 0);

export const latestSubmission = (s: GuidedState): Submission | undefined => s.submissions[s.submissions.length - 1];
export const isUnderReview = (s: GuidedState) => {
  const latest = latestSubmission(s);
  return Boolean(latest && !latest.review);
};
export const isAccepted = (s: GuidedState) => latestSubmission(s)?.review?.verdict === "accepted";
export const attemptsLeft = (s: GuidedState) => MAX_ATTEMPTS - s.submissions.length;
/** Accepted, and not edited since the accepted submission. Download needs this. */
export const isAcceptedAndUnchanged = (s: GuidedState) => {
  const latest = latestSubmission(s);
  return latest?.review?.verdict === "accepted" && JSON.stringify(latest.snapshot) === JSON.stringify(s.data);
};

const STORAGE_KEY = "guided-cv-v1";

export function loadState(): GuidedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<GuidedState>;
    return { ...initialState(), ...parsed, data: { ...emptyResume(), ...parsed.data } };
  } catch {
    return initialState();
  }
}

export function saveState(state: GuidedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be full or blocked; the flow keeps working in memory.
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
