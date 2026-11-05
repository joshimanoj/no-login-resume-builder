import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  ChevronDown,
  FolderKanban,
  GraduationCap,
  Star,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useGuided } from "./GuidedContext";
import { SECTIONS, sectionDef, sectionNumber, type SectionId } from "./state";
import { STATUS_TEXT, sectionStatus, type SectionStatus } from "./checks";

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
export function SectionsList({ current, onOpen }: { current?: SectionId; onOpen?: () => void }) {
  const { state } = useGuided();
  const open = useOpenSection();
  return (
    <ul className="divide-y divide-slate-100">
      {SECTIONS.map((d, k) => {
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
              <span className={`text-xs ${status === "done" ? "text-[#3b6d11]" : status === "needs" ? "text-[#854F0B]" : "text-slate-400"}`}>
                {status === "done" ? "✓ " : status === "needs" ? "! " : ""}
                {STATUS_TEXT[status]}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The section bar on every section screen: which section she's in, and a tap away from all the others.
 */
export function SectionsMenu({ current }: { current: SectionId }) {
  const [open, setOpen] = useState(false);
  const def = sectionDef(current);
  const Icon = SECTION_ICONS[current];
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-[#eaf5e4] px-3 text-left text-[#1f3d12]"
        >
          <Icon className="h-5 w-5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{def.label}</span>
          <span className="hidden shrink-0 text-xs font-medium min-[400px]:inline">
            {sectionNumber(current)} of {SECTIONS.length}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-white px-2 py-1 text-xs font-medium text-primary">
            All sections <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </span>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl border-none bg-white text-slate-800 md:mx-auto md:max-w-lg">
        <SheetHeader>
          <SheetTitle>Your sections</SheetTitle>
        </SheetHeader>
        <p className="mt-1 text-sm text-slate-500">Go to any section. You can come back to this one later.</p>
        <div className="mt-3">
          <SectionsList current={current} onOpen={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
