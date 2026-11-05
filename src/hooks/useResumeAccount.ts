import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  clearDraft,
  clearPending,
  createBlankResume,
  hasOAuthReturn,
  isResumeBlank,
  isSampleMode,
  needsSavePrompt,
  readPending,
  resumeSnapshot,
  saveRecordsVersion,
  versionSaveSource,
  writeDraft,
  writePending,
  type AccountAction,
  type EditorDraft,
} from "@/utils/resumeAccount";
import {
  getLatestResume,
  getResume,
  getVersion,
  listResumes,
  listVersions,
  saveResumeDraft,
  saveResumeVersion,
  type SavedResume,
  type SavedResumeSummary,
  type SavedVersionSummary,
} from "@/utils/resumeCloud";
import { isTemplateId } from "@/utils/templates";
import type { ResumeData } from "@/utils/resumeRules";
import { useCallback, useEffect, useRef, useState } from "react";

type UseResumeAccountArgs = {
  resumeData: ResumeData;
  setResumeData: (data: ResumeData) => void;
  templateId: string;
  setTemplateId: (templateId: string) => void;
  initialResumeId: string | null;
  initialSavedSnapshot: string | null;
  onDownload: (kind: "pdf" | "word") => void;
};

function knownTemplate(templateId: string, fallback: string): string {
  return isTemplateId(templateId) ? templateId : fallback;
}

export function useResumeAccount({
  resumeData,
  setResumeData,
  templateId,
  setTemplateId,
  initialResumeId,
  initialSavedSnapshot,
  onDownload,
}: UseResumeAccountArgs) {
  const { ready, user, signInWithGoogle, signOut } = useAuth();
  const { toast } = useToast();
  const [resumeId, setResumeId] = useState<string | null>(initialResumeId);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(initialSavedSnapshot);
  const [prompt, setPrompt] = useState<AccountAction | null>(null);
  const [saving, setSaving] = useState(false);
  const [myCvsOpen, setMyCvsOpen] = useState(false);
  const [resumes, setResumes] = useState<SavedResumeSummary[]>([]);
  const [versions, setVersions] = useState<SavedVersionSummary[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(initialResumeId);

  const resumeRef = useRef(resumeData);
  const templateRef = useRef(templateId);
  const resumeIdRef = useRef(resumeId);
  const savedSnapshotRef = useRef(savedSnapshot);
  const promptRef = useRef(prompt);
  const userRef = useRef(user);
  const onDownloadRef = useRef(onDownload);
  const skipLeaveRef = useRef(false);
  const ignoreDismissRef = useRef(false);
  const bootRef = useRef(false);

  const holdDismiss = () => {
    ignoreDismissRef.current = true;
    window.setTimeout(() => {
      ignoreDismissRef.current = false;
    }, 500);
  };

  resumeRef.current = resumeData;
  templateRef.current = templateId;
  resumeIdRef.current = resumeId;
  savedSnapshotRef.current = savedSnapshot;
  promptRef.current = prompt;
  userRef.current = user;
  onDownloadRef.current = onDownload;

  const dirty = needsSavePrompt(resumeData, templateId, savedSnapshot);

  const showError = useCallback((error: unknown, title: string) => {
    toast({
      title,
      description: error instanceof Error ? error.message : "Something went wrong",
      variant: "destructive",
    });
  }, [toast]);

  const applySavedResume = useCallback((resume: SavedResume) => {
    const nextTemplate = knownTemplate(resume.template_id, templateRef.current);
    setResumeId(resume.id);
    setResumeData(resume.resume_data);
    setTemplateId(nextTemplate);
    setSavedSnapshot(resumeSnapshot(resume.resume_data, nextTemplate));
    setSelectedResumeId(resume.id);
  }, [setResumeData, setTemplateId]);

  const resetEditor = useCallback(() => {
    const blank = createBlankResume();
    setResumeData(blank);
    setResumeId(null);
    setSavedSnapshot(resumeSnapshot(blank, templateRef.current));
    setSelectedResumeId(null);
  }, [setResumeData]);

  const rememberSave = useCallback((id: string) => {
    setResumeId(id);
    setSelectedResumeId(id);
    setSavedSnapshot(resumeSnapshot(resumeRef.current, templateRef.current));
  }, []);

  const persistDraft = useCallback(async () => {
    const id = await saveResumeDraft({
      resumeId: resumeIdRef.current,
      templateId: templateRef.current,
      resumeData: resumeRef.current,
    });
    rememberSave(id);
    toast({
      title: "CV saved",
      description: "You can come back to this CV later.",
    });
  }, [rememberSave, toast]);

  const persistVersion = useCallback(async () => {
    const id = await saveResumeVersion({
      resumeId: resumeIdRef.current,
      templateId: templateRef.current,
      resumeData: resumeRef.current,
    });
    rememberSave(id);
  }, [rememberSave]);

  const persistForAction = useCallback(async (actionType: AccountAction["type"]) => {
    const writeVersion = saveRecordsVersion({
      source: versionSaveSource(actionType),
      changed: true,
      matchesLatestVersion: false,
    });
    if (writeVersion) await persistVersion();
    else await persistDraft();
  }, [persistDraft, persistVersion]);

  const openResume = useCallback(async (id: string) => {
    applySavedResume(await getResume(id));
  }, [applySavedResume]);

  const applyRestore = useCallback(async (versionId: string) => {
    const version = await getVersion(versionId);
    const parent = await getResume(version.resume_id);
    const parentTemplate = knownTemplate(parent.template_id, templateRef.current);
    const versionTemplate = knownTemplate(version.template_id, parentTemplate);
    const parentSnapshot = resumeSnapshot(parent.resume_data, parentTemplate);
    setResumeId(parent.id);
    setSelectedResumeId(parent.id);
    setSavedSnapshot(parentSnapshot);
    setResumeData(version.resume_data);
    setTemplateId(versionTemplate);
    if (resumeSnapshot(version.resume_data, versionTemplate) !== parentSnapshot) {
      setPrompt({ type: "save-only" });
    }
  }, [setResumeData, setTemplateId]);

  const runAction = useCallback(async (action: AccountAction) => {
    if (action.type === "download") {
      onDownloadRef.current(action.kind);
      return;
    }
    if (action.type === "new") {
      resetEditor();
      return;
    }
    if (action.type === "open") {
      await openResume(action.resumeId);
      return;
    }
    if (action.type === "restore") {
      await applyRestore(action.versionId);
      return;
    }
    if (action.type === "sign-out") {
      await signOut();
      clearDraft();
      resetEditor();
    }
  }, [applyRestore, openResume, resetEditor, signOut]);

  const request = useCallback((action: AccountAction) => {
    if (needsSavePrompt(resumeRef.current, templateRef.current, savedSnapshotRef.current)) {
      setPrompt(action);
      return;
    }
    void runAction(action).catch((error) => showError(error, "Could not continue"));
  }, [runAction, showError]);

  const acceptPrompt = useCallback(async () => {
    const action = promptRef.current;
    if (!action) return;
    holdDismiss();
    if (!userRef.current) {
      writeDraft({
        resumeData: resumeRef.current,
        templateId: templateRef.current,
        resumeId: resumeIdRef.current,
        savedSnapshot: savedSnapshotRef.current,
      });
      writePending({ ...action, saveFirst: true });
      skipLeaveRef.current = true;
      setPrompt(null);
      try {
        await signInWithGoogle();
      } catch (error) {
        skipLeaveRef.current = false;
        clearPending();
        showError(error, "Google sign-in failed");
      }
      return;
    }
    setSaving(true);
    try {
      await persistForAction(action.type);
      setPrompt(null);
      if (action.type !== "save-only" && action.type !== "save-draft") await runAction(action);
    } catch (error) {
      showError(error, action.type === "save-draft" ? "Could not save this CV" : "Could not save this version");
      setPrompt(null);
      if (action.type !== "save-only" && action.type !== "save-draft") {
        await runAction(action).catch((followError) => showError(followError, "Could not continue"));
      }
    } finally {
      setSaving(false);
    }
  }, [persistForAction, runAction, showError, signInWithGoogle]);

  const skipPrompt = useCallback(() => {
    const action = promptRef.current;
    holdDismiss();
    setPrompt(null);
    if (!action || action.type === "save-only") return;
    void runAction(action).catch((error) => showError(error, "Could not continue"));
  }, [runAction, showError]);

  const dismissPrompt = useCallback(() => {
    if (ignoreDismissRef.current) return;
    setPrompt(null);
  }, []);

  useEffect(() => {
    if (isSampleMode()) return;
    const draft: EditorDraft = { resumeData, templateId, resumeId, savedSnapshot };
    writeDraft(draft);
  }, [resumeData, templateId, resumeId, savedSnapshot]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      if (skipLeaveRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  useEffect(() => {
    if (!ready || bootRef.current) return;
    const pending = readPending();
    if (pending?.saveFirst && !user && hasOAuthReturn()) return;

    bootRef.current = true;
    clearPending();
    void (async () => {
      try {
        if (pending?.saveFirst && user) {
          await persistForAction(pending.type);
        }
        if (pending && pending.type !== "save-only" && pending.type !== "save-draft") {
          await runAction(pending);
          return;
        }
        if (user && isResumeBlank(resumeRef.current)) {
          const latest = await getLatestResume();
          if (latest) applySavedResume(latest);
        }
      } catch (error) {
        showError(error, "Could not restore your CV");
      }
    })();
  }, [applySavedResume, persistForAction, ready, runAction, showError, user]);

  useEffect(() => {
    if (!ready || user || !hasOAuthReturn()) return;
    const timer = window.setTimeout(() => {
      if (bootRef.current) return;
      bootRef.current = true;
      clearPending();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [ready, user]);

  const refreshLists = useCallback(async (resumeToShow: string | null) => {
    setListLoading(true);
    try {
      const nextResumes = await listResumes();
      setResumes(nextResumes);
      const versionResumeId = resumeToShow && nextResumes.some((resume) => resume.id === resumeToShow)
        ? resumeToShow
        : nextResumes[0]?.id ?? null;
      setSelectedResumeId(versionResumeId);
      setVersions(versionResumeId ? await listVersions(versionResumeId) : []);
    } catch (error) {
      showError(error, "Could not load saved CVs");
    } finally {
      setListLoading(false);
    }
  }, [showError]);

  const openMyCvs = useCallback(() => {
    setMyCvsOpen(true);
    void refreshLists(resumeIdRef.current);
  }, [refreshLists]);

  const selectResume = useCallback((id: string) => {
    setSelectedResumeId(id);
    void listVersions(id).then(setVersions).catch((error) => showError(error, "Could not load versions"));
  }, [showError]);

  const saveDraft = useCallback(() => {
    if (!ready) return;
    if (isResumeBlank(resumeRef.current)) {
      toast({
        title: "Nothing to save",
        description: "Add some details first.",
      });
      return;
    }
    if (!userRef.current) {
      setPrompt({ type: "save-draft" });
      return;
    }
    const changed = needsSavePrompt(resumeRef.current, templateRef.current, savedSnapshotRef.current);
    if (!saveRecordsVersion({
      source: versionSaveSource("header-save"),
      changed,
      matchesLatestVersion: false,
    })) {
      toast({
        title: "Already saved",
        description: "This CV is already saved.",
      });
      return;
    }
    setSaving(true);
    void persistVersion()
      .then(() => {
        toast({
          title: "CV saved",
          description: "This version is saved. Only the latest 10 are kept.",
        });
      })
      .catch((error) => showError(error, "Could not save this CV"))
      .finally(() => setSaving(false));
  }, [persistVersion, ready, showError, toast]);

  const startGoogleSignIn = useCallback(async () => {
    skipLeaveRef.current = true;
    try {
      await signInWithGoogle();
    } catch (error) {
      skipLeaveRef.current = false;
      showError(error, "Google sign-in failed");
    }
  }, [showError, signInWithGoogle]);

  return {
    ready,
    user,
    dirty,
    prompt,
    saving,
    myCvsOpen,
    setMyCvsOpen,
    resumes,
    versions,
    listLoading,
    selectedResumeId,
    request,
    acceptPrompt,
    skipPrompt,
    dismissPrompt,
    openMyCvs,
    selectResume,
    startGoogleSignIn,
    saveDraft,
  };
}
