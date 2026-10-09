// Reviews a guided-CV submission and saves the result.
// Runs with the service role so the review can be written; students cannot write reviews themselves.
// MOCK: the review is computed here with simple rules. The CURIE assessment-review API call
// replaces `mockReview` once CURIE issues this app its own secret and resume rubric.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const url = Deno.env.get("SUPABASE_URL")!;
  const asStudent = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const {
    data: { user },
  } = await asStudent.auth.getUser();
  if (!user) return json({ error: "Not signed in" }, 401);

  const { submission_id } = await req.json().catch(() => ({}));
  if (!submission_id) return json({ error: "submission_id is required" }, 400);

  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: sub, error } = await admin
    .from("two_guided_cv_submissions")
    .select("id, status, snapshot")
    .eq("id", submission_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!sub) return json({ error: "Submission not found" }, 404);
  if (sub.status !== "reviewing") return json({ status: sub.status });

  const review = mockReview(sub.snapshot);
  const { error: saveError } = await admin
    .from("two_guided_cv_submissions")
    .update({ status: review.verdict, review, reviewed_at: new Date().toISOString() })
    .eq("id", sub.id)
    .eq("status", "reviewing");
  if (saveError) return json({ error: saveError.message }, 500);
  return json({ status: review.verdict });
});

// ---------- mock review (same rules as the frontend's offline mock) ----------

type Feedback = { id: string; status: "good" | "needs_work"; comment: string };

const SECTION_IDS = ["personal", "education", "experience", "skills", "projects", "achievements", "awards", "certifications", "publications"];

const strip = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

function bullets(html: string | undefined): string[] {
  if (!html?.trim()) return [];
  const items = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => strip(m[1])).filter(Boolean);
  if (items.length) return items;
  const text = strip(html);
  return text ? [text] : [];
}

const words = (html: string | undefined) => bullets(html).join(" ").split(/\s+/).filter(Boolean).length;

// deno-lint-ignore no-explicit-any
function mockReview(data: any) {
  const present = (id: string) => ["personal", "education", "skills"].includes(id) || (data[id] ?? []).length > 0;

  const feedback = (id: string): Feedback => {
    const good = (comment: string): Feedback => ({ id, status: "good", comment });
    const work = (comment: string): Feedback => ({ id, status: "needs_work", comment });
    switch (id) {
      case "personal":
        return words(data.personalInfo?.summary) < 20
          ? work("Make your summary more specific: what you study, what you're good at, and the kind of role you want.")
          : good("Clear summary and complete contact details.");
      case "experience": {
        // deno-lint-ignore no-explicit-any
        const points = (data.experience ?? []).flatMap((e: any) => bullets(e.description));
        return points.length === 0 || !points.some((p: string) => /\d/.test(p))
          ? work("Your points list tasks. Add what changed because of your work, with a number if you can.")
          : good("Your points show real results.");
      }
      case "projects":
        // deno-lint-ignore no-explicit-any
        return (data.projects ?? []).some((p: any) => bullets(p.description).length < 2)
          ? work("Add more detail: what the project did, what you used, and what your part was.")
          : good("Projects are described well.");
      case "skills":
        // deno-lint-ignore no-explicit-any
        return (data.skills ?? []).filter((s: any) => s.name?.trim()).length < 4
          ? work("Add a few more skills that fit the roles you want.")
          : good("Relevant skills with honest levels.");
      default:
        return good("Complete and clear.");
    }
  };

  const sections = SECTION_IDS.filter(present).map(feedback);
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
