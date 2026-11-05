import type { ResumeData } from "@/utils/resumeRules";

const PHOTO =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="#0f766e" width="96" height="96"/><text x="48" y="58" text-anchor="middle" fill="white" font-size="32" font-family="sans-serif">JH</text></svg>`
  );

/** Full-field fixture for layout screenshots. Load with ?sample=1 */
export const SAMPLE_RESUME: ResumeData = {
  personalInfo: {
    fullName: "Jordan Hale",
    email: "jordan.hale@email.com",
    phone: "555-014-8821",
    location: "Austin, TX",
    website: "jordanhale.dev",
    linkedin: "linkedin.com/in/jordanhale",
    summary:
      "<p>Product engineer who ships reliable tools for hiring teams. Focused on clear writing, measurable outcomes, and layouts that stay consistent across templates.</p>",
    photo: PHOTO,
  },
  experience: [
    {
      id: "exp-1",
      company: "Northstar Labs",
      position: "Senior Product Engineer",
      location: "Austin, TX",
      startDate: "2022-03",
      endDate: "",
      current: true,
      description:
        "<ul><li>Led the resume preview system used by 40k monthly applicants.</li><li>Cut export defects 62% by matching PDF, Word, and on-screen layout.</li></ul>",
      experienceType: "job",
    },
    {
      id: "exp-2",
      company: "Harbor Analytics",
      position: "Software Engineer",
      location: "Remote",
      startDate: "2019-06",
      endDate: "2022-02",
      current: false,
      description:
        "<ul><li>Built applicant tracking dashboards for recruiting operations.</li><li>Mentored four engineers through design reviews and launch checklists.</li></ul>",
      experienceType: "job",
    },
    {
      id: "exp-3",
      company: "Brightline Studio",
      position: "Frontend Engineer",
      location: "Dallas, TX",
      startDate: "2017-01",
      endDate: "2019-05",
      current: false,
      description:
        "<ul><li>Shipped design-system components used across three product teams.</li><li>Cut first-contentful paint 28% by splitting the applicant dashboard bundle.</li></ul>",
      experienceType: "job",
    },
  ],
  education: [
    {
      id: "edu-1",
      school: "University of Texas",
      degree: "B.S. Computer Science",
      field: "Human-Computer Interaction",
      location: "Austin, TX",
      startDate: "2015-08",
      endDate: "2019-05",
      current: false,
      gpa: "8.5",
      scoreType: "gpa",
    },
  ],
  skills: [
    { id: "skill-1", name: "TypeScript", level: "Expert" },
    { id: "skill-2", name: "React", level: "Expert" },
    { id: "skill-3", name: "Node.js", level: "Advanced" },
    { id: "skill-4", name: "Product Design", level: "Intermediate" },
    { id: "skill-5", name: "Figma", level: "Advanced" },
    { id: "skill-6", name: "SQL", level: "Intermediate" },
    { id: "skill-7", name: "Python", level: "Advanced" },
    { id: "skill-8", name: "Accessibility", level: "Intermediate" },
  ],
  projects: [
    {
      id: "proj-1",
      name: "Applicant Preview Kit",
      description: "<p>Shared layout helpers so every template uses one heading, one contact row, and one section gap.</p>",
      technologies: "React, TypeScript, CSS",
      date: "2024-11",
    },
    {
      id: "proj-2",
      name: "Hiring Insights Board",
      description: "<p>Live funnel charts so recruiters can see drop-off by stage without exporting a spreadsheet.</p>",
      technologies: "React, Recharts, Postgres",
      date: "2023-06",
    },
  ],
  achievements: [
    {
      id: "ach-1",
      title: "Shipped zero-login builder",
      description: "<p>Launched a public resume tool that stores data locally and exports PDF and Word.</p>",
      date: "2023-09",
    },
  ],
  awards: [
    {
      id: "awd-1",
      title: "Engineering Excellence",
      issuer: "Northstar Labs",
      date: "2024-06",
      description: "<p>Recognized for making preview, PDF, and Word match on every template.</p>",
    },
  ],
  certifications: [
    {
      id: "cert-1",
      name: "AWS Solutions Architect",
      issuer: "Amazon Web Services",
      date: "2023-04",
      expiryDate: "2026-04",
      credentialId: "AWS-SAA-8821",
      description: "<p>Covers VPC design, IAM, and cost controls for production workloads.</p>",
    },
  ],
  publications: [
    {
      id: "pub-1",
      title: "Layout systems that survive eight resume templates",
      journal: "Engineering Practice Review",
      date: "2024-02",
      authors: "Jordan Hale",
      link: "https://jordanhale.dev/layout-systems",
    },
  ],
};
