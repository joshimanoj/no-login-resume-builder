/**
 * Offline copy of the review rules, used only by the mock backend (local development and tests).
 * The real review is written by the `curie-review` Supabase Edge Function, which has the same rules
 * until the CURIE API replaces them.
 */
import type { ResumeData } from "@/utils/resumeRules";
import { SECTIONS, type Review, type SectionFeedback, type SectionId } from "./state";
import { htmlToBullets } from "./steps";

const wordCount = (html: string) => htmlToBullets(html).join(" ").split(/\s+/).filter(Boolean).length;

function sectionPresent(data: ResumeData, id: SectionId) {
  if (id === "personal" || id === "education" || id === "skills") return true;
  return (data[id] ?? []).length > 0;
}

export function mockReview(data: ResumeData): Review {
  const feedback = (id: SectionId): SectionFeedback => {
    const good = (comment: string): SectionFeedback => ({ id, status: "good", comment });
    const work = (comment: string): SectionFeedback => ({ id, status: "needs_work", comment });
    switch (id) {
      case "personal":
        return wordCount(data.personalInfo.summary) < 20
          ? work("Make your summary more specific: what you study, what you're good at, and the kind of role you want.")
          : good("Clear summary and complete contact details.");
      case "experience": {
        const points = data.experience.flatMap((e) => htmlToBullets(e.description));
        return points.length === 0 || !points.some((p) => /\d/.test(p))
          ? work("Your points list tasks. Add what changed because of your work, with a number if you can.")
          : good("Your points show real results.");
      }
      case "projects":
        return (data.projects ?? []).some((p) => htmlToBullets(p.description).length < 2)
          ? work("Add more detail: what the project did, what you used, and what your part was.")
          : good("Projects are described well.");
      case "skills":
        return data.skills.filter((s) => s.name.trim()).length < 4
          ? work("Add a few more skills that fit the roles you want.")
          : good("Relevant skills with honest levels.");
      default:
        return good("Complete and clear.");
    }
  };

  const sections = SECTIONS.filter((d) => sectionPresent(data, d.id)).map((d) => feedback(d.id));
  const needsWork = sections.filter((s) => s.status === "needs_work").length;
  const accepted = needsWork === 0;
  return {
    verdict: accepted ? "accepted" : "rejected",
    stars: accepted ? (sections.length >= 7 ? 5 : 4) : Math.max(1, 4 - needsWork),
    overall: accepted
      ? "Your CV is clear, complete and specific. Your points show what you did and what changed because of it. Well done."
      : `A good start. ${needsWork === 1 ? "One section needs" : `${needsWork} sections need`} more work before your CV is ready. Read the feedback for each section, improve it, and submit again.`,
    sections,
  };
}
