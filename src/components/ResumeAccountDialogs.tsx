import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AccountAction } from "@/utils/resumeAccount";
import type { SavedResumeSummary, SavedVersionSummary } from "@/utils/resumeCloud";
import { Loader2 } from "lucide-react";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function promptCopy(action: AccountAction, signedIn: boolean): { title: string; description: string; accept: string; skip: string } {
  if (action.type === "save-draft") {
    return {
      title: "Save this CV?",
      description: "Sign in with Google to keep the work you have done so far. You can come back to this CV later.",
      accept: "Sign in with Google",
      skip: "Not now",
    };
  }
  if (action.type === "save-only") {
    return {
      title: "Save this version?",
      description: "Save this restored CV as a new version? Only the latest 10 versions are kept.",
      accept: "Save",
      skip: "Don't save",
    };
  }
  if (action.type === "download") {
    return signedIn
      ? {
          title: "Save this version?",
          description: "The re-read checklist is done. Save a version as well? Only the latest 10 versions are kept.",
          accept: "Save and download",
          skip: "Download without saving",
        }
      : {
          title: "Save this version?",
          description: "The re-read checklist is done. Sign in with Google to save this version. Only the latest 10 are kept.",
          accept: "Sign in with Google",
          skip: "Download without saving",
        };
  }
  return signedIn
    ? {
        title: "Save this version?",
        description: "Save this version before continuing? Only the latest 10 versions are kept.",
        accept: "Save",
        skip: "Don't save",
      }
    : {
        title: "Save this version?",
        description: "Sign in with Google to save this version before continuing. Only the latest 10 are kept.",
        accept: "Sign in with Google",
        skip: "Continue without saving",
      };
}

export function SaveVersionDialog({
  action,
  signedIn,
  saving,
  onAccept,
  onSkip,
  onDismiss,
}: {
  action: AccountAction | null;
  signedIn: boolean;
  saving: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}) {
  const copy = action ? promptCopy(action, signedIn) : null;
  return (
    <Dialog open={action !== null} onOpenChange={(open) => { if (!open && !saving) onDismiss(); }}>
      <DialogContent overlayClassName="z-[80]" className="z-[80] bg-white text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900">{copy?.title ?? "Save this version?"}</DialogTitle>
          <DialogDescription className="text-gray-600">{copy?.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={onSkip} data-testid="save-prompt-skip">
            {copy?.skip}
          </Button>
          <Button type="button" disabled={saving} onClick={onAccept} data-testid="save-prompt-confirm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{copy?.accept}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MyCvsDialog({
  open,
  onOpenChange,
  resumes,
  versions,
  loading,
  selectedResumeId,
  onSelect,
  onOpen,
  onNew,
  onRestore,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumes: SavedResumeSummary[];
  versions: SavedVersionSummary[];
  loading: boolean;
  selectedResumeId: string | null;
  onSelect: (resumeId: string) => void;
  onOpen: (resumeId: string) => void;
  onNew: () => void;
  onRestore: (versionId: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!bottom-3 !left-3 !right-3 !top-3 !block !h-auto !max-h-none !w-auto !max-w-none !translate-x-0 !translate-y-0 overflow-y-auto bg-white p-4 text-gray-900 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-gray-900">My CVs</DialogTitle>
          <DialogDescription className="text-gray-600">
            Open a saved CV or restore one of its last 10 versions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={onNew}>New CV</Button>
        </div>
        {loading ? (
          <p className="text-sm text-gray-600">Loading saved CVs…</p>
        ) : resumes.length === 0 ? (
          <p className="text-sm text-gray-600">No saved CVs yet. You will be asked to save when you download or switch CVs.</p>
        ) : (
          <div className="space-y-3">
            {resumes.map((resume) => (
              <div key={resume.id} className="rounded-md border border-gray-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" className="text-left" onClick={() => onSelect(resume.id)}>
                    <p className="font-medium text-gray-900">{resume.title}</p>
                    <p className="text-xs text-gray-500">Updated {formatWhen(resume.updated_at)}</p>
                  </button>
                  <Button type="button" size="sm" variant="secondary" onClick={() => onOpen(resume.id)}>Open</Button>
                </div>
                {selectedResumeId === resume.id && (
                  <div className="mt-3 space-y-2">
                    {versions.length === 0 ? (
                      <p className="text-xs text-gray-500">No versions yet.</p>
                    ) : versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-gray-700">{formatWhen(version.created_at)}</span>
                        <Button type="button" size="sm" variant="outline" onClick={() => onRestore(version.id)}>Restore</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
