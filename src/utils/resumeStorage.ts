import { getSupabaseClient } from '../lib/supabase'

export interface ResumeData {
  personalInfo: {
    fullName: string
    email: string
    phone: string
    location: string
    website?: string
    linkedin?: string
    summary: string
    photo?: string // Base64 encoded image or URL
  }
  experience: Array<{
    id: string
    company: string
    position: string
    location: string
    startDate: string
    endDate: string
    current: boolean
    description: string
    experienceType?: "internship" | "job"
  }>
  education: Array<{
    id: string
    school: string
    degree: string
    field: string
    location: string
    startDate: string
    endDate: string
    current?: boolean
    gpa?: string
    scoreType?: "percentage" | "gpa"
  }>
  skills: Array<{
    id: string
    name: string
    level: string
  }>
  projects?: Array<{
    id: string
    name: string
    description: string
    technologies: string
    date?: string
  }>
  achievements?: Array<{
    id: string
    title: string
    description: string
    date?: string
  }>
  awards?: Array<{
    id: string
    title: string
    issuer: string
    date: string
    description?: string
  }>
  certifications?: Array<{
    id: string
    name: string
    issuer: string
    date: string
    expiryDate?: string
    credentialId?: string
  }>
  publications?: Array<{
    id: string
    title: string
    journal: string
    date: string
    authors?: string
    link?: string
  }>
}

export const storeResumeData = async (resumeData: ResumeData, templateId: string) => {
  // Local development, tests and staging (VITE_RECORD_DOWNLOADS=false) must never write to the live downloads table.
  if (import.meta.env.DEV || import.meta.env.VITE_RECORD_DOWNLOADS === 'false') {
    console.info('Download not recorded in Supabase (development or staging build)')
    return { data: null, error: null }
  }
  try {
    const supabase = getSupabaseClient()
    
    // Check if Supabase is properly configured
    if (!supabase) {
      console.error('Supabase client is not initialized')
      return { data: null, error: 'Supabase client not initialized' }
    }

    console.log('Attempting to store resume data...', {
      fullName: resumeData.personalInfo.fullName,
      email: resumeData.personalInfo.email,
      templateId: templateId
    })

    const { data, error } = await supabase
      .from('two_resume_builder_downloads')
      .insert({
        // Personal Info
        full_name: resumeData.personalInfo.fullName,
        email: resumeData.personalInfo.email,
        phone: resumeData.personalInfo.phone,
        location: resumeData.personalInfo.location,
        website: resumeData.personalInfo.website,
        linkedin: resumeData.personalInfo.linkedin,
        summary: resumeData.personalInfo.summary,
        
        // Template Info
        template_id: templateId,
        
        // Complete resume data as JSON
        resume_data: resumeData,
        
        // Analytics
        download_count: 1,
        last_downloaded: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Supabase error storing resume data:', error)
      return { data: null, error }
    }

    console.log('Resume data stored successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Exception storing resume data:', error)
    return { data: null, error }
  }
}

export const testSupabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('two_resume_builder_downloads')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test exception:', error);
    return false;
  }
};

export const updateDownloadCount = async (resumeId: string) => {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('two_resume_builder_downloads')
      .update({ 
        download_count: supabase.rpc('increment_download_count'),
        last_downloaded: new Date().toISOString()
      })
      .eq('id', resumeId)
      .select()

    if (error) {
      console.error('Error updating download count:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error updating download count:', error)
    return { data: null, error }
  }
}
