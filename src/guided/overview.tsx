import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import type { ResumeData } from "@/utils/resumeRules";
import { useGuided } from "./GuidedContext";
import { itemLabel, sectionAnswers } from "./answers";
import { sectionDef, type ListSection, type SectionId } from "./state";
import { LIST_SECTIONS, addItem, firstStepOfItem, firstStepOfSection, isListSection, items, optInKey, sectionIncluded, setAnswer } from "./steps";
import { BigButton, Hint } from "./ui";

const ENTRY_NAME: Record<ListSection, string> = {
  education: "education",
  experience: "internship or job",
  projects: "project",
  achievements: "achievement",
  awards: "award",
  certifications: "course or certificate",
  publications: "publication",
};

// Choices made on the first question don't count as content on their own.
const NOT_CONTENT = new Set(["id", "current", "scoreType", "experienceType"]);
const isBlank = (item: Record<string, unknown>) =>
  Object.entries(item).every(([k, v]) => NOT_CONTENT.has(k) || v === undefined || v === null || String(v).trim() === "");

/**
 * Everything she has entered in one section, in the same style as the questions. Each answer opens
 * its own question (saving returns here); entries can be added, step by step, or deleted.
 */
export function SectionOverview({ section }: { section: SectionId }) {
  const { state, update, goStep } = useGuided();
  const here = useLocation().pathname;

  // An extra entry she started adding and backed out of, without typing anything, isn't kept.
  // (A section's only entry stays: the questions for that section are built from it.)
  useEffect(() => {
    update((s) => {
      const tidy = LIST_SECTIONS.filter((sec) => items(s, sec).length > 1 && items(s, sec).some(isBlank));
      if (!tidy.length) return s;
      const data = { ...s.data };
      for (const sec of tidy) {
        const kept = items(s, sec).filter((it) => !isBlank(it));
        (data as Record<string, unknown>)[sec] = kept.length ? kept : items(s, sec).slice(0, 1);
      }
      return { ...s, data };
    });
  }, [update]);

  if (!sectionIncluded(state, section)) {
    return (
      <div className="mt-6">
        <Hint>You skipped this section.</Hint>
        <BigButton
          className="mt-4"
          onClick={() => {
            let s = setAnswer(state, optInKey(section), true);
            if (isListSection(section) && items(s, section).length === 0) s = addItem(s, section);
            s = update(s);
            goStep(isListSection(section) ? firstStepOfItem(s, section, 0) : firstStepOfSection(s, section), here);
          }}
        >
          Add {sectionDef(section).label}
        </BigButton>
      </div>
    );
  }

  const list = isListSection(section) ? section : null;
  const entries = list ? items(state, list) : [];

  const addAnother = (sec: ListSection) => {
    const next = update(addItem(state, sec));
    goStep(firstStepOfItem(next, sec, entries.length), here);
  };

  const remove = (sec: ListSection, index: number) => {
    const name = itemLabel(sec, entries[index]);
    if (!window.confirm(`Delete "${name}" from your CV?`)) return;
    const rest = entries.filter((_, k) => k !== index);
    let s = { ...state, data: { ...state.data, [sec]: rest } as ResumeData };
    // Deleting the last entry of an optional section leaves the section out, as if she'd said "No".
    if (rest.length === 0 && sectionDef(sec).ask) s = setAnswer(s, optInKey(sec), false);
    update(s);
  };

  return (
    <div className="mt-3 space-y-4">
      {sectionAnswers(state, section).map((group) => {
        const name = list && group.index !== undefined ? itemLabel(list, entries[group.index]) : null;
        return (
          <section key={group.entry} className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label={name ?? sectionDef(section).label}>
            {list && name !== null && (
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 py-1.5 pl-3.5 pr-1.5">
                <h3 className="min-w-0 flex-1 py-1 text-[15px] font-semibold leading-snug">{name}</h3>
                <button
                  type="button"
                  aria-label={`Delete ${name}`}
                  onClick={() => remove(list, group.index!)}
                  className="flex h-10 items-center gap-1 rounded-lg px-2.5 text-sm text-slate-500 hover:bg-white active:bg-white"
                >
                  <Trash2 className="h-4 w-4" aria-hidden /> Delete
                </button>
              </div>
            )}
            <ul className="divide-y divide-slate-100">
              {group.rows.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={() => goStep(row.key, here)}
                    className="flex min-h-[52px] w-full items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 active:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-slate-500">{row.label}</span>
                      <span className={`block whitespace-pre-line break-words text-[15px] ${row.value ? "text-slate-900" : "text-slate-400"}`}>
                        {row.value || "Not added yet"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {list && (
        <button
          type="button"
          onClick={() => addAnother(list)}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-slate-300 bg-white px-3 text-[15px] font-medium text-primary active:bg-slate-50"
        >
          <Plus className="h-4 w-4" aria-hidden />
          {entries.length ? `Add another ${ENTRY_NAME[list]}` : `Add ${ENTRY_NAME[list]}`}
        </button>
      )}
    </div>
  );
}
