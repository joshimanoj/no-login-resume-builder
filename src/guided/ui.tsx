import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Full-height mobile page. Content flows; the main action sits at the end of the content, not fixed.
 * On larger screens the same page sits in a card under a brand bar, with an optional side panel.
 */
export function Screen({
  children,
  progress,
  label,
  back = true,
  title,
  sections,
  wide,
  aside,
}: {
  children: ReactNode;
  progress?: number;
  /** Segmented bar: one segment per section; the current one fills as she answers its questions. */
  sections?: { total: number; current: number; within: number };
  label?: string;
  back?: boolean;
  title?: string;
  /** A wider card on larger screens, for pages that show the whole CV. */
  wide?: boolean;
  /** Shown beside the card on wide screens only (e.g. the CV filling in). */
  aside?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="min-h-[100dvh] bg-white text-slate-800 md:bg-slate-100">
      <header className="hidden h-14 items-center gap-2.5 border-b border-slate-200 bg-white px-6 md:flex">
        <img src="/Logo2.jpg" alt="" className="h-8 w-auto rounded" />
        <span className="font-medium">VigyanShaala CV Builder</span>
      </header>
      <div className="md:flex md:items-start md:justify-center md:gap-6 md:px-6 md:py-8">
      <div
        className={cn(
          "mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pt-3",
          "md:mx-0 md:min-h-[calc(100dvh-7.5rem)] md:w-full md:rounded-2xl md:border md:border-slate-200 md:bg-white md:px-8 md:pt-6 md:shadow-sm",
          wide ? "md:max-w-2xl" : "md:max-w-[480px]",
        )}
      >
        {(back || progress !== undefined || title || sections) && (
          <div className="flex min-h-11 items-center gap-3">
            {back && (
              <button
                type="button"
                aria-label="Back"
                onClick={() => navigate(-1)}
                className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-primary active:bg-slate-100"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}
            {title && <span className="flex-1 font-medium">{title}</span>}
            {sections && <SectionBar {...sections} />}
            {progress !== undefined && (
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </div>
        )}
        {label && <p className="mt-2 text-xs font-medium text-[hsl(88_45%_30%)]">{label}</p>}
        <div className="flex flex-1 flex-col">{children}</div>
      </div>
      {aside && (
        /* Same height as the card, so both columns line up; the panel scrolls inside itself. */
        <aside className="hidden shrink-0 lg:sticky lg:top-8 lg:flex lg:h-[calc(100dvh-7.5rem)] lg:w-[460px] lg:flex-col xl:w-[540px]">
          {aside}
        </aside>
      )}
      </div>
    </div>
  );
}

function SectionBar({ total, current, within }: { total: number; current: number; within: number }) {
  return (
    <div
      className="flex flex-1 gap-1"
      role="progressbar"
      aria-label={`Section ${current} of ${total}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current - 1 + within}
    >
      {Array.from({ length: total }, (_, k) => {
        const fill = k < current - 1 ? 1 : k === current - 1 ? within : 0;
        return (
          <div key={k} className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-secondary transition-all" style={{ width: `${Math.round(fill * 100)}%` }} />
          </div>
        );
      })}
    </div>
  );
}

export const Question = ({ children }: { children: ReactNode }) => (
  <h1 className="mt-2 text-[22px] font-medium leading-tight text-slate-900">{children}</h1>
);

export const Hint = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("mt-1.5 text-sm text-slate-500", className)}>{children}</p>
);

export const Spacer = () => <div className="min-h-6 flex-1" />;

/**
 * The screen's main action. Sits at the end of the content, and sticks to the bottom
 * of the screen when the content is longer than the screen, so Next is always in reach.
 */
export function Actions({ children }: { children: ReactNode }) {
  return (
    <>
      <Spacer />
      <div className="sticky bottom-0 z-10 -mx-5 border-t border-slate-100 bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:-mx-8 md:rounded-b-2xl md:px-8 md:pb-6">
        {children}
      </div>
    </>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "primary" | "green" | "outline"; busy?: boolean };

export function BigButton({ tone = "primary", busy, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={cn(
        "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-4 text-base font-medium transition active:scale-[0.99] disabled:opacity-50",
        tone === "primary" && "bg-primary text-white",
        tone === "green" && "bg-secondary text-white",
        tone === "outline" && "border-[1.5px] border-primary bg-white text-primary",
        className,
      )}
      {...rest}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export const LinkButton = ({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button type="button" className={cn("mt-1 min-h-11 w-full text-center text-[15px] text-primary", className)} {...rest} />
);

export function Option({ selected, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "flex min-h-[50px] w-full items-center gap-2 rounded-xl border-[1.5px] px-4 text-left text-[15px] transition",
        selected ? "border-primary bg-[#eef3f8] font-medium" : "border-slate-300 bg-white active:bg-slate-50",
        className,
      )}
      {...rest}
    >
      {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...rest }, ref) => (
  <input
    ref={ref}
    className={cn(
      "w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 py-3 text-base outline-none focus:border-primary",
      className,
    )}
    {...rest}
  />
));
TextInput.displayName = "TextInput";

export const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full rounded-xl border-[1.5px] border-slate-300 bg-white px-3.5 py-3 text-base outline-none focus:border-primary",
        className,
      )}
      {...rest}
    />
  ),
);
TextArea.displayName = "TextArea";

export const FieldError = ({ children }: { children?: ReactNode }) =>
  children ? <p className="mt-2 text-sm text-[#854F0B]">{children}</p> : null;

export function Chip({ selected, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-10 items-center gap-1 rounded-full border-[1.5px] px-3.5 text-sm",
        selected ? "border-secondary bg-[#eaf5e4] font-medium text-[#1f3d12]" : "border-slate-300 bg-white",
      )}
      {...rest}
    >
      {selected && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export const CurieAvatar = ({ size = 32 }: { size?: number }) => (
  <div
    className="flex shrink-0 items-center justify-center rounded-full bg-[#e8f3e2] font-medium text-[#3b6d11]"
    style={{ width: size, height: size, fontSize: size * 0.4 }}
    aria-hidden
  >
    C
  </div>
);

export function Stars({ value }: { value: number }) {
  return (
    <span className="text-2xl tracking-wider" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? "text-[#e0a02a]" : "text-slate-300"}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Non-Latin script detection for the English-only rule. */
export const hasNonLatinScript = (text: string) => /[ऀ-෿؀-ۿ]/.test(text);
