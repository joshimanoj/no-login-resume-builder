import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Plus, X } from "lucide-react";
import { TEMPLATE_IDS, TEMPLATE_NAMES, templateSupportsPhoto, type TemplateId } from "@/utils/templates";
import { useGuided } from "./GuidedContext";
import { SECTIONS, isUnderReview, sectionDef, sectionNumber, type GuidedState, type ListSection, type SectionId } from "./state";
import {
  addItem,
  bulletsToHtml,
  buildSteps,
  firstStepOfItem,
  htmlToBullets,
  isListSection,
  items,
  optInKey,
  promptsToHtml,
  setAnswer,
  setItem,
  type Step,
} from "./steps";
import { sectionIssues } from "./checks";
import { CvPreview } from "./screens";
import { demoState } from "./demo";
import { paragraphToHtml } from "@/utils/plainText";
import {
  Actions,
  BigButton,
  Chip,
  FieldError,
  Hint,
  LinkButton,
  Option,
  Question,
  Screen,
  Spacer,
  TextArea,
  TextInput,
  hasNonLatinScript,
} from "./ui";

const ENGLISH_ONLY = "Please write this in English. Your CV needs to be in English.";

export function StepScreen() {
  const { key = "" } = useParams();
  const { state } = useGuided();
  const steps = useMemo(() => buildSteps(state), [state]);
  const index = steps.findIndex((s) => s.key === key);

  if (isUnderReview(state)) return <Navigate to="/cv" replace />;
  if (index === -1) return <Navigate to={`/s/${steps[0].key}`} replace />;

  const step = steps[index];
  const def = sectionDef(step.section);
  const inSection = steps.filter((s) => s.section === step.section);
  const within = (inSection.findIndex((s) => s.key === step.key) + 1) / inSection.length;
  return (
    <TrackedStep
      step={step}
      bar={{ total: SECTIONS.length, current: sectionNumber(step.section), within }}
      label={`${def.label} · ${sectionNumber(step.section)} of ${SECTIONS.length}`}
    />
  );
}

function TrackedStep({ step, bar, label }: { step: Step; bar: { total: number; current: number; within: number }; label: string }) {
  const { update } = useGuided();
  useEffect(() => {
    update((s) => (s.lastStep === step.key ? s : { ...s, lastStep: step.key }));
    window.scrollTo({ top: 0 });
  }, [step.key, update]);
  return (
    <Screen sections={bar} label={label} aside={<LivePreview />}>
      {/* key forces fresh local state per step */}
      <StepBody key={step.key} step={step} />
    </Screen>
  );
}

const EXAMPLE_CV = demoState().data;

/** Desktop only: the CV filling in beside the questions, with a full-width document view. */
function LivePreview() {
  const { state, update } = useGuided();
  const [full, setFull] = useState(false);
  const index = Math.max(0, TEMPLATE_IDS.indexOf(state.template as TemplateId));
  const id = TEMPLATE_IDS[index];
  // Trying looks here pre-selects one for the last step, where the choice is confirmed (and a photo added).
  const step = (by: number) => update((s) => ({ ...s, template: TEMPLATE_IDS[(index + by + TEMPLATE_IDS.length) % TEMPLATE_IDS.length] }));
  // Until she has written something, show the look with an example CV so it isn't an empty page.
  const d = state.data;
  const hasContent = Boolean(d.personalInfo.fullName.trim() || d.education.length || d.experience.length);
  const cv = hasContent ? d : EXAMPLE_CV;

  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const lookArrows = (
    <>
      <button type="button" aria-label="Previous look" onClick={() => step(-1)} className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-slate-100">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Next look" onClick={() => step(1)} className="flex h-9 w-9 items-center justify-center rounded-full text-primary hover:bg-slate-100">
        <ChevronRight className="h-5 w-5" />
      </button>
    </>
  );
  const notes = (
    <>
      {!hasContent && (
        <p className="mb-3 shrink-0 rounded-lg bg-[#eef3f8] px-3 py-2 text-xs text-primary">
          Example: your CV will look like this. It fills in with your details as you answer.
        </p>
      )}
      {templateSupportsPhoto(id) && !d.personalInfo.photo && (
        <p className="mb-3 shrink-0 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">This look has a photo. You'll add it in the last step.</p>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex shrink-0 items-center gap-1">
        <p className="flex-1 text-sm font-medium text-slate-600">
          Your CV so far · <span className="text-slate-900">{TEMPLATE_NAMES[id]}</span>
        </p>
        {lookArrows}
        <button
          type="button"
          onClick={() => setFull(true)}
          className="ml-1 flex h-9 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-sm text-primary hover:bg-slate-50"
        >
          <Maximize2 className="h-4 w-4" /> Full view
        </button>
      </div>
      {notes}
      <div className={`min-h-0 flex-1 overflow-y-auto ${hasContent ? "" : "opacity-60"}`}>
        <CvPreview data={cv} template={id} />
      </div>

      {/* Portal: the side panel is sticky, which would keep this overlay underneath the card's Next button. */}
      {full &&
        createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-200" role="dialog" aria-modal="true" aria-label="Your CV, full view">
          <div className="flex h-14 shrink-0 items-center gap-1 border-b border-slate-300 bg-white px-6">
            <p className="flex-1 font-medium">
              Your CV · <span className="font-normal text-slate-600">{TEMPLATE_NAMES[id]}</span>
            </p>
            {lookArrows}
            <button
              type="button"
              autoFocus
              onClick={() => setFull(false)}
              className="ml-2 flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-white"
            >
              <Minimize2 className="h-4 w-4" /> Back to questions
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-8">
            <div className="mx-auto max-w-[794px]">
              {notes}
              {/* A4 width, like a page in a word processor. */}
              <div className={`bg-white shadow-lg ${hasContent ? "" : "opacity-60"}`}>
                <CvPreview data={cv} template={id} />
              </div>
            </div>
          </div>
        </div>,
          document.body,
        )}
    </div>
  );
}

function StepBody({ step }: { step: Step }) {
  switch (step.kind) {
    case "intro":
      return <IntroStep step={step} />;
    case "text":
      return <TextStep step={step} />;
    case "choice":
      return <ChoiceStep step={step} />;
    case "yesno":
      return <YesNoStep step={step} />;
    case "month":
      return <MonthStep step={step} />;
    case "prompts":
      return <PromptsStep step={step} />;
    case "bullets":
      return <BulletsStep step={step} />;
    case "tools":
      return <ToolsStep step={step} />;
    case "more":
      return <MoreStep step={step} />;
    case "summary":
      return <SummaryStep step={step} />;
    case "skills":
      return <SkillsStep step={step} />;
    case "levels":
      return <LevelsStep step={step} />;
    case "check":
      return <CheckStep step={step} />;
  }
}

type StepOf<K extends Step["kind"]> = Extract<Step, { kind: K }>;

function SkipForNow({ step }: { step: Step }) {
  const { state, advance } = useGuided();
  return <LinkButton onClick={() => advance(state, step.key)}>Skip for now</LinkButton>;
}

// ---------- intro ----------

function IntroStep({ step }: { step: StepOf<"intro"> }) {
  const { state, advance } = useGuided();
  const def = sectionDef(step.section);
  const sec = step.section;
  const answer = state.answers[optInKey(sec)];

  const start = (s: GuidedState) =>
    isListSection(sec) && items(s, sec).length === 0 ? addItem(s, sec) : s;

  const yes = () => advance(start(setAnswer(state, optInKey(sec), true)), step.key);
  const no = () => {
    let s = setAnswer(state, optInKey(sec), false);
    if (isListSection(sec)) {
      // Drop untouched entries; anything she typed is kept and editable later.
      const kept = items(s, sec).filter((it) => Object.entries(it).some(([k, v]) => k !== "id" && typeof v === "string" && v.trim()));
      s = { ...s, data: { ...s.data, [sec]: kept } };
    }
    advance(s, step.key);
  };

  return (
    <>
      <Spacer />
      <Question>
        <span className="text-[26px]">{def.label}</span>
      </Question>
      <Hint className="text-[15px]">{def.intro}</Hint>
      {def.ask ? (
        <>
          <p className="mt-7 text-lg font-medium">{def.ask}</p>
          <div className="mt-3 space-y-2.5">
            <Option selected={answer === true} onClick={yes} className="justify-center text-center">
              Yes
            </Option>
            <Option selected={answer === false} onClick={no} className="justify-center text-center">
              No, skip this section
            </Option>
          </div>
          <Spacer />
        </>
      ) : (
        <>
          <Actions>
            <BigButton onClick={() => advance(start(state), step.key)}>Okay</BigButton>
          </Actions>
        </>
      )}
    </>
  );
}

// ---------- text ----------

function TextStep({ step }: { step: StepOf<"text"> }) {
  const { state, advance } = useGuided();
  const [value, setValue] = useState(() => step.get(state));
  const [error, setError] = useState<string | null>(null);

  const done = (v: string) => {
    if (hasNonLatinScript(v)) return setError(ENGLISH_ONLY);
    const problem = step.validate?.(v);
    if (problem) return setError(problem);
    let s = step.set(state, v);
    if (step.onDone) s = step.onDone(s);
    advance(s, step.key);
  };

  const Field = step.multiline ? TextArea : TextInput;
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) done(value);
      }}
    >
      <Question>{step.q}</Question>
      {step.hint && <Hint>{step.hint}</Hint>}
      <div className="mt-5">
        <Field
          autoFocus
          value={value}
          rows={step.multiline ? 4 : undefined}
          type={step.multiline ? undefined : step.inputType ?? "text"}
          inputMode={step.inputType === "tel" ? "tel" : step.inputType === "email" ? "email" : step.inputType === "url" ? "url" : undefined}
          autoComplete={step.autoComplete ?? "off"}
          autoCapitalize={step.inputType === "email" || step.inputType === "url" ? "none" : "sentences"}
          placeholder={step.placeholder}
          enterKeyHint="next"
          onChange={(e: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
            setValue(e.target.value);
            setError(null);
          }}
        />
      </div>
      <FieldError>{error}</FieldError>
      {step.alt && (
        <div className="mt-3">
          <Option onClick={() => done(step.alt!.value)} className="justify-center">
            {step.alt.label}
          </Option>
        </div>
      )}
      <Actions>
        <BigButton type="submit" disabled={!value.trim()}>
          Next
        </BigButton>
        {step.skip ? (
          <LinkButton onClick={() => advance(step.set(state, ""), step.key)}>{step.skip}</LinkButton>
        ) : (
          <SkipForNow step={step} />
        )}
      </Actions>
    </form>
  );
}

// ---------- choice ----------

function ChoiceStep({ step }: { step: StepOf<"choice"> }) {
  const { state, advance } = useGuided();
  const current = step.get(state);
  const isOther = Boolean(current) && !step.options.includes(current);
  const [otherOpen, setOtherOpen] = useState(isOther || (step.options.length === 0 && step.allowOther));
  const [other, setOther] = useState(isOther ? current : "");
  const [error, setError] = useState<string | null>(null);

  const pick = (v: string) => advance(step.set(state, v), step.key);
  const two = step.options.length > 0 && step.options.every((o) => o.length <= 16);

  return (
    <>
      <Question>{step.q}</Question>
      {step.hint && <Hint>{step.hint}</Hint>}
      <div className={two ? "mt-5 grid grid-cols-2 gap-2.5" : "mt-5 space-y-2.5"}>
        {step.options.map((o) => (
          <Option key={o} selected={current === o} onClick={() => pick(o)} className={two ? "justify-center text-center" : ""}>
            {o}
          </Option>
        ))}
        {step.allowOther && step.options.length > 0 && (
          <Option selected={otherOpen} onClick={() => setOtherOpen(true)} className={two ? "justify-center text-center" : ""}>
            Something else
          </Option>
        )}
      </div>
      {otherOpen && (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (hasNonLatinScript(other)) return setError(ENGLISH_ONLY);
            if (other.trim()) pick(other.trim());
          }}
        >
          <TextInput autoFocus value={other} placeholder="Type it here" onChange={(e) => (setOther(e.target.value), setError(null))} />
          <FieldError>{error}</FieldError>
          <BigButton type="submit" className="mt-3" disabled={!other.trim()}>
            Next
          </BigButton>
        </form>
      )}
      <Actions>
        {step.skip ? (
          <LinkButton onClick={() => advance(step.skip!.apply(state), step.key)}>{step.skip.label}</LinkButton>
        ) : (
          <SkipForNow step={step} />
        )}
      </Actions>
    </>
  );
}

// ---------- yes / no ----------

function YesNoStep({ step }: { step: StepOf<"yesno"> }) {
  const { state, advance } = useGuided();
  const current = step.get(state);
  return (
    <>
      <Question>{step.q}</Question>
      {step.hint && <Hint>{step.hint}</Hint>}
      <div className="mt-6 space-y-2.5">
        <Option selected={current === true} onClick={() => advance(step.set(state, true), step.key)} className="justify-center text-center">
          Yes
        </Option>
        <Option selected={current === false} onClick={() => advance(step.set(state, false), step.key)} className="justify-center text-center">
          No
        </Option>
      </div>
      <Spacer />
    </>
  );
}

// ---------- month ----------

const thisMonth = () => new Date().toISOString().slice(0, 7);

function MonthStep({ step }: { step: StepOf<"month"> }) {
  const { state, advance } = useGuided();
  const [value, setValue] = useState(() => step.get(state));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value) return;
        if (step.noFuture && value > thisMonth()) return setError("This can't be in the future.");
        advance(step.set(state, value), step.key);
      }}
    >
      <Question>{step.q}</Question>
      {step.hint && <Hint>{step.hint}</Hint>}
      <TextInput
        className="mt-5"
        type="month"
        value={value}
        max={step.noFuture ? thisMonth() : undefined}
        onChange={(e) => (setValue(e.target.value), setError(null))}
      />
      <FieldError>{error}</FieldError>
      <Actions>
        <BigButton type="submit" disabled={!value}>
          Next
        </BigButton>
        {step.skip ? (
          <LinkButton onClick={() => advance(step.set(state, ""), step.key)}>{step.skip}</LinkButton>
        ) : (
          <SkipForNow step={step} />
        )}
      </Actions>
    </form>
  );
}

// ---------- descriptions ----------

const PROMPTS = [
  ["What did you do?", "Start with an action word: made, built, taught, organised, found."],
  ["What did you use?", "Tools, software, methods or people you worked with."],
  ["What happened because of it?", "The result. Add numbers if you know them."],
];

const itemSection = (step: Step) => step.section as ListSection;

function PromptsStep({ step }: { step: StepOf<"prompts"> }) {
  const { state, advance } = useGuided();
  const sec = itemSection(step);
  const item = items(state, sec)[step.index];
  const previous = state.prompts[item.id] ?? ["", "", ""];
  const [boxes, setBoxes] = useState(previous);
  const [error, setError] = useState<string | null>(null);

  const next = () => {
    if (boxes.some(hasNonLatinScript)) return setError(ENGLISH_ONLY);
    const description = String(item.description ?? "");
    // Only rebuild the points if she hasn't edited them since they were made from these boxes.
    const untouched = !description || description === promptsToHtml(previous);
    let s: GuidedState = { ...state, prompts: { ...state.prompts, [item.id]: boxes } };
    if (untouched) s = setItem(s, sec, step.index, { description: promptsToHtml(boxes) });
    advance(s, step.key);
  };

  return (
    <>
      <Question>Tell me about it</Question>
      <Hint>In your own words. Short is fine. Skip any box.</Hint>
      {PROMPTS.map(([label, help], k) => (
        <div key={label} className="mt-4">
          <label className="text-sm font-medium" htmlFor={`prompt-${k}`}>
            {label}
          </label>
          <TextArea
            id={`prompt-${k}`}
            className="mt-1.5"
            rows={2}
            value={boxes[k]}
            onChange={(e) => {
              const copy = [...boxes];
              copy[k] = e.target.value;
              setBoxes(copy);
              setError(null);
            }}
          />
          <p className="mt-1 text-xs text-slate-400">{help}</p>
        </div>
      ))}
      <FieldError>{error}</FieldError>
      <Actions>
        <BigButton onClick={next}>Next</BigButton>
      </Actions>
    </>
  );
}

function BulletsStep({ step }: { step: StepOf<"bullets"> }) {
  const { state, advance } = useGuided();
  const sec = itemSection(step);
  const item = items(state, sec)[step.index];
  const [points, setPoints] = useState(() => {
    const b = htmlToBullets(String(item.description ?? ""));
    return b.length ? b : [""];
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Question>Your points</Question>
      <Hint>This is how they'll appear on your CV. Change anything you like.</Hint>
      <div className="mt-4 space-y-2.5">
        {points.map((p, k) => (
          <div key={k} className="flex items-start gap-2">
            <span className="mt-3.5 text-primary" aria-hidden>
              •
            </span>
            <TextArea
              rows={2}
              aria-label={`Point ${k + 1}`}
              value={p}
              onChange={(e) => {
                const copy = [...points];
                copy[k] = e.target.value;
                setPoints(copy);
                setError(null);
              }}
            />
            <button
              type="button"
              aria-label={`Remove point ${k + 1}`}
              className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-slate-400"
              onClick={() => setPoints(points.filter((_, j) => j !== k))}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="mt-2 flex min-h-11 items-center gap-1 text-[15px] text-primary" onClick={() => setPoints([...points, ""])}>
        <Plus className="h-4 w-4" /> Add another point
      </button>
      <FieldError>{error}</FieldError>
      <Actions>
        <BigButton
          onClick={() => {
            if (points.some(hasNonLatinScript)) return setError(ENGLISH_ONLY);
            advance(setItem(state, sec, step.index, { description: bulletsToHtml(points) }), step.key);
          }}
        >
          Looks good
        </BigButton>
      </Actions>
    </>
  );
}

const COMMON_TOOLS = ["MS Excel", "MS Word", "PowerPoint", "Canva", "Python", "HTML", "CSS", "JavaScript", "Java", "C", "Tally", "Google Sheets"];

const splitList = (t: string) =>
  t
    .split(/,|\band\b|\//i)
    .map((x) => x.trim())
    .filter(Boolean);

function ToolsStep({ step }: { step: StepOf<"tools"> }) {
  const { state, advance } = useGuided();
  const sec = itemSection(step);
  const item = items(state, sec)[step.index];
  const [selected, setSelected] = useState<string[]>(() => splitList(String(item.technologies ?? "")));
  const [own, setOwn] = useState("");
  const options = Array.from(new Set([...COMMON_TOOLS, ...selected]));
  const toggle = (t: string) => setSelected(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);

  return (
    <>
      <Question>What did you use?</Question>
      <Hint>Tap all that fit, or add your own. These are also suggested in Skills.</Hint>
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((t) => (
          <Chip key={t} selected={selected.includes(t)} onClick={() => toggle(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = own.trim();
          if (v && !hasNonLatinScript(v)) setSelected(Array.from(new Set([...selected, v])));
          setOwn("");
        }}
      >
        <TextInput value={own} placeholder="Add your own" onChange={(e) => setOwn(e.target.value)} />
        <button type="submit" className="min-h-11 shrink-0 rounded-xl border-[1.5px] border-primary px-4 text-primary">
          Add
        </button>
      </form>
      <Actions>
        <BigButton onClick={() => advance(setItem(state, sec, step.index, { technologies: selected.join(", ") }), step.key)}>Next</BigButton>
      </Actions>
    </>
  );
}

// ---------- add another ----------

function itemLabel(sec: ListSection, it: Record<string, unknown>): string {
  const v = (k: string) => String(it[k] ?? "").trim();
  const parts: Record<ListSection, string[]> = {
    education: [[v("degree"), v("field")].filter(Boolean).join(" "), v("school")],
    experience: [v("position"), v("company")],
    projects: [v("name")],
    achievements: [v("title")],
    awards: [v("title")],
    certifications: [v("name"), v("issuer")],
    publications: [v("title")],
  };
  return parts[sec].filter(Boolean).join(", ") || "Not filled in yet";
}

function MoreStep({ step }: { step: StepOf<"more"> }) {
  const { state, advance, goStep, update } = useGuided();
  const sec = itemSection(step);
  const list = items(state, sec);

  const add = (preset?: Record<string, unknown>) => {
    const s = update(addItem(state, sec, preset));
    goStep(firstStepOfItem(s, sec, list.length));
  };

  const degrees = state.data.education.map((e) => e.degree);
  const schoolOptions = sec === "education" ? ["Class 12", "Class 10"].filter((c) => !degrees.includes(c)) : [];

  return (
    <>
      <div className="mt-2 space-y-2">
        {list.map((it) => (
          <div key={it.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-[15px]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] text-white">✓</span>
            <span className="min-w-0 flex-1 truncate">{itemLabel(sec, it)}</span>
          </div>
        ))}
      </div>
      <Question>{sec === "education" && schoolOptions.length ? "What's next?" : "Add another?"}</Question>
      <div className="mt-5 space-y-2.5">
        {schoolOptions.map((c) => (
          <Option key={c} onClick={() => add({ degree: c })} className="justify-center text-center">
            Add {c}
          </Option>
        ))}
        <Option onClick={() => add()} className="justify-center text-center">
          {sec === "education" ? "Add another degree or course" : "Yes, add another"}
        </Option>
        <Option onClick={() => advance(state, step.key)} className="justify-center text-center">
          No, move on
        </Option>
      </div>
      <Spacer />
    </>
  );
}

// ---------- professional summary ----------

const STARTERS = [
  ["I am a", "3rd-year B.Sc. Physics", "student"],
  ["at", "K.T.H.M. College, Nashik", "."],
  ["I am good at", "web development and Python", "."],
  ["I am looking for", "a software internship", "."],
];

const composeSummary = (parts: string[]) => {
  const [a, b, c, d] = parts.map((p) => p.trim());
  const sentences = [
    a || b ? `I am a ${a || "___"} student${b ? ` at ${b}` : ""}.` : "",
    c ? `I am good at ${c}.` : "",
    d ? `I am looking for ${d}.` : "",
  ].filter(Boolean);
  return sentences.join(" ");
};

function SummaryStep({ step }: { step: StepOf<"summary"> }) {
  const { state, advance } = useGuided();
  const existing = htmlToBullets(state.data.personalInfo.summary).join(" ");
  const savedParts = state.prompts["summary"] ?? ["", "", "", ""];
  const startedOwn = Boolean(existing) && existing !== composeSummary(savedParts);
  const [own, setOwn] = useState(startedOwn);
  const [parts, setParts] = useState(savedParts);
  const [text, setText] = useState(existing);
  const [error, setError] = useState<string | null>(null);

  const finalText = own ? text : composeSummary(parts);

  const save = () => {
    if (hasNonLatinScript(finalText)) return setError(ENGLISH_ONLY);
    const s: GuidedState = {
      ...state,
      prompts: { ...state.prompts, summary: parts },
      data: { ...state.data, personalInfo: { ...state.data.personalInfo, summary: paragraphToHtml(finalText) } },
    };
    advance(s, step.key);
  };

  return (
    <>
      <Question>Your professional summary</Question>
      <Hint>2 to 3 lines at the top of your CV. {own ? "Write it in your own words." : "Fill in the blanks."}</Hint>
      {own ? (
        <TextArea className="mt-4" rows={6} value={text} autoFocus onChange={(e) => (setText(e.target.value), setError(null))} />
      ) : (
        <div className="mt-4 space-y-3">
          {STARTERS.map(([before, example], k) => (
            <label key={k} className="block">
              <span className="text-sm text-slate-600">{before}</span>
              <TextInput
                className="mt-1"
                value={parts[k]}
                placeholder={example}
                onChange={(e) => {
                  const copy = [...parts];
                  copy[k] = e.target.value;
                  setParts(copy);
                  setError(null);
                }}
              />
            </label>
          ))}
          {finalText && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
              <span className="text-xs font-medium text-slate-500">On your CV: </span>
              {finalText}
            </div>
          )}
        </div>
      )}
      <FieldError>{error}</FieldError>
      <button
        type="button"
        className="mt-3 min-h-11 text-left text-[15px] text-primary"
        onClick={() => {
          if (!own) setText(finalText);
          setOwn(!own);
        }}
      >
        {own ? "Use the fill-in-the-blanks help instead" : "Write my own instead"}
      </button>
      <p className="text-xs text-slate-400">You can come back and improve this once the rest of your CV is done.</p>
      <Actions>
        <BigButton onClick={save} disabled={!finalText.trim()}>
          Next
        </BigButton>
        <SkipForNow step={step} />
      </Actions>
    </>
  );
}

// ---------- skills ----------

const FIELD_SKILLS: [RegExp, string[]][] = [
  [/physics/i, ["Python", "MS Excel", "Lab work", "Data analysis", "MATLAB"]],
  [/chem/i, ["Lab work", "Titration", "Spectroscopy", "MS Excel", "Data analysis"]],
  [/math/i, ["Statistics", "MS Excel", "Python", "Problem solving", "R"]],
  [/bio/i, ["Lab work", "Microscopy", "Research", "MS Excel", "Data recording"]],
  [/computer|bca|it\b/i, ["Python", "Java", "C", "SQL", "HTML", "CSS", "JavaScript", "Git"]],
  [/commerce|account|finance|bank|b\.com/i, ["Tally", "MS Excel", "Accounting", "GST basics", "Bookkeeping"]],
  [/english|history|political|psychology|economics|arts/i, ["Writing", "Research", "Public speaking", "MS Word", "Data analysis"]],
];
const GENERAL_SKILLS = ["Communication", "Teamwork", "MS Word", "MS Excel", "PowerPoint", "Leadership", "Time management"];

function suggestedSkills(s: GuidedState): { fromWork: string[]; fromStudies: string[] } {
  const fromWork = new Set<string>();
  (s.data.projects ?? []).forEach((p) => splitList(p.technologies).forEach((t) => fromWork.add(t)));
  s.data.experience.forEach((e) => splitList(s.prompts[e.id]?.[1] ?? "").forEach((t) => t.length <= 24 && fromWork.add(t)));
  const studies = s.data.education.map((e) => `${e.degree} ${e.field}`).join(" ");
  const fromStudies = new Set<string>();
  FIELD_SKILLS.forEach(([re, list]) => re.test(studies) && list.forEach((x) => fromStudies.add(x)));
  return { fromWork: [...fromWork], fromStudies: [...fromStudies] };
}

function SkillsStep({ step }: { step: StepOf<"skills"> }) {
  const { state, advance } = useGuided();
  const [selected, setSelected] = useState<string[]>(() => state.data.skills.map((s) => s.name).filter(Boolean));
  const [own, setOwn] = useState("");
  const { fromWork, fromStudies } = suggestedSkills(state);
  const toggle = (t: string) => setSelected(selected.includes(t) ? selected.filter((x) => x !== t) : [...selected, t]);
  const shown = new Set<string>();
  const group = (title: string, list: string[]) => {
    const fresh = list.filter((x) => !shown.has(x));
    fresh.forEach((x) => shown.add(x));
    return fresh.length ? (
      <div className="mt-4">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {fresh.map((t) => (
            <Chip key={t} selected={selected.includes(t)} onClick={() => toggle(t)}>
              {t}
            </Chip>
          ))}
        </div>
      </div>
    ) : null;
  };

  const save = () => {
    const skills = selected.map((name) => {
      const existing = state.data.skills.find((s) => s.name === name);
      return existing ?? { id: `skill-${name.toLowerCase().replace(/\W+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`, name, level: "Intermediate" };
    });
    advance({ ...state, data: { ...state.data, skills } }, step.key);
  };

  return (
    <>
      <Question>Pick your skills</Question>
      <Hint>At least 2. One skill per chip.</Hint>
      {group("You've already added", selected)}
      {group("From your work and projects", fromWork)}
      {group("Often used in your studies", fromStudies)}
      {group("Others", GENERAL_SKILLS)}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const v = own.trim();
          if (v && !hasNonLatinScript(v)) setSelected(Array.from(new Set([...selected, v])));
          setOwn("");
        }}
      >
        <TextInput value={own} placeholder="Add your own" onChange={(e) => setOwn(e.target.value)} />
        <button type="submit" className="min-h-11 shrink-0 rounded-xl border-[1.5px] border-primary px-4 text-primary">
          Add
        </button>
      </form>
      <Actions>
        <p className="mb-2 text-center text-sm text-slate-500">{selected.length} selected</p>
        <BigButton onClick={save} disabled={selected.length < 2}>
          Next
        </BigButton>
        <SkipForNow step={step} />
      </Actions>
    </>
  );
}

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

function LevelsStep({ step }: { step: StepOf<"levels"> }) {
  const { state, advance, update } = useGuided();
  const skills = state.data.skills.filter((s) => s.name.trim());
  const setLevel = (id: string, level: string) =>
    update((s) => ({ ...s, data: { ...s.data, skills: s.data.skills.map((k) => (k.id === id ? { ...k, level } : k)) } }));

  return (
    <>
      <Question>How good are you at each?</Question>
      <Hint>Be honest. Interviewers may ask about these.</Hint>
      <div className="mt-4 divide-y divide-slate-200">
        {skills.map((sk) => (
          <div key={sk.id} className="py-3">
            <p className="text-[15px] font-medium">{sk.name}</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label={`${sk.name} level`}>
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={sk.level === l}
                  onClick={() => setLevel(sk.id, l)}
                  className={`min-h-10 rounded-lg border-[1.5px] text-xs ${
                    sk.level === l ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {skills.length === 0 && <Hint>Add skills on the previous screen first.</Hint>}
      <Actions>
        <BigButton onClick={() => advance(state, step.key)}>Next</BigButton>
      </Actions>
    </>
  );
}

// ---------- section check ----------

function sectionSummary(s: GuidedState, id: SectionId): string {
  if (id === "personal") return "Contact details and summary";
  if (id === "skills") return `${s.data.skills.length} skills, each with a level`;
  const n = items(s, id as ListSection).length;
  return `${n} ${n === 1 ? "entry" : "entries"} added`;
}

function CheckStep({ step }: { step: StepOf<"check"> }) {
  const { state, advance, goStep, update } = useGuided();
  const navigate = useNavigate();
  const issues = sectionIssues(state, step.section);
  const nextSection = SECTIONS[sectionNumber(step.section)];

  const fix = (target: string, preset?: Record<string, unknown>) => {
    if (preset) {
      const sec = step.section as ListSection;
      const index = items(state, sec).length;
      const s = update(addItem(state, sec, preset));
      goStep(firstStepOfItem(s, sec, index));
    } else goStep(target);
  };

  return (
    <>
      <Question>{issues.length ? "Almost there" : "Looks good!"}</Question>
      <div className="mt-4 flex items-center gap-3 border-b border-slate-200 py-3 text-[15px]">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[11px] text-white">✓</span>
        {sectionSummary(state, step.section)}
      </div>
      {issues.map((issue) => (
        <div key={issue.message} className="mt-3 rounded-xl bg-[#fdf3e1] p-3.5 text-[15px] text-[#633806]">
          <p>{issue.message}</p>
          <button
            type="button"
            onClick={() => fix(issue.target, issue.addPreset)}
            className="mt-2 min-h-10 rounded-lg border-[1.5px] border-[#c9861a] bg-white px-3 font-medium"
          >
            {issue.addPreset ? `Add ${String(issue.addPreset.degree ?? "it")}` : "Fix this"}
          </button>
        </div>
      ))}
      {issues.length > 0 && <Hint>You'll need to fix this before you submit your CV to Curie.</Hint>}
      <Actions>
        <BigButton tone={issues.length ? "outline" : "primary"} onClick={() => (nextSection ? advance(state, step.key) : navigate("/look"))}>
          {`${issues.length ? "Fix later, continue" : "Continue"} to ${nextSection ? nextSection.label : "choose a look"}`}
        </BigButton>
      </Actions>
    </>
  );
}

