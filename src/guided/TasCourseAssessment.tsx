import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ResumePreview } from "@/components/ResumePreview";
import { applyTitleCaseName, type ResumeData } from "@/utils/resumeRules";
import { renderPDF } from "@/utils/pdfGenerator";
import { useGuided } from "./GuidedContext";
import { clearState, initialState } from "./state";
import { allSectionsPass } from "./checks";
import { Actions, BigButton, Hint, Question, Screen } from "./ui";
import { clearTasReviewSession, encodePDF, readTasReviewSession, tasRequest, TAS_REVIEW_SESSION_KEY } from "./tasAssessment";

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

export function TasCourseAssessment() {
  const { state, update } = useGuided();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState(readTasReviewSession);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
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
        setError(message(err));
      }
      timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [token, review?.status, review?.verdict]);

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

  async function submit() {
    if (!account || busy) return;
    setBusy(true);
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
      try { sessionStorage.setItem(TAS_REVIEW_SESSION_KEY, receipt.status_token); } catch { /* storage unavailable */ }
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    const retry = review?.status === "failed" || review?.verdict === "rejected";
    const heading = review?.verdict === "accepted" ? "Accepted" : review?.verdict === "rejected" ? "Reattempt requested"
      : review?.status === "failed" ? "Review unavailable" : review?.awaiting_instructor_approval
        ? "Awaiting instructor approval" : "Review in progress";
    return (
      <Screen back={false}>
        <Question>{heading}</Question>
        {error && <p role="alert">{error}</p>}
        {review?.status === "failed" && <Hint>Your resume was saved. You can try the review again.</Hint>}
        {review?.verdict && (
          <>
            {review.star_rating != null && <p>{review.star_rating} out of 5 stars</p>}
            <p className="my-4 whitespace-pre-wrap">{review.overall_feedback}</p>
            {review.field_feedback?.map((row) => (
              <section className="my-3" key={row.field_id}>
                <h2 className="font-semibold">{headings[row.field_id] ?? row.field_id}</h2>
                <p className="whitespace-pre-wrap">{row.comment}</p>
              </section>
            ))}
          </>
        )}
        <Actions>
          {retry && <BigButton onClick={() => { clearReview(); navigate("/cv"); }}>Back to my CV</BigButton>}
          <BigButton tone="outline" onClick={() => { clearReview(); clearState(); update(initialState()); navigate("/"); }}>
            Finish and clear this device
          </BigButton>
        </Actions>
      </Screen>
    );
  }

  if (!allSectionsPass(state)) {
    return <Screen><Question>Finish your CV first</Question><Link to="/cv">Back to my CV</Link></Screen>;
  }

  return (
    <Screen>
      <Question>{account ? "Confirm your account" : "Submit your CV for assessment"}</Question>
      <div className="hidden" aria-hidden="true">
        <div id="tas-submitted-resume"><ResumePreview resumeData={previewData} template={state.template} /></div>
      </div>
      {account ? (
        <>
          <Hint>Submit as {account.name}?</Hint>
          <Actions>
            <BigButton tone="green" busy={busy} onClick={submit}>Confirm and submit</BigButton>
            <BigButton tone="outline" disabled={busy} onClick={() => { setAccount(null); submission.current = undefined; setError(""); }}>Use a different email</BigButton>
          </Actions>
        </>
      ) : (
        <form onSubmit={lookup} className="mt-4">
          <label className="block mb-2" htmlFor="tas-email">Registered VigyanShaala email</label>
          <input className="w-full rounded-md border p-3" id="tas-email" type="email" autoComplete="off"
            value={email} onChange={(event) => setEmail(event.target.value)} required />
          <button className="mt-4 rounded-md bg-secondary px-4 py-3 text-white" disabled={busy} type="submit">
            {busy ? "Looking up…" : "Find my account"}
          </button>
        </form>
      )}
      {error && <p className="mt-3" role="alert">{error}</p>}
    </Screen>
  );
}
