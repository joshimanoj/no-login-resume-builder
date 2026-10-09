import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase";
import type { ResumeData } from "@/utils/resumeRules";
import { newId, type GuidedState, type GuidedUser, type Review, type Submission } from "./state";
import { mockReview } from "./curieReview";

/**
 * Everything the guided flow stores outside the phone: Google sign-in, the saved CV,
 * and submissions with Curie's review (tables two_guided_cvs and two_guided_cv_submissions;
 * reviews are written by the `curie-review` Edge Function).
 *
 * In local development, tests set localStorage "guided-mock-backend" = "1" so nothing touches
 * the live project; the same happens if Supabase isn't configured.
 */
const MOCK_FLAG = "guided-mock-backend";

export function usingMock(): boolean {
  if (!getSupabaseClient()) return true;
  if (!import.meta.env.DEV) return false;
  try {
    return localStorage.getItem(MOCK_FLAG) === "1";
  } catch {
    return false;
  }
}

const db = () => getSupabaseClient()!;

// ---------- sign-in ----------

const toUser = (u: User): GuidedUser => ({
  id: u.id,
  name: String(u.user_metadata?.full_name ?? u.user_metadata?.name ?? ""),
  email: u.email ?? "",
});

/** Starts Google sign-in. Returns the user straight away in mock mode; otherwise the page goes to Google and comes back to `returnTo`. */
export async function signInWithGoogle(returnTo: string): Promise<GuidedUser | null> {
  if (usingMock()) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { id: newId("mock-user"), name: "Student", email: "student@example.com" };
  }
  const { error } = await db().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}${returnTo}` },
  });
  if (error) throw error;
  return null;
}

export async function signOut(): Promise<void> {
  if (!usingMock()) await db().auth.signOut();
}

/** Calls `onChange` with the signed-in user now and whenever it changes. Not used in mock mode. */
export function watchUser(onChange: (user: GuidedUser | null) => void): () => void {
  if (usingMock()) return () => {};
  const { data } = db().auth.onAuthStateChange((_event, session) => {
    // Defer: Supabase recommends not awaiting other Supabase calls inside this callback.
    setTimeout(() => onChange(session?.user ? toUser(session.user) : null), 0);
  });
  return () => data.subscription.unsubscribe();
}

// ---------- saved CV ----------

export interface CloudCv {
  data: ResumeData;
  template: string;
  answers: GuidedState["answers"];
  prompts: GuidedState["prompts"];
  improved: GuidedState["improved"];
  updatedAt: number;
}

export async function pullCv(userId: string): Promise<CloudCv | null> {
  const { data, error } = await db().from("two_guided_cvs").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    data: data.data,
    template: data.template,
    answers: data.answers ?? {},
    prompts: data.prompts ?? {},
    improved: data.improved ?? [],
    updatedAt: Date.parse(data.updated_at),
  };
}

export async function pushCv(userId: string, s: GuidedState): Promise<void> {
  const { error } = await db()
    .from("two_guided_cvs")
    .upsert({
      user_id: userId,
      data: s.data,
      template: s.template,
      answers: s.answers,
      prompts: s.prompts,
      improved: s.improved,
      updated_at: new Date(s.updatedAt ?? Date.now()).toISOString(),
    });
  if (error) throw error;
}

// ---------- submissions and reviews ----------

interface SubmissionRow {
  id: string;
  attempt: number;
  snapshot: ResumeData;
  status: "reviewing" | "accepted" | "rejected" | "error";
  review: Review | null;
  submitted_at: string;
}

const fromRow = (r: SubmissionRow): Submission => ({
  id: r.id,
  attempt: r.attempt,
  snapshot: r.snapshot,
  submittedAt: Date.parse(r.submitted_at),
  review: r.status === "accepted" || r.status === "rejected" ? r.review ?? undefined : undefined,
});

const SUBMISSION_FIELDS = "id, attempt, snapshot, status, review, submitted_at";

export async function pullSubmissions(userId: string): Promise<Submission[]> {
  const { data, error } = await db()
    .from("two_guided_cv_submissions")
    .select(SUBMISSION_FIELDS)
    .eq("user_id", userId)
    .order("attempt", { ascending: true });
  if (error) throw error;
  return (data as SubmissionRow[]).map(fromRow);
}

export async function createSubmission(userId: string, attempt: number, snapshot: ResumeData): Promise<Submission> {
  if (usingMock()) return { id: newId("submission"), attempt, submittedAt: Date.now(), snapshot };
  const { data, error } = await db()
    .from("two_guided_cv_submissions")
    .insert({ user_id: userId, attempt, snapshot })
    .select(SUBMISSION_FIELDS)
    .single();
  if (error) throw error;
  return fromRow(data as SubmissionRow);
}

/** Asks the server to review a submission. Safe to call again: a reviewed submission is left alone. */
export async function requestReview(submission: Submission): Promise<void> {
  if (usingMock()) return;
  const { error } = await db().functions.invoke("curie-review", { body: { submission_id: submission.id } });
  if (error) throw error;
}

const MOCK_REVIEW_DELAY_MS = 6000;
const RETRY_AFTER_MS = 15000;
const lastRetry = new Map<string, number>();

/** The review, once it's ready; null while Curie is still reviewing. */
export async function fetchReview(submission: Submission): Promise<Review | null> {
  if (usingMock()) {
    return Date.now() - submission.submittedAt < MOCK_REVIEW_DELAY_MS ? null : mockReview(submission.snapshot);
  }
  const { data, error } = await db().from("two_guided_cv_submissions").select(SUBMISSION_FIELDS).eq("id", submission.id).single();
  if (error) throw error;
  const row = data as SubmissionRow;
  const lastAsked = lastRetry.get(submission.id) ?? submission.submittedAt;
  if (row.status === "reviewing" && Date.now() - lastAsked > RETRY_AFTER_MS) {
    // The first request may have been lost (closed tab, bad network); ask again, at most every 15 seconds.
    lastRetry.set(submission.id, Date.now());
    requestReview(submission).catch(() => {});
  }
  return fromRow(row).review ?? null;
}
