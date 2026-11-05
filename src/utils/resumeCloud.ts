import { getSupabaseClient } from "@/lib/supabase";
import type { ResumeData } from "@/utils/resumeRules";
import { resumeTitle, saveRecordsVersion, versionSnapshotsMatch } from "@/utils/resumeAccount";

export type SavedResume = {
  id: string;
  title: string;
  template_id: string;
  resume_data: ResumeData;
  updated_at: string;
};

export type SavedResumeSummary = {
  id: string;
  title: string;
  template_id: string;
  updated_at: string;
};

export type SavedVersion = {
  id: string;
  resume_id: string;
  template_id: string;
  resume_data: ResumeData;
  created_at: string;
};

export type SavedVersionSummary = {
  id: string;
  resume_id: string;
  template_id: string;
  created_at: string;
};

function client() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }
  return supabase;
}

function message(error: { message?: string } | null, fallback: string): string {
  return error?.message || fallback;
}

export async function listResumes(): Promise<SavedResumeSummary[]> {
  const { data, error } = await client()
    .from("two_resume_builder_resumes")
    .select("id, title, template_id, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(message(error, "Could not load saved CVs"));
  return data ?? [];
}

export async function getResume(resumeId: string): Promise<SavedResume> {
  const { data, error } = await client()
    .from("two_resume_builder_resumes")
    .select("id, title, template_id, resume_data, updated_at")
    .eq("id", resumeId)
    .single();
  if (error) throw new Error(message(error, "Could not open that CV"));
  return data;
}

export async function listVersions(resumeId: string): Promise<SavedVersionSummary[]> {
  const { data, error } = await client()
    .from("two_resume_builder_versions")
    .select("id, resume_id, template_id, created_at")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(message(error, "Could not load versions"));
  return data ?? [];
}

export async function getVersion(versionId: string): Promise<SavedVersion> {
  const { data, error } = await client()
    .from("two_resume_builder_versions")
    .select("id, resume_id, template_id, resume_data, created_at")
    .eq("id", versionId)
    .single();
  if (error) throw new Error(message(error, "Could not open that version"));
  return data;
}

export async function getLatestResume(): Promise<SavedResume | null> {
  const { data, error } = await client()
    .from("two_resume_builder_resumes")
    .select("id, title, template_id, resume_data, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(message(error, "Could not load your latest CV"));
  return data?.[0] ?? null;
}

async function upsertResume(input: {
  resumeId: string | null;
  templateId: string;
  resumeData: ResumeData;
}): Promise<string> {
  const supabase = client();
  const title = resumeTitle(input.resumeData);
  if (input.resumeId) {
    const { error } = await supabase
      .from("two_resume_builder_resumes")
      .update({
        title,
        template_id: input.templateId,
        resume_data: input.resumeData,
      })
      .eq("id", input.resumeId);
    if (error) throw new Error(message(error, "Could not save this CV"));
    return input.resumeId;
  }
  const { data, error } = await supabase
    .from("two_resume_builder_resumes")
    .insert({
      title,
      template_id: input.templateId,
      resume_data: input.resumeData,
    })
    .select("id")
    .single();
  if (error) throw new Error(message(error, "Could not save this CV"));
  return data.id;
}

export async function saveResumeDraft(input: {
  resumeId: string | null;
  templateId: string;
  resumeData: ResumeData;
}): Promise<string> {
  return upsertResume(input);
}

export async function saveResumeVersion(input: {
  resumeId: string | null;
  templateId: string;
  resumeData: ResumeData;
}): Promise<string> {
  const resumeId = await upsertResume(input);
  const latest = await client()
    .from("two_resume_builder_versions")
    .select("template_id, resume_data")
    .eq("resume_id", resumeId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (latest.error) throw new Error(message(latest.error, "Could not load versions"));
  const row = latest.data?.[0];
  const matchesLatestVersion = Boolean(
    row?.resume_data && versionSnapshotsMatch(input.resumeData, input.templateId, row.resume_data, row.template_id)
  );
  if (!saveRecordsVersion({ source: "explicit-save", changed: true, matchesLatestVersion })) {
    return resumeId;
  }
  const { error: versionError } = await client().from("two_resume_builder_versions").insert({
    resume_id: resumeId,
    template_id: input.templateId,
    resume_data: input.resumeData,
  });
  if (versionError) throw new Error(message(versionError, "Could not save this version"));
  return resumeId;
}
