import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ResumePreview } from "@/components/ResumePreview";
import { ResumeForm } from "@/components/ResumeForm";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { ScaledPreview } from "@/components/ScaledPreview";
import { useToast } from "@/hooks/use-toast";
import { generatePDF, generateWord } from "@/utils/pdfGenerator";
import { storeResumeData } from "@/utils/resumeStorage";
import { applyTitleCaseName, type ResumeData } from "@/utils/resumeRules";
import { TEMPLATE_IDS, TEMPLATE_NAMES, templateSupportsPhoto, type TemplateId } from "@/utils/templates";
import { stepPath, useGuided } from "./GuidedContext";
import {
  MAX_ATTEMPTS,
  SECTIONS,
  attemptsLeft,
  clearState,
  initialState,
  isAccepted,
  isAcceptedAndUnchanged,
  isUnderReview,
  latestSubmission,
  sectionDef,
  type GuidedState,
  type SectionId,
  type Submission,
} from "./state";
import { addItem, buildSteps, firstStepOfItem, firstStepOfSection, isListSection, items, optInKey, sectionIncluded, setAnswer } from "./steps";
import { allSectionsPass, firstFailingSection, sectionIssues } from "./checks";
import { createSubmission, fetchReview, requestReview, signInWithGoogle, usingMock } from "./backend";
import { Actions, BigButton, CurieAvatar, Hint, LinkButton, Question, Screen, Spacer, Stars } from "./ui";

// ---------- sign-in ----------

/** Google sign-in with a busy state and a friendly error. In mock mode the user comes back straight away. */
function useGoogleSignIn() {
  const { update } = useGuided();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = async (returnTo: string, onSignedIn: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const user = await signInWithGoogle(returnTo);
      if (user) {
        update((s) => ({ ...s, user }));
        onSignedIn();
      }
      // Otherwise the browser is on its way to Google and comes back to `returnTo`.
    } catch (e) {
      console.error("Google sign-in failed:", e);
      setError("Google sign-in isn't working right now. Please try again in a little while.");
      setBusy(false);
    }
  };
  return { busy, error, start };
}

// ---------- welcome ----------

const hasStarted = (s: GuidedState) => Boolean(s.lastStep) || s.submissions.length > 0;

export function Welcome() {
  const { state, update, goStep, signOut } = useGuided();
  const navigate = useNavigate();
  const steps = buildSteps(state);
  const google = useGoogleSignIn();
  const signInAndStart = () => google.start(stepPath(steps[0].key), () => goStep(steps[0].key));

  if (!hasStarted(state)) {
    return (
      <Screen back={false}>
        <Brand />
        <div className="mt-10">
          <CurieAvatar size={56} />
        </div>
        <Question>
          <span className="text-[26px]">Build your CV, one small step at a time</span>
        </Question>
        <Hint className="text-[15px]">
          9 short sections. When you're done, Curie will review your CV and tell you how to make it better.
        </Hint>
        <ul className="mt-6 space-y-2 text-[15px]">
          {["Takes about 20 minutes", "Your answers are saved on this phone", "Works even if you have no work experience"].map((t) => (
            <li key={t} className="flex items-center gap-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] text-white">✓</span>
              {t}
            </li>
          ))}
        </ul>
        <Actions>
          <BigButton tone="green" onClick={() => goStep(steps[0].key)}>
            Let's start
          </BigButton>
          {state.user ? (
            <p className="mt-3 text-center text-sm text-slate-600">
              Signed in as {state.user.email}. Your CV is saved to your account.{" "}
              <button type="button" className="min-h-8 text-primary underline" onClick={signOut}>
                Sign out
              </button>
            </p>
          ) : (
            <>
              <BigButton tone="outline" className="mt-2.5" busy={google.busy} onClick={signInAndStart}>
                <GoogleMark /> Sign in with Google to save your CV
              </BigButton>
              {google.error && <p className="mt-2 text-center text-sm text-[#854F0B]">{google.error}</p>}
              <p className="mt-2 text-center text-xs text-slate-500">
                Optional. Sign in to continue on any phone or computer. You'll need to sign in when you submit your CV to Curie.
              </p>
            </>
          )}
        </Actions>
      </Screen>
    );
  }

  const latest = latestSubmission(state);
  const done = SECTIONS.filter((d) => buildSteps(state).some((st) => st.key === `${d.id}.check`) && sectionIssues(state, d.id).length === 0);
  const resume = state.lastStep && steps.some((s) => s.key === state.lastStep) ? state.lastStep : steps[0].key;

  return (
    <Screen back={false}>
      <Brand />
      <div className="mt-8">
        <CurieAvatar size={56} />
      </div>
      <Question>
        <span className="text-[24px]">Welcome back{state.user?.name ? `, ${state.user.name.split(" ")[0]}` : ""}!</span>
      </Question>
      {latest && !latest.review && <Hint className="text-[15px]">Curie is reviewing your CV.</Hint>}
      {latest?.review && (
        <Hint className="text-[15px]">
          {latest.review.verdict === "accepted" ? "Your CV was accepted." : `Your review for attempt ${latest.attempt} is ready.`}
        </Hint>
      )}
      {!latest && (
        <>
          <Hint className="text-[15px]">
            You've finished {done.length} of {SECTIONS.length} sections.
          </Hint>
          <div className="mt-4 space-y-2">
            {done.map((d) => (
              <div key={d.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-[15px]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] text-white">✓</span>
                {d.label}
              </div>
            ))}
          </div>
        </>
      )}
      <Actions>
        {latest ? (
          <BigButton tone="green" onClick={() => navigate(isAccepted(state) ? "/cv" : "/review")}>
            {latest.review ? (isAccepted(state) ? "Go to my CV" : "See Curie's review") : "Check the status"}
          </BigButton>
        ) : (
          <BigButton tone="green" onClick={() => goStep(resume)}>
            Continue where I left off
          </BigButton>
        )}
        <LinkButton onClick={() => navigate("/cv")}>See my CV so far</LinkButton>
        <LinkButton
          className="text-slate-500"
          onClick={() => {
            if (window.confirm("Start a new CV? Your current answers on this phone will be cleared.")) {
              clearState();
              update(initialState());
              navigate("/");
            }
          }}
        >
          Start a new CV
        </LinkButton>
      </Actions>
    </Screen>
  );
}

const Loading = () => (
  <Screen back={false}>
    <div className="m-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-secondary" aria-label="Loading" />
  </Screen>
);

const Brand = () => (
  <div className="flex items-center gap-2 pt-2 md:hidden">
    <img src="/Logo2.jpg" alt="" className="h-8 w-auto rounded" />
    <span className="font-medium">VigyanShaala CV Builder</span>
  </div>
);

// ---------- your CV ----------

export function CvPreview({ data, template, id }: { data: ResumeData; template: string; id?: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <ScaledPreview>
        <div id={id}>
          <ResumePreview resumeData={data} template={template} />
        </div>
      </ScaledPreview>
    </div>
  );
}

export function YourCv() {
  const { state, goStep } = useGuided();
  const navigate = useNavigate();
  const latest = latestSubmission(state);
  const reviewing = isUnderReview(state);
  const acceptedNow = isAcceptedAndUnchanged(state);
  const editedAfterAccept = isAccepted(state) && !acceptedNow;
  const failing = firstFailingSection(state);
  const rejected = latest?.review?.verdict === "rejected";

  return (
    <Screen title="Your CV" back={false} wide>
      {reviewing && <Banner tone="info">Curie is reviewing your CV. You can't edit it until the review is ready.</Banner>}
      {acceptedNow && <Banner tone="good">Accepted by Curie. You can choose a look and download it.</Banner>}
      {editedAfterAccept && <Banner tone="warn">You changed your CV after it was accepted. Submit it again to download.</Banner>}
      {rejected && !reviewing && <Banner tone="warn">Curie asked for another attempt. Improve the sections in your review, then submit again.</Banner>}

      <div className="mt-3">
        <CvPreview data={state.data} template={state.template} />
      </div>

      {/* Secondary actions stay in the page; only the main action sticks to the bottom. */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-6">
        {!reviewing && <LinkButton className="w-auto" onClick={() => navigate("/look")}>Change the look</LinkButton>}
        {rejected && !reviewing && <LinkButton className="w-auto" onClick={() => navigate("/review")}>See Curie's review</LinkButton>}
        {!reviewing && <LinkButton className="w-auto" onClick={() => navigate("/edit")}>Edit everything</LinkButton>}
      </div>

      <Actions>
        {reviewing ? (
          <BigButton onClick={() => navigate("/review")}>Check the review status</BigButton>
        ) : acceptedNow ? (
          <BigButton tone="green" onClick={() => navigate("/download")}>
            Download my CV
          </BigButton>
        ) : failing ? (
          <>
            <BigButton onClick={() => goStep(firstStepOfSection(state, failing.id))}>Finish {failing.label}</BigButton>
            <Hint className="text-center">Finish every section to submit your CV to Curie.</Hint>
          </>
        ) : (
          <BigButton tone="green" onClick={() => navigate("/submit")} disabled={attemptsLeft(state) <= 0}>
            {rejected || editedAfterAccept ? "Submit again" : "Submit to Curie for review"}
          </BigButton>
        )}
      </Actions>
    </Screen>
  );
}

function Banner({ tone, children }: { tone: "info" | "good" | "warn"; children: React.ReactNode }) {
  const cls = { info: "bg-[#eef3f8] text-primary", good: "bg-[#eaf5e4] text-[#1f3d12]", warn: "bg-[#fdf3e1] text-[#633806]" }[tone];
  return <div className={`mt-2 rounded-xl px-3.5 py-3 text-sm ${cls}`}>{children}</div>;
}

// ---------- edit everything ----------

export function EditEverything() {
  const { state } = useGuided();
  const navigate = useNavigate();
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  return (
    <Screen title="Edit everything">
      <Hint>Every part of your CV. Tap a section to change, add, or delete anything.</Hint>
      <div className="mt-4 space-y-2">
        {SECTIONS.map((d) => {
          const included = sectionIncluded(state, d.id);
          const n = isListSection(d.id) ? items(state, d.id).length : d.id === "skills" ? state.data.skills.length : null;
          const issues = sectionIssues(state, d.id).length;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => navigate(`/edit/${d.id}`)}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-slate-200 px-3.5 text-left text-[15px]"
            >
              <span className="flex-1">{d.label}</span>
              <span className={`text-xs ${issues ? "text-[#854F0B]" : "text-slate-500"}`}>
                {issues ? "Needs something" : !included ? "Not added" : n !== null ? `${n}` : "Done"}
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          );
        })}
      </div>
      <Actions>
        <BigButton onClick={() => navigate("/cv")}>Back to my CV</BigButton>
      </Actions>
    </Screen>
  );
}

/** Full form for one section, reusing the classic builder's form. Used by Edit everything and Improve. */
function SectionEditor({ section }: { section: SectionId }) {
  const { state, update, goStep } = useGuided();
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
            goStep(isListSection(section) ? firstStepOfItem(s, section, 0) : firstStepOfSection(s, section));
          }}
        >
          Add {sectionDef(section).label}
        </BigButton>
      </div>
    );
  }
  return (
    <div className="guided-section-editor -mx-1 mt-3">
      <ResumeForm
        resumeData={state.data}
        setResumeData={(change) => update((s) => ({ ...s, data: change(s.data) }))}
        activeSection={section}
        selectedTemplate={state.template}
        plainEditors
      />
    </div>
  );
}

const sectionParam = (raw?: string): SectionId | null => (SECTIONS.some((d) => d.id === raw) ? (raw as SectionId) : null);

export function EditSection() {
  const { section: raw } = useParams();
  const section = sectionParam(raw);
  const { state, goStep } = useGuided();
  const navigate = useNavigate();
  if (!section) return <Navigate to="/edit" replace />;
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  const issues = sectionIssues(state, section);
  return (
    <Screen title={sectionDef(section).label} wide>
      {issues.map((i) => (
        <Banner key={i.message} tone="warn">
          {i.message}
        </Banner>
      ))}
      <SectionEditor section={section} />
      <Actions>
        <BigButton className="mt-4" onClick={() => navigate("/edit")}>
          Done
        </BigButton>
        {sectionIncluded(state, section) && (
          <LinkButton onClick={() => goStep(firstStepOfSection(state, section))}>Answer the questions again instead</LinkButton>
        )}
      </Actions>
    </Screen>
  );
}

// ---------- sign in ----------

export function SignIn() {
  const { state, authReady } = useGuided();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const google = useGoogleSignIn();
  const next = params.get("next") ?? "/cv";
  if (state.user) return <Navigate to={next} replace />;
  if (!authReady) return <Loading />;
  return (
    <Screen>
      <Question>Sign in to submit your CV</Question>
      <Hint className="text-[15px]">
        Curie's review is saved to your account, so you can see it on any phone or computer. Your CV so far comes with you.
      </Hint>
      <Actions>
        <BigButton
          tone="outline"
          busy={google.busy}
          onClick={() => google.start(next, () => navigate(next, { replace: true }))}
        >
          <GoogleMark /> Continue with Google
        </BigButton>
        {google.error && <p className="mt-2 text-center text-sm text-[#854F0B]">{google.error}</p>}
        {usingMock() && <p className="mt-3 text-center text-xs text-slate-400">Test mode: sign-in is simulated.</p>}
      </Actions>
    </Screen>
  );
}

const GoogleMark = () => (
  <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-[11px] font-medium text-[#4285F4]">
    G
  </span>
);

// ---------- submit ----------

export function Submit() {
  const { state, update, authReady } = useGuided();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  if (!authReady) return <Loading />;
  if (isUnderReview(state)) return <Navigate to="/review" replace />;
  if (!allSectionsPass(state)) return <Navigate to="/cv" replace />;
  if (!state.user) return <Navigate to="/signin?next=/submit" replace />;
  const userId = state.user.id;
  const attempt = state.submissions.length + 1;
  const left = attemptsLeft(state);

  if (left <= 0) {
    return (
      <Screen>
        <Question>You've used all {MAX_ATTEMPTS} attempts</Question>
        <Hint className="text-[15px]">Please talk to your VigyanShaala mentor about your CV.</Hint>
        <Actions>
          <BigButton onClick={() => navigate("/cv")}>Back to my CV</BigButton>
        </Actions>
      </Screen>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      const submission = await createSubmission(userId, attempt, applyTitleCaseName(state.data));
      update((s) => ({ ...s, data: submission.snapshot, submissions: [...s.submissions, submission], improved: [] }));
      // If this request is lost, the review screen asks again.
      requestReview(submission).catch((e) => console.error("Review request failed:", e));
      navigate("/review", { replace: true });
    } catch (e) {
      console.error("Submit failed:", e);
      toast({ title: "Your CV wasn't submitted", description: "Check your internet connection and try again.", variant: "destructive" });
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Question>Ready to submit?</Question>
      <div className="mt-3 flex items-center gap-3 text-[15px]">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-[11px] text-white">✓</span>
        All {SECTIONS.length} sections checked
      </div>
      <div className="mt-5 flex items-center gap-3">
        <CurieAvatar />
        <span className="font-medium">What happens next</span>
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 p-4 text-[15px]">
        Curie will read your whole CV and give you:
        <ul className="mt-2 space-y-1.5">
          <li>★ A star rating</li>
          <li>💬 Feedback on each section</li>
          <li>✓ Accepted, or one more try</li>
        </ul>
      </div>
      <Hint>
        This is attempt {attempt} of {MAX_ATTEMPTS}. You can't edit your CV while Curie reviews it.
      </Hint>
      {left <= 3 && <Hint className="text-[#854F0B]">You have {left} attempts left, including this one.</Hint>}
      <Actions>
        <BigButton tone="green" busy={busy} onClick={submit}>
          Submit to Curie
        </BigButton>
        <LinkButton onClick={() => navigate("/cv")}>Not yet, keep editing</LinkButton>
      </Actions>
    </Screen>
  );
}

// ---------- review ----------

function usePollReview() {
  const { state, update } = useGuided();
  const latest = latestSubmission(state);
  const pending = latest && !latest.review ? latest : null;
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    const tick = async () => {
      const review = await fetchReview(pending);
      if (cancelled || !review) return;
      update((s) => ({ ...s, submissions: s.submissions.map((x) => (x.id === pending.id ? { ...x, review } : x)) }));
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [pending, update]);
}

export function ReviewScreen() {
  usePollReview();
  const { state } = useGuided();
  const navigate = useNavigate();
  const latest = latestSubmission(state);
  if (!latest) return <Navigate to="/cv" replace />;

  if (!latest.review) {
    const mins = Math.max(0, Math.round((Date.now() - latest.submittedAt) / 60000));
    return (
      <Screen back={false}>
        <Spacer />
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-secondary" aria-hidden />
        <Question>
          <span className="block text-center">Curie is reviewing your CV</span>
        </Question>
        <Hint className="text-center">
          Attempt {latest.attempt} of {MAX_ATTEMPTS} · submitted {mins === 0 ? "just now" : `${mins} min ago`}
        </Hint>
        <div className="mt-6 rounded-xl border border-slate-200 p-4 text-center text-[15px]">
          You can close this page. Your review will be here when you come back.
        </div>
        <Actions>
          <BigButton tone="outline" onClick={() => navigate("/cv")}>
            View my CV
          </BigButton>
        </Actions>
      </Screen>
    );
  }

  const r = latest.review;
  if (r.verdict === "accepted") {
    return (
      <Screen back={false}>
        <Spacer />
        <div className="text-center text-5xl" aria-hidden>
          🎉
        </div>
        <Question>
          <span className="block text-center text-[26px]">Accepted!</span>
        </Question>
        <div className="mt-3 rounded-2xl bg-[#eaf5e4] p-4 text-center text-[#1f3d12]">
          <Stars value={r.stars} />
          <p className="text-sm">
            {r.stars} out of 5 · Attempt {latest.attempt}
          </p>
        </div>
        <p className="mt-3 rounded-xl border border-slate-200 p-4 text-[15px]">{r.overall}</p>
        <SectionFeedbackList submission={latest} />
        <LinkButton className="mt-3" onClick={() => navigate("/look")}>
          Choose a look
        </LinkButton>
        <Actions>
          <BigButton tone="green" onClick={() => navigate("/download")}>
            Download my CV
          </BigButton>
        </Actions>
      </Screen>
    );
  }

  const needs = r.sections.filter((s) => s.status === "needs_work");
  const allImproved = needs.every((n) => state.improved.includes(n.id));
  const left = attemptsLeft(state);
  return (
    <Screen title="Curie's review" back={false}>
      <div className="mt-2 rounded-2xl bg-[#fdf3e1] p-4 text-center text-[#633806]">
        <p className="text-base font-medium">Needs another attempt</p>
        <Stars value={r.stars} />
        <p className="text-sm">
          {r.stars} out of 5 · Attempt {latest.attempt} of {MAX_ATTEMPTS}
        </p>
      </div>
      <div className="mt-3 rounded-xl border border-slate-200 p-4 text-[15px]">
        <p className="font-medium">Overall</p>
        <p className="mt-1">{r.overall}</p>
      </div>
      <SectionFeedbackList submission={latest} />
      <AttemptHistory />
      <Actions>
        <div>
          {left > 0 ? (
            <>
              {!allImproved && <Hint className="mb-2 text-center">Improve the sections above, then submit again.</Hint>}
              <BigButton tone="green" onClick={() => navigate("/submit")}>
                Submit again
              </BigButton>
            </>
          ) : (
            <Hint className="text-center">You've used all {MAX_ATTEMPTS} attempts. Please talk to your VigyanShaala mentor.</Hint>
          )}
          <LinkButton onClick={() => navigate("/cv")}>See my CV</LinkButton>
        </div>
      </Actions>
    </Screen>
  );
}

function SectionFeedbackList({ submission }: { submission: Submission }) {
  const { state } = useGuided();
  const navigate = useNavigate();
  const r = submission.review!;
  const ordered = [...r.sections].sort((a, b) => (a.status === b.status ? 0 : a.status === "needs_work" ? -1 : 1));
  const accepted = r.verdict === "accepted";
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-slate-600">Section feedback</p>
      {ordered.map((f) => {
        const improved = state.improved.includes(f.id);
        return (
          <div key={f.id} className="mt-2.5 rounded-xl border border-slate-200 p-3.5 text-[15px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{sectionDef(f.id).label}</span>
              {f.status === "good" ? (
                <span className="rounded-md bg-[#eaf5e4] px-2 py-0.5 text-xs font-medium text-[#27500A]">Good</span>
              ) : improved ? (
                <span className="rounded-md bg-[#eaf5e4] px-2 py-0.5 text-xs font-medium text-[#27500A]">✓ Improved</span>
              ) : (
                <span className="rounded-md bg-[#fdf3e1] px-2 py-0.5 text-xs font-medium text-[#854F0B]">Needs work</span>
              )}
            </div>
            <p className="mt-1 text-slate-700">{f.comment}</p>
            {!accepted && f.status === "needs_work" && (
              <button
                type="button"
                onClick={() => navigate(`/improve/${f.id}`)}
                className="mt-2 min-h-10 rounded-lg border-[1.5px] border-primary px-3 text-sm font-medium text-primary"
              >
                {improved ? "Change it again" : "Improve this section"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AttemptHistory() {
  const { state } = useGuided();
  if (state.submissions.length < 2) return null;
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-slate-600">Your attempts</p>
      {state.submissions.map((s) => (
        <div key={s.id} className="flex justify-between border-b border-slate-200 py-2.5 text-sm">
          <span>Attempt {s.attempt}</span>
          <span className="text-slate-600">
            {s.review ? `${"★".repeat(s.review.stars)} · ${s.review.verdict === "accepted" ? "Accepted" : "Needs another attempt"}` : "Reviewing"}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Improve() {
  const { section: raw } = useParams();
  const section = sectionParam(raw);
  const { state, update } = useGuided();
  const navigate = useNavigate();
  const latest = latestSubmission(state);
  const feedback = latest?.review?.sections.find((s) => s.id === section);
  if (!section || !feedback) return <Navigate to="/review" replace />;
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  const issues = sectionIssues(state, section);
  return (
    <Screen title={`Improve ${sectionDef(section).label}`} wide>
      <div className="sticky top-0 z-10 -mx-5 bg-white px-5 pb-2 pt-1">
        <div className="rounded-xl bg-[#fdf3e1] p-3.5 text-[15px] text-[#633806]">
          <span className="font-medium">Curie said: </span>
          {feedback.comment}
        </div>
      </div>
      {issues.map((i) => (
        <Banner key={i.message} tone="warn">
          {i.message}
        </Banner>
      ))}
      <SectionEditor section={section} />
      <Actions>
        <BigButton
          className="mt-4"
          disabled={issues.length > 0}
          onClick={() => {
            update((s) => ({ ...s, improved: Array.from(new Set([...s.improved, section])) }));
            navigate("/review");
          }}
        >
          Done, back to my review
        </BigButton>
      </Actions>
    </Screen>
  );
}

// ---------- look, photo, download ----------

export function LookPicker() {
  const { state, update } = useGuided();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const noPhoto = params.get("nophoto") === "1";
  const looks = TEMPLATE_IDS.filter((t) => !noPhoto || !templateSupportsPhoto(t));
  const [i, setI] = useState(() => Math.max(0, looks.indexOf(state.template as TemplateId)));
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  const id = looks[i];

  const use = () => {
    update((s) => ({ ...s, template: id }));
    if (templateSupportsPhoto(id) && !state.data.personalInfo.photo) navigate("/photo");
    else navigate(isAcceptedAndUnchanged(state) ? "/download" : "/cv");
  };

  return (
    <Screen title="Choose a look" label="Last step" wide>
      <Hint>
        {i + 1} of {looks.length}. Your real CV, in each look.
      </Hint>
      <div className="mt-3 flex items-center gap-1">
        <button type="button" aria-label="Previous look" onClick={() => setI((i - 1 + looks.length) % looks.length)} className="-ml-2 flex h-11 w-9 items-center justify-center text-primary">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="min-w-0 flex-1">
          <CvPreview data={state.data} template={id} />
        </div>
        <button type="button" aria-label="Next look" onClick={() => setI((i + 1) % looks.length)} className="-mr-2 flex h-11 w-9 items-center justify-center text-primary">
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <p className="mt-3 text-center font-medium">
        {TEMPLATE_NAMES[id]}
        {templateSupportsPhoto(id) && <span className="text-sm font-normal text-slate-500"> · has a photo</span>}
      </p>
      <Actions>
        <BigButton tone="green" className="mt-4" onClick={use}>
          Use this look
        </BigButton>
      </Actions>
    </Screen>
  );
}

export function PhotoStep() {
  const { state, update } = useGuided();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;

  return (
    <Screen>
      <Question>This look has a photo. Add one?</Question>
      <Hint>A clear photo of your face, with a plain background.</Hint>
      <div className="mx-auto mt-6 flex h-36 w-32 items-center justify-center rounded-xl border-[1.5px] border-dashed border-slate-300 text-sm text-slate-400">
        Your photo
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => setSrc(String(reader.result));
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />
      <Actions>
        <BigButton onClick={() => fileRef.current?.click()}>Add a photo</BigButton>
        <LinkButton onClick={() => navigate("/look?nophoto=1")}>No photo, show me looks without one</LinkButton>
        <PhotoCropDialog
          imageSrc={src}
          open={src !== null}
          onOpenChange={(open) => !open && setSrc(null)}
          onConfirm={(dataUrl) => {
            // The photo only changes the look, not the content Curie reviewed, so an accepted CV stays accepted.
            const accepted = isAcceptedAndUnchanged(state);
            update((s) => {
              const data = { ...s.data, personalInfo: { ...s.data.personalInfo, photo: dataUrl } };
              if (!accepted) return { ...s, data };
              const subs = s.submissions.map((x, k) =>
                k === s.submissions.length - 1 ? { ...x, snapshot: { ...x.snapshot, personalInfo: { ...x.snapshot.personalInfo, photo: dataUrl } } } : x,
              );
              return { ...s, data, submissions: subs };
            });
            setSrc(null);
            navigate(accepted ? "/download" : "/cv");
          }}
        />
      </Actions>
    </Screen>
  );
}

export function Download() {
  const { state } = useGuided();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"pdf" | "word" | null>(null);
  if (!isAcceptedAndUnchanged(state)) return <Navigate to="/cv" replace />;
  const name = state.data.personalInfo.fullName.replace(/\s+/g, "_") || "My";

  const pdf = async () => {
    setBusy("pdf");
    try {
      const { error } = await storeResumeData(state.data, state.template);
      if (error) console.error("Failed to store resume data:", error);
      await generatePDF("resume-preview", `${name}_Resume.pdf`);
    } catch {
      toast({ title: "Download didn't work", description: "Check your internet connection and try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const word = async () => {
    setBusy("word");
    try {
      await generateWord(state.data, state.template, `${name}_Resume.docx`);
    } catch {
      toast({ title: "Download didn't work", description: "Check your internet connection and try again.", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen wide>
      <div className="text-center">
        <div className="text-4xl" aria-hidden>
          🎉
        </div>
        <Question>
          <span className="block text-center">Your CV is ready to send</span>
        </Question>
      </div>
      <div className="mt-4">
        <CvPreview data={state.data} template={state.template} id="resume-preview" />
      </div>
      <Actions>
        <div className="space-y-2">
          <BigButton tone="green" busy={busy === "pdf"} disabled={busy !== null} onClick={pdf}>
            Download my CV
          </BigButton>
          <p className="text-center text-xs text-slate-500">
            PDF file. Need Word?{" "}
            <button type="button" className="min-h-8 text-primary underline" disabled={busy !== null} onClick={word}>
              {busy === "word" ? "Preparing…" : "Get Word file"}
            </button>
          </p>
        </div>
      </Actions>
    </Screen>
  );
}
