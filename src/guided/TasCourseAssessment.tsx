import { Loader2, Mail, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ResumePreview } from "@/components/ResumePreview";
import { applyTitleCaseName, type ResumeData } from "@/utils/resumeRules";
import { renderPDF } from "@/utils/pdfGenerator";
import { useGuided } from "./GuidedContext";
import { clearState, initialState } from "./state";
import { allSectionsPass } from "./checks";
import { Actions, BigButton, CurieAvatar, Hint, Question, Screen } from "./ui";
import { clearTasReviewSession, encodePDF, readTasReviewSession, saveTasReviewSession, tasRequest, TasRequestError } from "./tasAssessment";

type Account = { name: string; confirmation: string };
type Receipt = { status_token: string };
type Review = {
  status: "pending_evaluation" | "ready" | "failed";
  awaiting_instructor_approval?: boolean;
  verdict?: "accepted" | "rejected";
  overall_feedback?: string;
  field_feedback?: Array<{ field_id: string; comment: string }>;
  star_rating?: number;
};

const headings: Record<string, string> = {
  file_format_length_font: "File format, length and font",
  name: "Name",
  phone: "Phone number",
  email: "Professional email",
  location: "Location",
  linkedin: "LinkedIn",
  summary: "Profile summary",
  education: "Education",
  experience: "Experience",
  certificates_awards: "Certificates and awards",
  skills: "Skills",
  proofreading: "Language and proofreading",
  formatting: "Formatting and overall presentation",
};
const message = (error: unknown) => error instanceof Error ? error.message : "TAS is temporarily unavailable.";

export function TasCourseAssessment({ reviewOnly = false }: { reviewOnly?: boolean }) {
  const { state, update } = useGuided();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState(readTasReviewSession);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const submission = useRef<{ idempotency_key: string; resume: ResumeData; pdf_base64: string }>();
  const previewData = applyTitleCaseName(state.data);

  useEffect(() => {
    if (!token || review?.status === "failed" || (review?.status === "ready" && review.verdict)) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const next = await tasRequest<Review>("status", { status_token: token });
        if (!active) return;
        setReview(next);
        setError("");
        if (next.status === "failed" || (next.status === "ready" && next.verdict)) return;
      } catch (err) {
        if (!active) return;
        if (err instanceof TasRequestError && (err.status === 403 || err.status === 404)) {
          clearTasReviewSession();
          setToken(null);
          setReview(null);
          setError("Your review session expired. Enter your registered email to reopen it.");
          navigate("/review", { replace: true });
          return;
        }
        setError(message(err));
      }
      timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [navigate, token, review?.status, review?.verdict]);

  function clearReview() {
    clearTasReviewSession();
    submission.current = undefined;
    setToken(null);
    setReview(null);
    setAccount(null);
    setEmail("");
    setError("");
  }

  async function lookup(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setAccount(await tasRequest<Account>("lookup", { email }));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  async function recover() {
    if (!account || busy) return;
    setBusy(true);
    setProcessing(true);
    setError("");
    try {
      const receipt = await tasRequest<Receipt>("recover", { confirmation: account.confirmation, confirmed: true });
      saveTasReviewSession(receipt.status_token);
      setToken(receipt.status_token);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      setProcessing(false);
    }
  }

  async function submit() {
    if (!account || busy) return;
    setBusy(true);
    setProcessing(true);
    setError("");
    try {
      if (!submission.current) {
        const pdf = await renderPDF("tas-submitted-resume");
        const resume = { ...previewData, personalInfo: { ...previewData.personalInfo } };
        delete resume.personalInfo.photo;
        submission.current = { idempotency_key: crypto.randomUUID(), resume, pdf_base64: await encodePDF(pdf) };
      }
      const receipt = await tasRequest<Receipt>("submit", {
        ...submission.current, confirmation: account.confirmation, confirmed: true,
      });
      setToken(receipt.status_token);
      saveTasReviewSession(receipt.status_token);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      setProcessing(false);
    }
  }

  if (token) {
    const retry = review?.status === "failed" || review?.verdict === "rejected";
    const heading = review?.verdict === "accepted" ? "Accepted" : review?.verdict === "rejected" ? "Reattempt requested"
      : review?.status === "failed" ? "Review unavailable" : review?.awaiting_instructor_approval
        ? "Awaiting instructor approval" : "Review in progress";
    return (
      <Screen back={false} title="CV review" compact>
        <section className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-live="polite">
          <CurieAvatar size={44} />
          <Question>{heading}</Question>
          {review?.awaiting_instructor_approval ? (
            <Hint>Curie has completed its review. Your instructor is checking it before it is shared with you. This page will update automatically when your feedback is available.</Hint>
          ) : !review?.verdict && review?.status !== "failed" ? (
            <Hint>Curie is reviewing your submission. This page will update automatically.</Hint>
          ) : null}
          {review?.status === "failed" && <Hint>Your resume was saved. You can try the review again.</Hint>}
        </section>
        <p className="my-4 text-sm text-slate-600">To return later, choose <strong>Check my review</strong> on the homepage and enter your registered email.</p>
        {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
        {review?.verdict && (
          <div className="mb-5 min-w-0 space-y-3">
            {review.star_rating != null && <p className="font-semibold text-primary">{review.star_rating} out of 5 stars</p>}
            {review.overall_feedback && <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">{review.overall_feedback}</p>}
            {review.field_feedback?.map((row) => (
              <section className="rounded-xl border border-slate-200 p-3 sm:p-4" key={row.field_id}>
                <h2 className="font-semibold [overflow-wrap:anywhere]">{headings[row.field_id] ?? row.field_id}</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 [overflow-wrap:anywhere]">{row.comment}</p>
              </section>
            ))}
          </div>
        )}
        <Actions>
          <div className="grid grid-cols-1 gap-2 min-[480px]:grid-flow-col min-[480px]:auto-cols-fr">
            {retry && <BigButton onClick={() => { clearReview(); navigate("/cv"); }}>Back to my CV</BigButton>}
            <BigButton tone={retry ? "outline" : "primary"} onClick={() => { clearReview(); clearState(); update(initialState()); navigate("/"); }}>
              Finish
            </BigButton>
          </div>
        </Actions>
      </Screen>
    );
  }

  if (!reviewOnly && !allSectionsPass(state)) {
    return <Screen compact><Question>Finish your CV first</Question><Link className="mt-3 text-primary underline" to="/cv">Back to my CV</Link></Screen>;
  }

  return (
    <Screen compact back={!processing} home={!processing}>
      {!reviewOnly && (
        <div className="hidden" aria-hidden="true">
          <div id="tas-submitted-resume"><ResumePreview resumeData={previewData} template={state.template} /></div>
        </div>
      )}
      {processing ? (
        <div className="flex min-h-64 flex-col items-center justify-center px-4 py-10 text-center" role="status">
          <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-slate-100 text-primary">
            <Loader2 className="size-7 motion-safe:animate-spin" aria-hidden />
          </span>
          <Question>{reviewOnly ? "Opening your review" : "Submitting your CV"}</Question>
          <Hint>{reviewOnly ? "We’re checking your latest review status." : "We’re preparing your PDF and saving your CV."}</Hint>
        </div>
      ) : account ? (
        <>
          <Question>Confirm your account</Question>
          <Hint>{reviewOnly ? "We’ll open the latest review for this account." : "We’ll submit your CV under this account."}</Hint>
          <div className="my-5 flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary">
              <UserRound className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-xl font-semibold leading-tight text-slate-900 [overflow-wrap:anywhere]">{account.name}</p>
              <p className="mt-1 text-base text-slate-700 [overflow-wrap:anywhere]">{email.trim()}</p>
            </div>
          </div>
          <div className="grid gap-2">
            <BigButton tone="green" onClick={reviewOnly ? recover : submit}>
              {reviewOnly ? "Confirm and view review" : "Confirm and submit"}
            </BigButton>
            <BigButton tone="outline" onClick={() => { setAccount(null); submission.current = undefined; setError(""); }}>
              Use a different email
            </BigButton>
          </div>
        </>
      ) : (
        <>
          <Question>{reviewOnly ? "Check my review" : "Submit your CV for assessment"}</Question>
          <Hint>Enter the email you used to register with VigyanShaala.</Hint>
          <form onSubmit={lookup} className="mt-5">
            <label className="mb-2 block text-sm font-semibold" htmlFor="tas-registered-email">Registered VigyanShaala email</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-4 size-5 text-slate-500" aria-hidden />
              <input id="tas-registered-email" className="min-h-[52px] w-full rounded-xl border border-slate-300 py-3 pl-11 pr-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                type="email" inputMode="email" autoComplete="off" autoCapitalize="none" spellCheck={false}
                value={email} onChange={(event) => setEmail(event.target.value)} readOnly={busy} required />
            </div>
            <BigButton type="submit" tone="green" className="mt-4" busy={busy}>
              {busy ? "Looking up…" : "Find my account"}
            </BigButton>
          </form>
        </>
      )}
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
    </Screen>
  );
}
