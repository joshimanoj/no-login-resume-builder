import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { bulletsToHtml, htmlToBullets, htmlToParagraph, paragraphToHtml } from "@/utils/plainText";

/**
 * Formatting-free editors for the guided flow. Each look decides fonts and styling,
 * so students only edit words: one box per point, or one plain paragraph.
 */

interface EditorProps {
  label: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function PointsEditor({ label, value, onChange, placeholder }: EditorProps) {
  // Local list so an empty new point stays on screen while she types into it.
  const [points, setPoints] = useState(() => {
    const existing = htmlToBullets(value);
    return existing.length ? existing : [""];
  });

  const change = (next: string[]) => {
    setPoints(next);
    onChange(bulletsToHtml(next));
  };

  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-xs text-muted-foreground">One point per box. Start with an action word.</p>
      <div className="mt-2 space-y-2">
        {points.map((point, k) => (
          <div key={k} className="flex items-start gap-2">
            <span className="mt-2.5 text-primary" aria-hidden>
              •
            </span>
            <Textarea
              rows={2}
              aria-label={`${label} point ${k + 1}`}
              value={point}
              placeholder={k === 0 ? placeholder : undefined}
              onChange={(e) => change(points.map((p, j) => (j === k ? e.target.value : p)))}
            />
            <button
              type="button"
              aria-label={`Remove point ${k + 1}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center text-muted-foreground"
              onClick={() => change(points.length > 1 ? points.filter((_, j) => j !== k) : [""])}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="mt-1 flex min-h-10 items-center gap-1 text-sm text-primary" onClick={() => setPoints([...points, ""])}>
        <Plus className="h-4 w-4" /> Add another point
      </button>
    </div>
  );
}

export function ParagraphEditor({ label, value, onChange, placeholder }: EditorProps) {
  const [text, setText] = useState(() => htmlToParagraph(value));
  return (
    <div>
      <Label>{label}</Label>
      <Textarea
        className="mt-2"
        rows={5}
        aria-label={label}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onChange(paragraphToHtml(e.target.value));
        }}
      />
    </div>
  );
}
