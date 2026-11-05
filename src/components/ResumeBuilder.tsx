import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, User, Briefcase, GraduationCap, Star, Loader2, Save, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResumeForm } from "./ResumeForm";
import { ResumePreview } from "./ResumePreview";
import { ResumePreviewFrame } from "./ResumePreviewFrame";
import { TemplateSelector } from "./TemplateSelector";
import { DownloadChecklistDialog } from "./DownloadChecklistDialog";
import { MyCvsDialog, SaveVersionDialog } from "./ResumeAccountDialogs";
import { useResumeAccount } from "@/hooks/useResumeAccount";
import { generatePDF, generateWord } from "@/utils/pdfGenerator";
import { safeDownloadFilename, STORAGE_WAIT_MS, withTimeout, type ReadyDownload } from "@/utils/saveFile";
import { storeResumeData } from "@/utils/resumeStorage";
import {
  applyTitleCaseName,
  validateResumeData,
  type ResumeData,
} from "@/utils/resumeRules";
import { SAMPLE_RESUME } from "@/utils/sampleResume";
import {
  createBlankResume,
  isSampleMode,
  readDraft,
  resumeSnapshot,
  type EditorDraft,
} from "@/utils/resumeAccount";
import { isTemplateId } from "@/utils/templates";

function editorStart(): EditorDraft {
  const templateId = templateFromUrl();
  if (isSampleMode()) {
    return { resumeData: SAMPLE_RESUME, templateId, resumeId: null, savedSnapshot: null };
  }
  const blank = createBlankResume();
  return readDraft() ?? {
    resumeData: blank,
    templateId,
    resumeId: null,
    savedSnapshot: resumeSnapshot(blank, templateId),
  };
}

function templateFromUrl(): string {
  if (typeof window === "undefined") return "resumake-classic";
  const template = new URLSearchParams(window.location.search).get("template");
  return template && isTemplateId(template) ? template : "resumake-classic";
}

export type { ResumeData };

export const ResumeBuilder = () => {
  const [start] = useState(editorStart);
  const [resumeData, setResumeData] = useState<ResumeData>(start.resumeData);
  const [selectedTemplate, setSelectedTemplate] = useState(start.templateId);
  const [activeSection, setActiveSection] = useState("personal");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [readyFile, setReadyFile] = useState<ReadyDownload | null>(null);
  const { toast } = useToast();

  const sections = [
    { id: "personal", label: "Personal", icon: User },
    { id: "experience", label: "Experience", icon: Briefcase },
    { id: "education", label: "Education", icon: GraduationCap },
    { id: "skills", label: "Skills", icon: Star },
    { id: "projects", label: "Projects", icon: FileText },
    { id: "achievements", label: "Achievements", icon: Star },
    { id: "awards", label: "Awards", icon: Star },
    { id: "certifications", label: "Certifications", icon: FileText },
    { id: "publications", label: "Publications", icon: FileText },
  ];

  const openChecklist = () => {
    const titled = applyTitleCaseName(resumeData);
    if (titled.personalInfo.fullName !== resumeData.personalInfo.fullName) {
      setResumeData(titled);
    }
    const validation = validateResumeData(titled);
    if (!validation.valid) {
      toast({
        title: "Missing Information",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    setReadyFile(null);
    setChecklistOpen(true);
  };

  const handleDownload = async () => {
    const titled = applyTitleCaseName(resumeData);
    const validation = validateResumeData(titled);
    if (!validation.valid) {
      toast({
        title: "Missing Information",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingPDF(true);
    try {
      const filename = safeDownloadFilename(resumeData.personalInfo.fullName, "pdf");

      let storageError: unknown = null;
      try {
        const stored = await withTimeout(storeResumeData(resumeData, selectedTemplate), STORAGE_WAIT_MS);
        storageError = stored.error;
      } catch {
        storageError = "timeout";
      }
      
      if (storageError) {
        console.error('Failed to store resume data:', storageError);
        // Show error to user but don't block PDF download
        toast({
          title: "Data Storage Warning",
          description: "Resume downloaded successfully, but data storage failed. Please check your connection.",
          variant: "destructive",
        });
      } else {
        console.log('Resume data stored successfully to Supabase');
      }
      
      setReadyFile(await generatePDF("resume-preview", filename));
      
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "There was an error generating your PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownloadWord = async () => {
    const validation = validateResumeData(resumeData);
    if (!validation.valid) {
      toast({
        title: "Missing Information",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
    setIsGeneratingWord(true);
    try {
      const filename = safeDownloadFilename(resumeData.personalInfo.fullName, "docx");
      setReadyFile(await generateWord(resumeData, selectedTemplate, filename));
      toast({
        title: "File ready",
        description: "If the Word file did not save, tap the save button in the checklist.",
      });
    } catch {
      toast({
        title: "Download Failed",
        description: "There was an error generating the Word document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const account = useResumeAccount({
    resumeData,
    setResumeData,
    templateId: selectedTemplate,
    setTemplateId: setSelectedTemplate,
    initialResumeId: start.resumeId,
    initialSavedSnapshot: start.savedSnapshot,
    onDownload: (kind) => {
      if (kind === "pdf") void handleDownload();
      else void handleDownloadWord();
    },
  });

  const accountLabel = account.user?.name || account.user?.email || "Signed in";
  const accountInitials = accountLabel
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "CV";

  return (
    <div 
      className="min-h-screen bg-background"
      style={{ backgroundColor: 'hsl(206 29% 29%)' }}
    >
      
      {/* Header */}
      <header className="border-b bg-gradient-primary text-primary-foreground shadow-elegant">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <img 
                src="/Logo2.jpg" 
                alt="VigyanShaala" 
                className="h-12 w-auto shrink-0"
              />
              <div className="min-w-0">
                <h1 className="text-xl font-bold leading-tight sm:text-2xl">VigyanShaala's Free Professional CV Builder</h1>
                <p className="text-primary-foreground/80 text-sm">
                  Create professional resumes and CVs instantly
                </p>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto" data-testid="header-actions">
            <Button
              type="button"
              onClick={account.saveDraft}
              size="sm"
              variant="secondary"
              className="shrink-0 border border-white/35 bg-white/15 text-white shadow-none hover:bg-white/25 max-lg:min-h-11"
              disabled={!account.ready || account.saving}
              data-testid="header-save-cv"
            >
              {account.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="whitespace-nowrap">{account.saving ? "Saving..." : "Save"}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="shrink-0 bg-white text-[#2c4869] shadow-sm hover:bg-white/90 max-lg:min-h-11"
                  disabled={isGeneratingPDF || isGeneratingWord}
                  data-testid="header-download"
                >
                  {isGeneratingPDF || isGeneratingWord ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Download</span>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" collisionPadding={8} className="min-w-[12rem] bg-white text-gray-900">
                <DropdownMenuItem
                  className="h-12 cursor-pointer gap-2 px-3"
                  data-testid="header-download-pdf"
                  disabled={isGeneratingPDF || isGeneratingWord}
                  onSelect={openChecklist}
                >
                  <Download className="h-4 w-4" />
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="h-12 cursor-pointer gap-2 px-3"
                  data-testid="header-download-word"
                  disabled={isGeneratingPDF || isGeneratingWord}
                  onSelect={openChecklist}
                >
                  <FileText className="h-4 w-4" />
                  Word
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="ml-1 flex items-center" data-testid="header-account">
            {account.ready && !account.user && (
              <Button
                type="button"
                onClick={() => void account.startGoogleSignIn()}
                size="sm"
                variant="secondary"
                className="shrink-0 border border-white/35 bg-white/15 text-white shadow-none hover:bg-white/25 max-lg:min-h-11"
                data-testid="header-google-sign-in"
              >
                <span className="sm:hidden">Sign in</span>
                <span className="hidden sm:inline">Sign in with Google</span>
              </Button>
            )}
            {account.user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="max-w-[14rem] shrink-0 border border-white/35 bg-white/15 text-white shadow-none hover:bg-white/25 max-lg:min-h-11"
                    data-testid="header-account-menu"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/25 text-[11px] font-semibold" aria-hidden="true">{accountInitials}</span>
                    <span className="hidden truncate sm:inline" data-testid="header-account-name">{accountLabel}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" collisionPadding={8} className="min-w-[12rem] bg-white text-gray-900">
                  <DropdownMenuLabel className="truncate font-medium text-gray-900">{accountLabel}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="h-12 cursor-pointer px-3" onSelect={account.openMyCvs}>
                    My CVs
                  </DropdownMenuItem>
                  <DropdownMenuItem className="h-12 cursor-pointer px-3" onSelect={() => account.request({ type: "sign-out" })}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Template Selector */}
        <Card className="mb-6 shadow-card">
          <CardContent className="p-4">
            <TemplateSelector
              selectedTemplate={selectedTemplate}
              onTemplateSelect={setSelectedTemplate}
            />
          </CardContent>
        </Card>

        {/* Main Builder Interface */}
        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <div className="min-w-0 space-y-6">
            {/* Section Navigation */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-2">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <Button
                        key={section.id}
                        variant="default"
                        size="sm"
                        onClick={() => setActiveSection(section.id)}
                        className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{section.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Form */}
            <ResumeForm 
              resumeData={resumeData}
              setResumeData={setResumeData}
              activeSection={activeSection}
              selectedTemplate={selectedTemplate}
            />
          </div>

          {/* Preview Section */}
          <div className="min-w-0 lg:sticky lg:top-8 lg:h-fit">
            <Card className="min-w-0 overflow-hidden shadow-elegant bg-[#2c4869] text-white">
              <CardHeader>
                <CardTitle className="text-white">Preview</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                <ResumePreviewFrame>
                  <div id="resume-preview">
                    <ResumePreview 
                      resumeData={resumeData}
                      template={selectedTemplate}
                    />
                  </div>
                </ResumePreviewFrame>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <DownloadChecklistDialog
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        onDownloadPdf={() => account.request({ type: "download", kind: "pdf" })}
        onDownloadWord={() => account.request({ type: "download", kind: "word" })}
        isGeneratingPDF={isGeneratingPDF}
        isGeneratingWord={isGeneratingWord}
        readyFile={readyFile}
      />
      <SaveVersionDialog
        action={account.prompt}
        signedIn={Boolean(account.user)}
        saving={account.saving}
        onAccept={() => void account.acceptPrompt()}
        onSkip={account.skipPrompt}
        onDismiss={account.dismissPrompt}
      />
      <MyCvsDialog
        open={account.myCvsOpen}
        onOpenChange={account.setMyCvsOpen}
        resumes={account.resumes}
        versions={account.versions}
        loading={account.listLoading}
        selectedResumeId={account.selectedResumeId}
        onSelect={account.selectResume}
        onOpen={(resumeId) => {
          account.setMyCvsOpen(false);
          account.request({ type: "open", resumeId });
        }}
        onNew={() => {
          account.setMyCvsOpen(false);
          account.request({ type: "new" });
        }}
        onRestore={(versionId) => {
          account.setMyCvsOpen(false);
          account.request({ type: "restore", versionId });
        }}
      />
    </div>
  );
};