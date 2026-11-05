import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  DOWNLOAD_CHECKLIST,
  isChecklistComplete,
  type ChecklistAnswer,
} from "@/utils/resumeRules";
import { Download, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface DownloadChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownloadPdf: () => void;
  onDownloadWord: () => void;
  isGeneratingPDF: boolean;
  isGeneratingWord: boolean;
  readyFile?: { url: string; filename: string } | null;
}

const emptyAnswers = (): ChecklistAnswer[] => DOWNLOAD_CHECKLIST.map(() => "");

export const DownloadChecklistDialog = ({
  open,
  onOpenChange,
  onDownloadPdf,
  onDownloadWord,
  isGeneratingPDF,
  isGeneratingWord,
  readyFile = null,
}: DownloadChecklistDialogProps) => {
  const [answers, setAnswers] = useState<ChecklistAnswer[]>(emptyAnswers);

  useEffect(() => {
    if (open) setAnswers(emptyAnswers());
  }, [open]);

  const ready = isChecklistComplete(answers);
  const busy = isGeneratingPDF || isGeneratingWord;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bottom-3 !left-3 !right-3 !top-3 !block !h-auto !max-h-none !w-auto !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto bg-white p-4 text-gray-900 sm:p-6">
        <DialogHeader>
          <DialogTitle className="pr-8 text-gray-900">Have you re-read these points?</DialogTitle>
          <DialogDescription className="text-gray-600">
            Mark Yes or Not Applicable for every point. Download stays disabled if any point is No or unanswered.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {DOWNLOAD_CHECKLIST.map((item, index) => (
            <div key={item} className="rounded-md border border-gray-200 p-3">
              <p className="mb-3 text-sm font-medium text-gray-900">
                {index + 1}. {item}
              </p>
              <RadioGroup
                className="flex flex-wrap gap-4"
                value={answers[index]}
                onValueChange={(value) => {
                  setAnswers((prev) => {
                    const next = [...prev];
                    next[index] = value as ChecklistAnswer;
                    return next;
                  });
                }}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id={`check-${index}-yes`} />
                  <Label htmlFor={`check-${index}-yes`} className="cursor-pointer text-gray-800">
                    Yes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="na" id={`check-${index}-na`} />
                  <Label htmlFor={`check-${index}-na`} className="cursor-pointer text-gray-800">
                    Not Applicable
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id={`check-${index}-no`} />
                  <Label htmlFor={`check-${index}-no`} className="cursor-pointer text-gray-800">
                    No
                  </Label>
                </div>
              </RadioGroup>
            </div>
          ))}
        </div>
        {readyFile && (
          <a
            data-testid="save-ready-file"
            href={readyFile.url}
            download={readyFile.filename}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center rounded-md bg-primary px-4 text-center text-sm font-medium text-primary-foreground"
          >
            Tap to save {readyFile.filename}
          </a>
        )}
        <DialogFooter className="shrink-0 gap-2 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            className="flex items-center space-x-2"
            disabled={!ready || busy}
            onClick={onDownloadPdf}
            data-testid="checklist-download-pdf"
          >
            {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span>{isGeneratingPDF ? "Generating..." : "Download PDF"}</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="flex items-center space-x-2"
            disabled={!ready || busy}
            onClick={onDownloadWord}
            data-testid="checklist-download-word"
          >
            {isGeneratingWord ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            <span>{isGeneratingWord ? "Generating..." : "Download Word"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
