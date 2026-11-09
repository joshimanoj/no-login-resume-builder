import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileDown, LayoutTemplate, MessageSquareText, PenLine, Sparkles, type LucideIcon } from "lucide-react";
import { ResumePreview } from "@/components/ResumePreview";
import { PhotoCropDialog } from "@/components/PhotoCropDialog";
import { ScaledPreview } from "@/components/ScaledPreview";
import { useToast } from "@/hooks/use-toast";
import { generatePDF, generateWord } from "@/utils/pdfGenerator";
import { storeResumeData } from "@/utils/resumeStorage";
import { STORAGE_WAIT_MS, safeDownloadFilename, withTimeout, type ReadyDownload } from "@/utils/saveFile";
import { applyTitleCaseName, validateResumeData, type ResumeData } from "@/utils/resumeRules";
import { TEMPLATE_IDS, TEMPLATE_NAMES, templateSupportsPhoto, type TemplateId } from "@/utils/templates";
import { stepPath, useGuided } from "./GuidedContext";
import { EXAMPLE_CV } from "./demo";
import {
  MAX_ATTEMPTS,
  SECTIONS,
  attemptsLeft,
  changedSinceReview,
  clearState,
  hasEnteredAnything,
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
import { buildSteps, editStartStep, firstStepOfSection } from "./steps";
import { allSectionsPass, firstFailingSection, sectionIssues } from "./checks";
import { createSubmission, fetchReview, requestReview, signInWithGoogle, usingMock } from "./backend";
import { EditCvSheet, ResubmitBar, SectionsList, SectionsMenu } from "./sections";
import { SectionOverview } from "./overview";
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

const HOW_IT_WORKS = [
  { icon: MessageSquareText, title: "Answer simple questions", text: "9 short sections, one question at a time." },
  { icon: Sparkles, title: "Curie reviews your CV", text: "Get stars and tips for each section, then improve it." },
  { icon: FileDown, title: "Download a polished CV", text: "Pick a look and download it as PDF or Word." },
];

/** Desktop landing page: show the result straight away. */
function ExampleCvPanel() {
  const { state } = useGuided();
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-3 shrink-0 text-sm font-medium text-slate-600">What you'll make: an example CV</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <CvPreview data={EXAMPLE_CV} template={state.template} />
      </div>
    </div>
  );
}

/**
 * Something worth coming back to: she has entered something (on this phone, or saved to her account
 * and opened on another phone), or submitted. The demo CV alone opens on the landing page.
 */
const hasStarted = (s: GuidedState) => s.submissions.length > 0 || ((Boolean(s.lastStep) || Boolean(s.user)) && hasEnteredAnything(s.data));

export function Welcome() {
  const { state, update, goStep, signOut } = useGuided();
  const navigate = useNavigate();
  const steps = buildSteps(state);
  const google = useGoogleSignIn();
  const signInAndStart = () => google.start(stepPath(steps[0].key), () => goStep(steps[0].key));

  if (!hasStarted(state)) {
    return (
      <Screen back={false} aside={<ExampleCvPanel />}>
        <Brand />
        <Question>
          <span className="mt-8 block text-[26px] md:mt-4 md:text-[28px]">Build your CV, one small step at a time</span>
        </Question>
        <p className="mt-7 text-xs font-medium uppercase tracking-wide text-slate-500">How it works</p>
        <ol className="mt-3 space-y-4">
          {HOW_IT_WORKS.map(({ icon: Icon, title, text }, k) => (
            <li key={title} className="flex gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef3f8] text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block text-[15px] font-medium text-slate-900">
                  {k + 1}. {title}
                </span>
                <span className="block text-sm text-slate-500">{text}</span>
              </span>
            </li>
          ))}
        </ol>
        <Actions>
          <BigButton tone="green" onClick={() => goStep(steps[0].key)}>
            {state.user ? "Let's start" : "Let's start without signing in"}
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
  const stepKeys = new Set(steps.map((st) => st.key));
  const doneIds = new Set(SECTIONS.filter((d) => stepKeys.has(`${d.id}.check`) && sectionIssues(state, d.id).length === 0).map((d) => d.id));
  const resume = state.lastStep && steps.some((s) => s.key === state.lastStep) ? state.lastStep : steps[0].key;
  // Phones are often shared, so say whose CV this is and make "not me" easy.
  const owner = (state.user?.name || state.data.personalInfo.fullName).trim().split(/\s+/)[0];
  const notMe = async () => {
    const whose = owner ? `${owner}'s CV` : "This CV";
    const warning = state.user
      ? `${whose} is saved in ${owner || "their"} account. It will be removed from this phone.`
      : `${whose} will be removed from this phone. It hasn't been saved to an account.`;
    if (!window.confirm(`${warning} Start a new CV?`)) return;
    if (state.user) await signOut();
    else {
      clearState();
      update(initialState());
    }
    navigate("/", { replace: true });
  };

  return (
    <Screen back={false}>
      <Brand />
      <Question>
        <span className="mt-8 block text-[24px]">Welcome back{owner ? `, ${owner}` : ""}!</span>
      </Question>
      {latest && !latest.review && <Hint className="text-[15px]">Curie is reviewing your CV.</Hint>}
      {latest?.review && (
        <Hint className="text-[15px]">
          {latest.review.verdict === "accepted" ? "Your CV was accepted." : `Your review for attempt ${latest.attempt} is ready.`}
        </Hint>
      )}
      {!latest && (
        <Hint className="text-[15px]">
          You've finished {doneIds.size} of {SECTIONS.length} sections.
        </Hint>
      )}
      <AttemptHistory minimum={1} />
      <h2 className="mt-6 text-sm font-semibold text-slate-600">Your sections</h2>
      <div className="mt-1 rounded-xl border border-slate-200 bg-white p-1">
        <SectionsList />
      </div>
      {!state.user && (
        <p className="mt-5 rounded-xl bg-[#eef3f8] px-3.5 py-3 text-sm text-primary">
          Using a shared phone? Sign in with Google so your CV is saved to your account, not just this phone.
        </p>
      )}
      <Actions>
        {latest ? (
          <BigButton tone="green" onClick={() => navigate(isAccepted(state) ? "/cv" : "/review")}>
            {latest.review ? (isAccepted(state) ? "Go to my CV" : "See Curie's review") : "Check the status"}
          </BigButton>
        ) : (
          <BigButton tone="green" onClick={() => goStep(resume)}>
            {owner ? `Continue as ${owner}` : "Continue where I left off"}
          </BigButton>
        )}
        {!state.user && (
          <BigButton tone="outline" className="mt-2.5" busy={google.busy} onClick={() => google.start("/", () => navigate("/"))}>
            <GoogleMark /> Sign in with Google to save it
          </BigButton>
        )}
        {google.error && <p className="mt-2 text-center text-sm text-[#854F0B]">{google.error}</p>}
        <LinkButton onClick={notMe}>{owner ? `I'm not ${owner}: start a new CV` : "Start a new CV"}</LinkButton>
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
  <Link to="/" className="flex w-fit items-center gap-2 pt-2 md:hidden" aria-label="VigyanShaala CV Builder, home">
    <img src="/Logo2.jpg" alt="" className="h-8 w-auto rounded" />
    <span className="font-medium">VigyanShaala CV Builder</span>
  </Link>
);

// ---------- your CV ----------

/** The original builder's download rule: the required details are filled in. */
const canDownload = (data: ResumeData) => validateResumeData(applyTitleCaseName(data)).valid;

export function CvPreview({ data, template, id, zoom }: { data: ResumeData; template: string; id?: string; zoom?: number }) {
  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${zoom ? "w-fit" : ""}`}>
      <ScaledPreview zoom={zoom}>
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
  // Download follows the original builder's rules: the required details, nothing more. No sign-in or review needed.
  const downloadReady = canDownload(state.data);
  const [editing, setEditing] = useState(false);

  return (
    <Screen title="Your CV" back={false} wide>
      {reviewing && <Banner tone="info">Curie is reviewing your CV. You can't edit it until the review is ready.</Banner>}
      {acceptedNow && <Banner tone="good">Accepted by Curie.</Banner>}
      {editedAfterAccept && <Banner tone="info">You changed your CV after Curie accepted it. Submit it again if you'd like a new review.</Banner>}
      {rejected && !reviewing && <Banner tone="warn">Curie asked for another attempt. Improve the sections in your review, then submit again.</Banner>}

      {/* Things she may want to do before submitting, so they come first. */}
      {!reviewing && (
        <div className="mt-2 grid grid-cols-2 gap-2.5">
          <SecondaryButton icon={LayoutTemplate} onClick={() => navigate("/look")}>
            Change the look
          </SecondaryButton>
          <SecondaryButton icon={PenLine} onClick={() => setEditing(true)}>
            Edit my CV
          </SecondaryButton>
          <EditCvSheet open={editing} onOpenChange={setEditing} />
          {rejected && (
            <SecondaryButton icon={Sparkles} className="col-span-2" onClick={() => navigate("/review")}>
              See Curie's review
            </SecondaryButton>
          )}
        </div>
      )}

      <div className="mt-3">
        <CvPreview data={state.data} template={state.template} />
      </div>

      <Actions>
        <div className="space-y-1.5">
          {reviewing ? (
            <BigButton onClick={() => navigate("/review")}>Check the review status</BigButton>
          ) : acceptedNow ? null : failing ? (
            <BigButton onClick={() => goStep(firstStepOfSection(state, failing.id))}>Finish {failing.label}</BigButton>
          ) : (
            <BigButton tone="green" onClick={() => navigate("/submit")} disabled={attemptsLeft(state) <= 0}>
              {rejected || editedAfterAccept ? "Submit again" : "Submit to Curie for review"}
            </BigButton>
          )}
          {/* Submitting to Curie is the main action; download is a smaller option, unless she's already accepted. */}
          {downloadReady && acceptedNow ? (
            <BigButton tone="green" onClick={() => navigate("/download")}>
              <FileDown className="h-5 w-5" aria-hidden /> Download my CV
            </BigButton>
          ) : downloadReady ? (
            <button
              type="button"
              onClick={() => navigate("/download")}
              className="mx-auto flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-primary hover:bg-slate-50"
            >
              <FileDown className="h-4 w-4" aria-hidden /> Download my CV
            </button>
          ) : (
            <Hint className="text-center">Add the required details to download your CV.</Hint>
          )}
        </div>
      </Actions>
    </Screen>
  );
}

function SecondaryButton({
  icon: Icon,
  className = "",
  children,
  onClick,
}: {
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-sm font-medium text-primary active:bg-slate-50 ${className}`}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </button>
  );
}

function Banner({ tone, children }: { tone: "info" | "good" | "warn"; children: React.ReactNode }) {
  const cls = { info: "bg-[#eef3f8] text-primary", good: "bg-[#eaf5e4] text-[#1f3d12]", warn: "bg-[#fdf3e1] text-[#633806]" }[tone];
  return <div className={`mt-2 rounded-xl px-3.5 py-3 text-sm ${cls}`}>{children}</div>;
}

// ---------- edit everything ----------

/** /edit: editing her CV is the same journey through the questions, starting where Curie asked for changes. */
export function EditEverything() {
  const { state } = useGuided();
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  return <Navigate to={stepPath(editStartStep(state))} replace />;
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
  // Mid-way through the questions, "Done" goes back to where she was; with every section done, to her CV.
  const steps = buildSteps(state);
  const resume = firstFailingSection(state) ? (steps.find((st) => st.key === state.lastStep)?.key ?? steps[0].key) : null;
  const done = () => (resume ? goStep(resume) : navigate("/cv"));
  return (
    <Screen title="Review and edit" label={<SectionsMenu current={section} showAnswers={false} />} wide>
      <ResubmitBar />
      <Hint>Tap anything to change it.</Hint>
      {issues.map((i) => (
        <Banner key={i.message} tone="warn">
          {i.message}
        </Banner>
      ))}
      <SectionOverview section={section} />
      <Actions>
        <BigButton className="mt-4" onClick={done}>
          {resume ? "Done, continue where I left off" : "Done, see my CV"}
        </BigButton>
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
  // She picks the section to change (Curie's flagged ones first).
  const [editing, setEditing] = useState(false);
  const editCv = () => setEditing(true);
  const editSheet = <EditCvSheet open={editing} onOpenChange={setEditing} />;
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
        <LinkButton onClick={editCv}>Edit my CV</LinkButton>
        {editSheet}
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
  const changed = changedSinceReview(state);
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
      {editSheet}
      <Actions>
        <div>
          {left <= 0 ? (
            <>
              <Hint className="text-center">You've used all {MAX_ATTEMPTS} attempts. Please talk to your VigyanShaala mentor.</Hint>
              <LinkButton onClick={() => navigate("/cv")}>See my CV</LinkButton>
            </>
          ) : changed ? (
            // She has made changes: sending them is the next step; more editing is still a tap away.
            <>
              {!allImproved && <Hint className="mb-2 text-center">Some sections Curie mentioned aren't changed yet.</Hint>}
              <BigButton tone="green" onClick={() => navigate("/submit")}>
                Submit again
              </BigButton>
              <LinkButton onClick={editCv}>Keep editing my CV</LinkButton>
            </>
          ) : (
            // Nothing changed yet: submitting the same CV would only use up an attempt.
            <>
              <Hint className="mb-2 text-center">Change your CV using Curie's feedback, then submit again.</Hint>
              <BigButton onClick={editCv}>Edit my CV</BigButton>
              <LinkButton onClick={() => navigate("/cv")}>See my CV</LinkButton>
            </>
          )}
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

/** Her submitted versions, newest first. Each opens the CV exactly as she submitted it. */
function AttemptHistory({ minimum = 2 }: { minimum?: number }) {
  const { state } = useGuided();
  if (state.submissions.length < minimum) return null;
  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-slate-600">Your attempts</p>
      {[...state.submissions].reverse().map((s) => (
        <Link key={s.id} to={`/attempt/${s.attempt}`} className="flex min-h-11 items-center justify-between gap-2 border-b border-slate-200 py-2.5 text-sm">
          <span className="font-medium text-primary">Attempt {s.attempt}</span>
          <span className="flex items-center gap-1 text-slate-600">
            {s.review ? `${"★".repeat(s.review.stars)} · ${s.review.verdict === "accepted" ? "Accepted" : "Needs another attempt"}` : "Reviewing"}
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
          </span>
        </Link>
      ))}
    </div>
  );
}

/** A past attempt: the CV exactly as she submitted it, and Curie's verdict on it. */
export function AttemptView() {
  const { attempt } = useParams();
  const { state } = useGuided();
  const navigate = useNavigate();
  const sub = state.submissions.find((s) => String(s.attempt) === attempt);
  if (!sub) return <Navigate to="/" replace />;
  const r = sub.review;
  return (
    <Screen title={`Attempt ${sub.attempt}`} wide>
      <Hint>
        Submitted {new Date(sub.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
        {r ? ` ${r.verdict === "accepted" ? "Accepted" : "Needs another attempt"} · ${r.stars} out of 5.` : " Curie is reviewing it."}
      </Hint>
      {r && <p className="mt-3 rounded-xl border border-slate-200 p-3.5 text-[15px]">{r.overall}</p>}
      <div className="mt-4">
        <CvPreview data={sub.snapshot} template={state.template} />
      </div>
      <Actions>
        <BigButton tone="outline" onClick={() => navigate(-1)}>
          Back
        </BigButton>
      </Actions>
    </Screen>
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
    <Screen title={`Improve ${sectionDef(section).label}`} label={<SectionsMenu current={section} showAnswers={false} />} wide>
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
      <SectionOverview section={section} />
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
  const [id, setId] = useState<TemplateId>(() => (looks.includes(state.template as TemplateId) ? (state.template as TemplateId) : looks[0]));
  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  const cv = hasEnteredAnything(state.data) ? state.data : EXAMPLE_CV;

  const use = () => {
    update((s) => ({ ...s, template: id }));
    if (templateSupportsPhoto(id) && !state.data.personalInfo.photo) navigate("/photo");
    else navigate("/cv");
  };

  return (
    <Screen title="Choose a look" label="Last step" wide>
      {/* Phones: one full-size look at a time, swiped like photos. Larger screens: all looks and a big preview. */}
      <LookCarousel looks={looks} id={id} setId={setId} cv={cv} />
      <div className="hidden md:block">
        <Hint className="mt-3">Tap a look to choose it. You can change it later.</Hint>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4" role="radiogroup" aria-label="Looks">
          {looks.map((t) => (
            <button key={t} type="button" role="radio" aria-checked={t === id} aria-label={TEMPLATE_NAMES[t]} onClick={() => setId(t)}>
              <div
                className={`pointer-events-none h-[210px] overflow-hidden rounded-xl border-2 md:h-[170px] ${
                  t === id ? "border-secondary" : "border-slate-200"
                }`}
              >
                <CvPreview data={cv} template={t} />
              </div>
              <p className={`mt-1.5 truncate text-center text-sm ${t === id ? "font-medium text-slate-900" : "text-slate-600"}`}>
                {t === id ? "✓ " : ""}
                {TEMPLATE_NAMES[t]}
                {templateSupportsPhoto(t) && <span className="text-xs text-slate-400"> · photo</span>}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:mt-6 md:block">
        <p className="font-medium">
          {TEMPLATE_NAMES[id]}
          {templateSupportsPhoto(id) && <span className="text-sm font-normal text-slate-500"> · has a photo</span>}
        </p>
        <div className="mt-2">
          <CvPreview data={cv} template={id} />
        </div>
      </div>

      <Actions>
        <BigButton tone="green" onClick={use}>
          Use {TEMPLATE_NAMES[id]}
        </BigButton>
      </Actions>
    </Screen>
  );
}

function LookCarousel({ looks, id, setId, cv }: { looks: TemplateId[]; id: TemplateId; setId: (t: TemplateId) => void; cv: ResumeData }) {
  const ref = useRef<HTMLDivElement>(null);
  const index = Math.max(0, looks.indexOf(id));

  // Open on the look she has now.
  useLayoutEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = index * el.clientWidth;
    // Only on first show: afterwards her swipes move the carousel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const k = Math.round(el.scrollLeft / el.clientWidth);
    if (looks[k] && looks[k] !== id) setId(looks[k]);
  };
  const go = (k: number) => {
    const el = ref.current;
    if (!el || !looks[k]) return;
    setId(looks[k]);
    el.scrollTo({ left: k * el.clientWidth, behavior: "smooth" });
  };
  const arrow = "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary active:bg-slate-100 disabled:opacity-30";

  return (
    <div className="md:hidden">
      <div className="mt-1 flex items-center gap-1">
        <button type="button" aria-label="Previous look" disabled={index === 0} onClick={() => go(index - 1)} className={arrow}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <p className="min-w-0 flex-1 text-center">
          <span className="block truncate font-medium">
            {TEMPLATE_NAMES[id]}
            {templateSupportsPhoto(id) && <span className="text-sm font-normal text-slate-500"> · has a photo</span>}
          </span>
          <span className="block text-xs text-slate-500">
            {index + 1} of {looks.length} · swipe to see more
          </span>
        </p>
        <button type="button" aria-label="Next look" disabled={index === looks.length - 1} onClick={() => go(index + 1)} className={arrow}>
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
      <div className="flex flex-wrap justify-center" role="radiogroup" aria-label="Looks">
        {looks.map((t, k) => (
          <button key={t} type="button" role="radio" aria-checked={t === id} aria-label={TEMPLATE_NAMES[t]} onClick={() => go(k)} className="flex h-8 w-7 items-center justify-center">
            <span className={`h-2 rounded-full transition-all ${t === id ? "w-5 bg-secondary" : "w-2 bg-slate-300"}`} />
          </button>
        ))}
      </div>
      <div ref={ref} onScroll={onScroll} className="-mx-5 mt-2 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {looks.map((t, k) => (
          <div key={t} className="w-full shrink-0 snap-center px-5" aria-hidden={t !== id}>
            <div className={`pointer-events-none overflow-hidden rounded-lg border-2 bg-white ${t === id ? "border-secondary" : "border-slate-200"}`}>
              {/* Only the looks next to this one are drawn: kinder to low-end phones. */}
              {Math.abs(k - index) <= 1 ? <CvPreview data={cv} template={t} /> : <div className="aspect-[210/297]" />}
            </div>
          </div>
        ))}
      </div>
    </div>
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
            navigate("/cv");
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
  // The file normally saves on its own; some Android WebViews need a second tap on a real link.
  const [readyFile, setReadyFile] = useState<ReadyDownload | null>(null);
  if (!canDownload(state.data)) return <Navigate to="/cv" replace />;
  const failed = () =>
    toast({ title: "Download didn't work", description: "Check your internet connection and try again.", variant: "destructive" });

  const pdf = async () => {
    setBusy("pdf");
    try {
      // Recording the download must never hold up the file on a slow phone network.
      await withTimeout(storeResumeData(state.data, state.template), STORAGE_WAIT_MS)
        .then(({ error }) => error && console.error("Failed to store resume data:", error))
        .catch((error) => console.error("Storing resume data timed out:", error));
      setReadyFile(await generatePDF("resume-preview", safeDownloadFilename(state.data.personalInfo.fullName, "pdf")));
    } catch {
      failed();
    } finally {
      setBusy(null);
    }
  };

  const word = async () => {
    setBusy("word");
    try {
      setReadyFile(await generateWord(state.data, state.template, safeDownloadFilename(state.data.personalInfo.fullName, "docx")));
    } catch {
      failed();
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
          {readyFile && (
            <a
              data-testid="save-ready-file"
              href={readyFile.url}
              download={readyFile.filename}
              className="flex min-h-11 w-full items-center justify-center rounded-xl border-[1.5px] border-primary px-3 text-center text-sm font-medium text-primary"
            >
              Didn't save? Tap to save {readyFile.filename}
            </a>
          )}
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
