import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Upload, Image } from "lucide-react";
import { ResumeData } from "./ResumeBuilder";
import { RichTextEditor } from "./RichTextEditor";
import { ParagraphEditor, PointsEditor } from "./PlainTextEditors";
import { PhotoCropDialog } from "./PhotoCropDialog";
import { useRef, useState } from "react";
import { todayIsoDate, toTitleCase } from "@/utils/resumeRules";
import { templateSupportsPhoto } from "@/utils/templates";

interface ResumeFormProps {
  resumeData: ResumeData;
  /** Takes an updater so quick successive changes (e.g. score type, then score) build on each other. */
  setResumeData: (update: (prev: ResumeData) => ResumeData) => void;
  activeSection: string;
  selectedTemplate: string;
  /** Plain boxes instead of the rich-text editor (guided flow): the look decides formatting, students edit words. */
  plainEditors?: boolean;
}

export const ResumeForm = ({ resumeData, setResumeData, activeSection, selectedTemplate, plainEditors = false }: ResumeFormProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  
  const supportsPhoto = templateSupportsPhoto(selectedTemplate);
  
  const updatePersonalInfo = (field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      personalInfo: { ...resumeData.personalInfo, [field]: value }
    }));
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === "string") setCropSrc(result);
    };
    reader.readAsDataURL(file);
  };

  const addExperience = () => {
    const newExperience = {
      id: Date.now().toString(),
      company: "",
      position: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
      experienceType: undefined,
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      experience: [...resumeData.experience, newExperience]
    }));
  };

  const updateExperience = (id: string, field: string, value: string | boolean) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      experience: resumeData.experience.map(exp =>
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const removeExperience = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      experience: resumeData.experience.filter(exp => exp.id !== id)
    }));
  };

  const addEducation = () => {
    const newEducation = {
      id: Date.now().toString(),
      school: "",
      degree: "",
      field: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      gpa: "",
      scoreType: undefined,
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      education: [...resumeData.education, newEducation]
    }));
  };

  const updateEducation = (id: string, field: string, value: string | boolean) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      education: resumeData.education.map(edu =>
        edu.id === id ? { ...edu, [field]: field === "current" ? Boolean(value) : value } : edu
      )
    }));
  };

  const removeEducation = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      education: resumeData.education.filter(edu => edu.id !== id)
    }));
  };

  const addSkill = () => {
    const newSkill = {
      id: Date.now().toString(),
      name: "",
      level: "Intermediate"
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      skills: [...resumeData.skills, newSkill]
    }));
  };

  const updateSkill = (id: string, field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      skills: resumeData.skills.map(skill =>
        skill.id === id ? { ...skill, [field]: value } : skill
      )
    }));
  };

  const removeSkill = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      skills: resumeData.skills.filter(skill => skill.id !== id)
    }));
  };

  const addProject = () => {
    const newProject = {
      id: Date.now().toString(),
      name: "",
      description: "",
      technologies: "",
      link: ""
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      projects: [...(resumeData.projects || []), newProject]
    }));
  };

  const updateProject = (id: string, field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      projects: (resumeData.projects || []).map(project =>
        project.id === id ? { ...project, [field]: value } : project
      )
    }));
  };

  const removeProject = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      projects: (resumeData.projects || []).filter(project => project.id !== id)
    }));
  };

  // Achievement functions
  const addAchievement = () => {
    const newAchievement = {
      id: Date.now().toString(),
      title: "",
      description: "",
      date: ""
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      achievements: [...(resumeData.achievements || []), newAchievement]
    }));
  };

  const updateAchievement = (id: string, field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      achievements: (resumeData.achievements || []).map(achievement =>
        achievement.id === id ? { ...achievement, [field]: value } : achievement
      )
    }));
  };

  const removeAchievement = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      achievements: (resumeData.achievements || []).filter(achievement => achievement.id !== id)
    }));
  };

  // Award functions
  const addAward = () => {
    const newAward = {
      id: Date.now().toString(),
      title: "",
      issuer: "",
      date: "",
      description: ""
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      awards: [...(resumeData.awards || []), newAward]
    }));
  };

  const updateAward = (id: string, field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      awards: (resumeData.awards || []).map(award =>
        award.id === id ? { ...award, [field]: value } : award
      )
    }));
  };

  const removeAward = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      awards: (resumeData.awards || []).filter(award => award.id !== id)
    }));
  };

  // Certification functions
  const addCertification = () => {
    const newCertification = {
      id: Date.now().toString(),
      name: "",
      issuer: "",
      date: "",
      expiryDate: "",
      credentialId: ""
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      certifications: [...(resumeData.certifications || []), newCertification]
    }));
  };

  const updateCertification = (id: string, field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      certifications: (resumeData.certifications || []).map(cert =>
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const removeCertification = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      certifications: (resumeData.certifications || []).filter(cert => cert.id !== id)
    }));
  };

  // Publication functions
  const addPublication = () => {
    const newPublication = {
      id: Date.now().toString(),
      title: "",
      journal: "",
      date: "",
      authors: "",
      link: ""
    };
    setResumeData((resumeData) => ({
      ...resumeData,
      publications: [...(resumeData.publications || []), newPublication]
    }));
  };

  const updatePublication = (id: string, field: string, value: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      publications: (resumeData.publications || []).map(pub =>
        pub.id === id ? { ...pub, [field]: value } : pub
      )
    }));
  };

  const removePublication = (id: string) => {
    setResumeData((resumeData) => ({
      ...resumeData,
      publications: (resumeData.publications || []).filter(pub => pub.id !== id)
    }));
  };

  const renderPersonalInfo = () => (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={resumeData.personalInfo.fullName}
              onChange={(e) => updatePersonalInfo("fullName", e.target.value)}
              onBlur={(e) => updatePersonalInfo("fullName", toTitleCase(e.target.value))}
              placeholder="John Doe"
            />
            <p className="text-xs text-muted-foreground mt-1">Must be Title Case (e.g. John Doe).</p>
          </div>
          <div>
                          <Label htmlFor="email">Email (Registered Id if you have) *</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={resumeData.personalInfo.email}
              onChange={(e) => updatePersonalInfo("email", e.target.value)}
              placeholder="john@example.com"
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={resumeData.personalInfo.phone}
              onChange={(e) => updatePersonalInfo("phone", e.target.value)}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div>
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={resumeData.personalInfo.location}
              onChange={(e) => updatePersonalInfo("location", e.target.value)}
              placeholder="New York, NY"
            />
          </div>
          <div>
            <Label htmlFor="website">Website (Optional)</Label>
            <Input
              id="website"
              inputMode="url"
              autoCapitalize="none"
              value={resumeData.personalInfo.website}
              onChange={(e) => updatePersonalInfo("website", e.target.value)}
              placeholder="https://johndoe.com"
            />
          </div>
          <div>
            <Label htmlFor="linkedin">LinkedIn (Optional)</Label>
            <Input
              id="linkedin"
              inputMode="url"
              autoCapitalize="none"
              value={resumeData.personalInfo.linkedin}
              onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/johndoe"
            />
          </div>
        </div>
        <div>
          {plainEditors ? (
            <ParagraphEditor
              key="summary"
              label="Professional Summary *"
              value={resumeData.personalInfo.summary}
              onChange={(value) => updatePersonalInfo("summary", value)}
              placeholder="Brief professional summary highlighting your key achievements and skills..."
            />
          ) : (
            <RichTextEditor
              label="Professional Summary *"
              value={resumeData.personalInfo.summary}
              onChange={(value) => updatePersonalInfo("summary", value)}
              placeholder="Brief professional summary highlighting your key achievements and skills..."
              height="250px"
            />
          )}
        </div>
        {supportsPhoto && (
          <div>
            <Label>Profile Photo (Optional)</Label>
            <div className="flex items-center space-x-4">
              <Button
                type="button"
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center space-x-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Upload className="h-4 w-4" />
                <span>Upload Photo</span>
              </Button>
              {resumeData.personalInfo.photo && (
                <div className="flex items-center space-x-2">
                  <img
                    src={resumeData.personalInfo.photo}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updatePersonalInfo("photo", "")}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderExperience = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Work Experience</CardTitle>
        <Button onClick={addExperience} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Experience</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {resumeData.experience.map((exp) => (
          <div key={exp.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Experience Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeExperience(exp.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Experience type *</Label>
                <Select
                  value={exp.experienceType}
                  onValueChange={(value) => updateExperience(exp.id, "experienceType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Internship or Job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="job">Job</SelectItem>
                  </SelectContent>
                </Select>
                {exp.experienceType === "job" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Job dates cannot overlap with education dates.
                  </p>
                )}
              </div>
              <div>
                <Label>Company</Label>
                <Input
                  value={exp.company}
                  onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                  placeholder="Company Name"
                />
              </div>
              <div>
                <Label>Position</Label>
                <Input
                  value={exp.position}
                  onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
                  placeholder="Job Title"
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={exp.location}
                  onChange={(e) => updateExperience(exp.id, "location", e.target.value)}
                  placeholder="City, State"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`current-${exp.id}`}
                  checked={exp.current}
                  onCheckedChange={(checked) => updateExperience(exp.id, "current", checked as boolean)}
                />
                <Label htmlFor={`current-${exp.id}`}>Currently working here</Label>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  max={todayIsoDate()}
                  value={exp.startDate}
                  onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                />
              </div>
              {!exp.current && (
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    max={todayIsoDate()}
                    value={exp.endDate}
                    onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                  />
                </div>
              )}
            </div>
            <div>
              {plainEditors ? (
                <PointsEditor
                  key={exp.id}
                  label="Description"
                  value={exp.description}
                  onChange={(value) => updateExperience(exp.id, "description", value)}
                  placeholder="Describe your responsibilities and achievements..."
                />
              ) : (
                <RichTextEditor
                  label="Description"
                  value={exp.description}
                  onChange={(value) => updateExperience(exp.id, "description", value)}
                  placeholder="Describe your responsibilities and achievements..."
                  height="200px"
                />
              )}
            </div>
          </div>
        ))}
        {resumeData.experience.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No work experience added yet.</p>
            <p className="text-sm">Click "Add Experience" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderEducation = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Education</CardTitle>
        <Button onClick={addEducation} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Education</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {resumeData.education.map((edu) => (
          <div key={edu.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Education Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeEducation(edu.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>School/University</Label>
                <Input
                  value={edu.school}
                  onChange={(e) => updateEducation(edu.id, "school", e.target.value)}
                  placeholder="University Name"
                />
              </div>
              <div>
                <Label>Degree</Label>
                <Input
                  value={edu.degree}
                  onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                  placeholder="Bachelor's, Master's, etc."
                />
              </div>
              <div>
                <Label>Field of Study</Label>
                <Input
                  value={edu.field}
                  onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                  placeholder="Computer Science, Business, etc."
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input
                  value={edu.location}
                  onChange={(e) => updateEducation(edu.id, "location", e.target.value)}
                  placeholder="City, State"
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={edu.startDate}
                  onChange={(e) => updateEducation(edu.id, "startDate", e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={edu.endDate}
                  onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)}
                  disabled={edu.current}
                />
              </div>
              <div className="flex items-center space-x-2 md:col-span-2">
                <Checkbox
                  id={`edu-current-${edu.id}`}
                  checked={Boolean(edu.current)}
                  onCheckedChange={(checked) => updateEducation(edu.id, "current", checked === true)}
                />
                <Label htmlFor={`edu-current-${edu.id}`} className="text-sm font-normal cursor-pointer">
                  Currently studying here / Ongoing
                </Label>
              </div>
              <div>
                <Label>Score type</Label>
                <Select
                  value={edu.scoreType}
                  onValueChange={(value) => updateEducation(edu.id, "scoreType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Percentage or GPA (out of 10)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="gpa">GPA (out of 10)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>
                  {edu.scoreType === "percentage"
                    ? "Percentage"
                    : edu.scoreType === "gpa"
                      ? "GPA (out of 10)"
                      : "Score (optional)"}
                </Label>
                <Input
                  value={edu.gpa}
                  onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
                  placeholder={edu.scoreType === "percentage" ? "85" : "8.5"}
                />
                {edu.scoreType === "gpa" && (
                  <p className="text-xs text-muted-foreground mt-1">Must be a number from 0 to 10.</p>
                )}
              </div>
            </div>
          </div>
        ))}
        {resumeData.education.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No education added yet.</p>
            <p className="text-sm">Click "Add Education" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSkills = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Skills *</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Write one skill in a box, mark its proficiency, then click Add Skill to add another. At least 2 skills are required.
          </p>
        </div>
        <Button onClick={addSkill} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Skill</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {resumeData.skills.map((skill) => (
          <div key={skill.id} className="flex items-center space-x-4 p-3 border rounded-lg">
            <div className="flex-1">
              <Input
                value={skill.name}
                onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
                placeholder="Skill name (e.g., JavaScript, Project Management)"
              />
            </div>
            <div className="w-40">
              <Select
                value={skill.level}
                onValueChange={(value) => updateSkill(skill.id, "level", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Intermediate">Intermediate</SelectItem>
                  <SelectItem value="Advanced">Advanced</SelectItem>
                  <SelectItem value="Expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => removeSkill(skill.id)}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {resumeData.skills.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No skills added yet. Add at least 2 skills.</p>
            <p className="text-sm">Click "Add Skill" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderProjects = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Projects</CardTitle>
        <Button onClick={addProject} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(resumeData.projects || []).map((project) => (
          <div key={project.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Project Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeProject(project.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Project Name</Label>
                <Input
                  value={project.name}
                  onChange={(e) => updateProject(project.id, "name", e.target.value)}
                  placeholder="Project Name"
                />
              </div>
              <div>
                <Label>Project Date (Optional)</Label>
                <Input
                  type="date"
                  value={project.date}
                  onChange={(e) => updateProject(project.id, "date", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Skills and Technologies Used</Label>
                <Input
                  value={project.technologies}
                  onChange={(e) => updateProject(project.id, "technologies", e.target.value)}
                  placeholder="React, Node.js, MongoDB, etc."
                />
              </div>
            </div>
            <div>
              {plainEditors ? (
                <PointsEditor
                  key={project.id}
                  label="Description"
                  value={project.description}
                  onChange={(value) => updateProject(project.id, "description", value)}
                  placeholder="Describe the project, your role, and key achievements..."
                />
              ) : (
                <RichTextEditor
                  label="Description"
                  value={project.description}
                  onChange={(value) => updateProject(project.id, "description", value)}
                  placeholder="Describe the project, your role, and key achievements..."
                  height="200px"
                />
              )}
            </div>
          </div>
        ))}
        {(resumeData.projects || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No projects added yet.</p>
            <p className="text-sm">Click "Add Project" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAchievements = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Achievements</CardTitle>
        <Button onClick={addAchievement} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Achievement</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(resumeData.achievements || []).map((achievement) => (
          <div key={achievement.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Achievement Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeAchievement(achievement.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Achievement Title</Label>
                <Input
                  value={achievement.title}
                  onChange={(e) => updateAchievement(achievement.id, "title", e.target.value)}
                  placeholder="Achievement Title"
                />
              </div>
              <div>
                <Label>Date (Optional)</Label>
                <Input
                  type="date"
                  value={achievement.date}
                  onChange={(e) => updateAchievement(achievement.id, "date", e.target.value)}
                />
              </div>
            </div>
            <div>
              {plainEditors ? (
                <PointsEditor
                  key={achievement.id}
                  label="Description"
                  value={achievement.description}
                  onChange={(value) => updateAchievement(achievement.id, "description", value)}
                  placeholder="Describe your achievement..."
                />
              ) : (
                <RichTextEditor
                  label="Description"
                  value={achievement.description}
                  onChange={(value) => updateAchievement(achievement.id, "description", value)}
                  placeholder="Describe your achievement..."
                  height="200px"
                />
              )}
            </div>
          </div>
        ))}
        {(resumeData.achievements || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No achievements added yet.</p>
            <p className="text-sm">Click "Add Achievement" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAwards = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Awards</CardTitle>
        <Button onClick={addAward} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Award</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(resumeData.awards || []).map((award) => (
          <div key={award.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Award Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeAward(award.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Award Title *</Label>
                <Input
                  value={award.title}
                  onChange={(e) => updateAward(award.id, "title", e.target.value)}
                  placeholder="Award Title"
                />
              </div>
              <div>
                <Label>Issuer/Organization *</Label>
                <Input
                  value={award.issuer}
                  onChange={(e) => updateAward(award.id, "issuer", e.target.value)}
                  placeholder="Organization Name"
                />
              </div>
              <div>
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={award.date}
                  onChange={(e) => updateAward(award.id, "date", e.target.value)}
                />
              </div>
            </div>
            <div>
              {plainEditors ? (
                <ParagraphEditor
                  key={award.id}
                  label="Description *"
                  value={award.description || ""}
                  onChange={(value) => updateAward(award.id, "description", value)}
                  placeholder="Describe the award and your achievement..."
                />
              ) : (
                <RichTextEditor
                  label="Description *"
                  value={award.description || ""}
                  onChange={(value) => updateAward(award.id, "description", value)}
                  placeholder="Describe the award and your achievement..."
                  height="200px"
                />
              )}
            </div>
          </div>
        ))}
        {(resumeData.awards || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No awards added yet.</p>
            <p className="text-sm">Click "Add Award" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderCertifications = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Courses & Certifications</CardTitle>
        <Button onClick={addCertification} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Certification</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(resumeData.certifications || []).map((cert) => (
          <div key={cert.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Certification Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeCertification(cert.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Certification/Course Name</Label>
                <Input
                  value={cert.name}
                  onChange={(e) => updateCertification(cert.id, "name", e.target.value)}
                  placeholder="Certification Name"
                />
              </div>
              <div>
                <Label>Issuer/Institution</Label>
                <Input
                  value={cert.issuer}
                  onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)}
                  placeholder="Institution Name"
                />
              </div>
              <div>
                <Label>Issue Date</Label>
                <Input
                  type="date"
                  value={cert.date}
                  onChange={(e) => updateCertification(cert.id, "date", e.target.value)}
                />
              </div>
              <div>
                <Label>Expiry Date (Optional)</Label>
                <Input
                  type="date"
                  value={cert.expiryDate}
                  onChange={(e) => updateCertification(cert.id, "expiryDate", e.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Credential ID (Optional)</Label>
                <Input
                  value={cert.credentialId}
                  onChange={(e) => updateCertification(cert.id, "credentialId", e.target.value)}
                  placeholder="Credential ID or Certificate Number"
                />
              </div>
            </div>
          </div>
        ))}
        {(resumeData.certifications || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No certifications added yet.</p>
            <p className="text-sm">Click "Add Certification" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPublications = () => (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Publications</CardTitle>
        <Button onClick={addPublication} size="sm" className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <span>Add Publication</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {(resumeData.publications || []).map((pub) => (
          <div key={pub.id} className="p-4 border rounded-lg space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Publication Entry</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removePublication(pub.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Publication Title</Label>
                <Input
                  value={pub.title}
                  onChange={(e) => updatePublication(pub.id, "title", e.target.value)}
                  placeholder="Publication Title"
                />
              </div>
              <div>
                <Label>Journal/Conference</Label>
                <Input
                  value={pub.journal}
                  onChange={(e) => updatePublication(pub.id, "journal", e.target.value)}
                  placeholder="Journal or Conference Name"
                />
              </div>
              <div>
                <Label>Publication Date</Label>
                <Input
                  type="date"
                  value={pub.date}
                  onChange={(e) => updatePublication(pub.id, "date", e.target.value)}
                />
              </div>
              <div>
                <Label>Authors (Optional)</Label>
                <Input
                  value={pub.authors}
                  onChange={(e) => updatePublication(pub.id, "authors", e.target.value)}
                  placeholder="Author names"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Publication Link (Optional)</Label>
                <Input
                  value={pub.link}
                  onChange={(e) => updatePublication(pub.id, "link", e.target.value)}
                  placeholder="https://doi.org/..."
                />
              </div>
            </div>
          </div>
        ))}
        {(resumeData.publications || []).length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No publications added yet.</p>
            <p className="text-sm">Click "Add Publication" to get started.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const sectionComponents = {
    personal: renderPersonalInfo,
    experience: renderExperience,
    education: renderEducation,
    skills: renderSkills,
    projects: renderProjects,
    achievements: renderAchievements,
    awards: renderAwards,
    certifications: renderCertifications,
    publications: renderPublications,
  };

  const CurrentSection = sectionComponents[activeSection as keyof typeof sectionComponents];

  return (
    <div className="animate-fade-in">
      {CurrentSection()}
      <PhotoCropDialog
        imageSrc={cropSrc}
        open={cropSrc !== null}
        onOpenChange={(open) => {
          if (!open) setCropSrc(null);
        }}
        onConfirm={(dataUrl) => {
          updatePersonalInfo("photo", dataUrl);
          setCropSrc(null);
        }}
      />
    </div>
  );
};
