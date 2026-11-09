import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  GraduationCap,
  Star,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SectionOverview } from "./overview";
import { entryOf, itemLabel, sectionAnswers } from "./answers";
import { buildSteps, firstStepOfSection, isListSection, isPassedOver, items, type Step } from "./steps";
import { useGuided } from "./GuidedContext";
import { SECTIONS, attemptsLeft, changedSinceReview, flaggedSections, isUnderReview, latestSubmission, sectionDef, sectionNumber, type SectionId } from "./state";
import { STATUS_TEXT, sectionStatus, type SectionStatus } from "./checks";

/** The bottom sheets here: tall enough for every section, white even under the app's dark theme. */
const SHEET = "max-h-[85dvh] overflow-y-auto rounded-t-2xl border-none bg-white text-slate-800 md:mx-auto md:max-w-lg";

export const SECTION_ICONS: Record<SectionId, LucideIcon> = {
  personal: User,
  education: GraduationCap,
  experience: Briefcase,
  skills: Star,
  projects: FolderKanban,
  achievements: Trophy,
  awards: Award,
  certifications: BadgeCheck,
  publications: BookOpen,
};

/** Where a section opens: a started one as one form to review and edit, others at their first question. */
export function useOpenSection() {
  const { goStep } = useGuided();
  const navigate = useNavigate();
  return (id: SectionId, status: SectionStatus) => {
    if (status === "done" || status === "needs") navigate(`/edit/${id}`);
    else goStep(`${id}.intro`);
  };
}

/** All 9 sections with their status. Used in the sections menu and on the home page. */
export function SectionsList({
  current,
  onOpen,
  editing = false,
}: {
  current?: SectionId;
  onOpen?: () => void;
  /** Editing after a review: sections Curie flagged first and marked, and each opens its questions. */
  editing?: boolean;
}) {
  const { state, goStep } = useGuided();
  const openSection = useOpenSection();
  const flagged = new Set(editing ? flaggedSections(state) : []);
  const ordered = editing ? [...SECTIONS].sort((a, b) => Number(flagged.has(b.id)) - Number(flagged.has(a.id))) : SECTIONS;
  const open = (id: SectionId, status: SectionStatus) => (editing ? goStep(firstStepOfSection(state, id)) : openSection(id, status));
  return (
    <ul className="divide-y divide-slate-100">
      {ordered.map((d) => {
        const k = SECTIONS.indexOf(d);
        const status = sectionStatus(state, d.id);
        const Icon = SECTION_ICONS[d.id];
        return (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => {
                onOpen?.();
                open(d.id, status);
              }}
              aria-current={d.id === current ? "step" : undefined}
              className={`flex min-h-[52px] w-full items-center gap-3 rounded-lg px-2 text-left ${d.id === current ? "bg-[#eef3f8]" : "hover:bg-slate-50"}`}
            >
              <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="flex-1 text-[15px]">
                {k + 1}. {d.label}
              </span>
              {flagged.has(d.id) ? (
                <span className="rounded-md bg-[#fdf3e1] px-2 py-0.5 text-xs font-medium text-[#854F0B]">Curie: needs work</span>
              ) : (
                <span className={`text-xs ${status === "done" ? "text-[#3b6d11]" : status === "needs" ? "text-[#854F0B]" : "text-slate-400"}`}>
                  {status === "done" ? "✓ " : status === "needs" ? "! " : ""}
                  {STATUS_TEXT[status]}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The section bar on every section screen. The section's name opens her answers so far (on question
 * screens); "All sections" goes to any other section.
 */
export function SectionsMenu({ current, showAnswers = true }: { current: SectionId; showAnswers?: boolean }) {
  const [open, setOpen] = useState<"answers" | "sections" | null>(null);
  // The bar stays mounted from question to question: close the sheet when she moves on (e.g. taps an answer to change it).
  const { key } = useLocation();
  useEffect(() => setOpen(null), [key]);
  const def = sectionDef(current);
  const Icon = SECTION_ICONS[current];
  const name = (
    <>
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold leading-tight">{def.label}</span>
      </span>
    </>
  );
  return (
    <div className="flex min-h-12 w-full items-center gap-2 rounded-xl bg-[#eaf5e4] pl-3 pr-2 text-[#1f3d12]">
      {showAnswers ? (
        <button type="button" aria-label={`${def.label}: see your answers`} onClick={() => setOpen("answers")} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 text-left">
          {name}
        </button>
      ) : (
        <div className="flex min-h-12 min-w-0 flex-1 items-center gap-2">{name}</div>
      )}
      <span className="hidden shrink-0 text-xs font-medium min-[400px]:inline">
        {sectionNumber(current)} of {SECTIONS.length}
      </span>
      <button
        type="button"
        onClick={() => setOpen("sections")}
        className="flex min-h-9 shrink-0 items-center gap-0.5 rounded-full bg-white px-2.5 text-xs font-medium text-primary"
      >
        All sections <ChevronDown className="h-3.5 w-3.5" aria-hidden />
      </button>
      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="bottom" className={SHEET}>
          {open === "answers" ? (
            <>
              <AnswersSheetBody section={current} />
            </>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Your sections</SheetTitle>
              </SheetHeader>
              <p className="mt-1 text-sm text-slate-500">Go to any section. You can come back to this one later.</p>
              <div className="mt-3">
                <SectionsList current={current} onOpen={() => setOpen(null)} />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AnswersSheetBody({ section }: { section: SectionId }) {
  return (
    <>
      <SheetHeader>
        <SheetTitle>Your {sectionDef(section).label} so far</SheetTitle>
      </SheetHeader>
      <p className="mt-1 text-sm text-slate-500">Tap an answer to change it. You'll come back to this question.</p>
      <SectionOverview section={section} peek />
    </>
  );
}

/** Short answers that read well in one line (not yes/no, not long descriptions). */
const glanceable = (v: string) => v !== "" && v !== "Yes" && v !== "No" && !v.startsWith("•") && !v.includes("\n") && v.length <= 40;

/**
 * Above each question: what she has entered so far for this entry (or, starting a new one, the entries
 * already added), so she keeps her bearings without hunting for it. "See all" opens every answer.
 */
export function SoFar({ step }: { step: Step }) {
  const { state } = useGuided();
  const [open, setOpen] = useState(false);
  const entry = entryOf(step.key);
  const groups = sectionAnswers(state, step.section);
  const here = groups.find((g) => g.entry === entry);
  const rows = (here?.rows ?? []).filter((r) => r.key !== step.key && glanceable(r.value));
  // An answer set for her (e.g. "Job" from "Add a job") doesn't count as having started this entry.
  const preset = new Set(buildSteps(state).filter((st) => isPassedOver(st, state)).map((st) => st.key));
  const mine = rows.some((r) => !preset.has(r.key)) ? rows.map((r) => r.value) : [];
  const list = isListSection(step.section) ? step.section : null;
  const others = list ? items(state, list).filter((_, k) => `${list}.${k}` !== entry).map((it) => itemLabel(list, it)) : [];

  const [label, text] = mine.length ? ["So far", mine.join(" · ")] : others.length ? ["Already added", others.join("; ")] : [null, ""];
  if (!label) return null;

  return (
    // Laptops show the CV filling in beside the questions, so this is for phones and tablets.
    <Sheet open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full lg:hidden items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm active:bg-slate-100"
      >
        <span className="min-w-0 flex-1 text-slate-700">
          <span className="font-medium text-slate-500">{label}: </span>
          <span className="line-clamp-2">{text}</span>
        </span>
        <span className="flex shrink-0 items-center gap-0.5 whitespace-nowrap font-medium text-primary">
          See all <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </button>
      <SheetContent side="bottom" className={SHEET}>
        <AnswersSheetBody section={step.section} />
      </SheetContent>
    </Sheet>
  );
}

/** After a review, as soon as she changes something: submit again from wherever she is. */
export function ResubmitBar() {
  const { state } = useGuided();
  const navigate = useNavigate();
  if (!changedSinceReview(state) || isUnderReview(state) || attemptsLeft(state) <= 0) return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#eaf5e4] px-3 py-2 text-sm text-[#1f3d12]">
      <span className="min-w-0 flex-1">You've made changes since Curie's review.</span>
      <button
        type="button"
        onClick={() => navigate("/submit")}
        className="flex min-h-9 shrink-0 items-center gap-0.5 rounded-full bg-secondary px-3 text-sm font-medium text-white"
      >
        Submit again <ChevronRight className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

/** While she reworks a section Curie asked her to improve: what Curie said, kept in view. */
export function CurieNote({ section }: { section: SectionId }) {
  const { state } = useGuided();
  const latest = latestSubmission(state);
  const feedback = latest?.review?.verdict !== "accepted" ? latest?.review?.sections.find((f) => f.id === section && f.status === "needs_work") : undefined;
  if (!feedback || isUnderReview(state)) return null;
  return (
    <p className="mb-3 rounded-lg bg-[#fdf3e1] px-3 py-2 text-sm text-[#633806]">
      <span className="font-medium">Curie said: </span>
      {feedback.comment}
    </p>
  );
}

/** "Edit my CV": she picks the part to change, and goes through its questions with her answers filled in. */
export function EditCvSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={SHEET}>
        <SheetHeader>
          <SheetTitle>Which part do you want to change?</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-sm text-slate-500">Tap a section to go through its questions. Your answers are already filled in.</p>
        <div className="mt-3">
          <SectionsList editing onOpen={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
