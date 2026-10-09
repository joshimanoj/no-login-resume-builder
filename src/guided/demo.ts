import { initialState, type GuidedState } from "./state";
import { promptsToHtml, bulletsToHtml } from "./steps";

/**
 * A complete CV for walking through the flow with every answer filled in (/demo).
 * One project has a single point, so the mock review asks for another attempt
 * and the improve-and-resubmit loop can be tried too.
 */
export function demoState(): GuidedState {
  const s = initialState();
  const exp1 = ["built 5 pages of the company website", "HTML, CSS, JavaScript and Git", "the site went live and enquiries grew by 30% in 2 months"];
  const exp2 = ["cleaned and plotted 10 years of rainfall data for a research group", "Python, Pandas and MS Excel", "my charts were used in the group's report to 3 district offices"];
  const ach = ["volunteered at health camps and cleanliness drives in 4 villages", "worked in a team of 20 NSS volunteers", "completed 120 hours of service and got the NSS certificate"];

  s.data = {
    personalInfo: {
      fullName: "Asha Rao",
      email: "asha.rao@gmail.com",
      phone: "98765 43210",
      location: "Nashik, Maharashtra",
      linkedin: "linkedin.com/in/asharao",
      website: "github.com/asharao",
      summary:
        "<p>I am a 3rd-year B.Sc. Physics student at K.T.H.M. College, Nashik. I am good at web development and Python. I am looking for a software internship.</p>",
      photo: "",
    },
    education: [
      { id: "demo-edu-1", degree: "B.Sc.", field: "Physics", school: "K.T.H.M. College", location: "Nashik", startDate: "2023-07-01", endDate: "", current: true, scoreType: "gpa", gpa: "8.4" },
      { id: "demo-edu-2", degree: "Class 12", field: "Science", school: "Sharada Vidyalaya", location: "Nashik", startDate: "2021-06-01", endDate: "2023-03-01", current: false, scoreType: "percentage", gpa: "82" },
      { id: "demo-edu-3", degree: "Class 10", field: "State board", school: "Sharada Vidyalaya", location: "Nashik", startDate: "2020-06-01", endDate: "2021-03-01", current: false, scoreType: "percentage", gpa: "88" },
    ],
    experience: [
      { id: "demo-exp-1", experienceType: "internship", company: "Ankur Tech Solutions", position: "Web Development Intern", location: "Pune", startDate: "2025-06-01", endDate: "2025-08-01", current: false, description: promptsToHtml(exp1) },
      { id: "demo-exp-2", experienceType: "internship", company: "IISER Pune", position: "Research Intern", location: "Online", startDate: "2024-12-01", endDate: "2025-01-01", current: false, description: promptsToHtml(exp2) },
    ],
    skills: [
      { id: "demo-skill-1", name: "HTML", level: "Advanced" },
      { id: "demo-skill-2", name: "CSS", level: "Advanced" },
      { id: "demo-skill-3", name: "JavaScript", level: "Intermediate" },
      { id: "demo-skill-4", name: "Python", level: "Intermediate" },
      { id: "demo-skill-5", name: "MS Excel", level: "Advanced" },
      { id: "demo-skill-6", name: "Git", level: "Beginner" },
    ],
    projects: [
      { id: "demo-proj-1", name: "College fest website", date: "2025-01-01", technologies: "HTML, CSS", description: bulletsToHtml(["Made a website for the college fest."]) },
      {
        id: "demo-proj-2",
        name: "Nashik rainfall analysis",
        date: "2024-10-01",
        technologies: "Python, MS Excel",
        description: bulletsToHtml(["Analysed 20 years of Nashik rainfall data using Python.", "Showed that monsoon onset moved 9 days later on average."]),
      },
    ],
    achievements: [{ id: "demo-ach-1", title: "NSS volunteer", date: "2025-03-01", description: promptsToHtml(ach) }],
    awards: [
      {
        id: "demo-award-1",
        title: "2nd place, inter-college science quiz",
        issuer: "Savitribai Phule Pune University",
        date: "2024-02-01",
        description: "<p>Placed 2nd out of 40 college teams in a physics and general science quiz.</p>",
      },
    ],
    certifications: [{ id: "demo-cert-1", name: "Programming in Python", issuer: "NPTEL", date: "2025-11-01", expiryDate: "", credentialId: "NPTEL25CS46S1234" }],
    publications: [{ id: "demo-pub-1", title: "Why the sky is blue: a simple explanation", journal: "K.T.H.M. Science Magazine", date: "2024-09-01", authors: "", link: "" }],
  };

  s.prompts = {
    summary: ["3rd-year B.Sc. Physics", "K.T.H.M. College, Nashik", "web development and Python", "a software internship"],
    "demo-exp-1": exp1,
    "demo-exp-2": exp2,
    "demo-ach-1": ach,
  };

  s.answers = {
    "personal.linkedin": true,
    "personal.website": true,
    "optin.experience": true,
    "optin.projects": true,
    "optin.achievements": true,
    "optin.awards": true,
    "optin.certifications": true,
    "optin.publications": true,
    "cert.demo-cert-1.expires": false,
  };
  return s;
}
