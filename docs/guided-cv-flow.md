# Guided CV flow (design spec, draft v5)

Audience: girl students in years 1 to 4 of graduation, from tier 3 and 4 cities. First CV, mostly on low-end Android phones in a mobile browser, often writing in a second language.

Goal: a simple interface that produces a detailed, competitive CV. The guidance is simple; the CV is not. The current builder's 9 sections, names and every field are kept, with no caps on the number of entries.

Curie's role (corrected brief): Curie reviews the finished CV as an assignment submission. Curie does not write or rewrite anything. The review gives an Accept / Reject verdict, an overall star rating, overall feedback, and feedback for each section. If rejected, the student improves the CV and submits again.

## Principles
1. One question per screen, with one big button. Short related fields (e.g. Class 12 board and school name) may share one screen.
2. Everyday words in questions and hints. Section names stay as they are today (Personal Information, Education, Work Experience and so on).
3. Tap before typing. Offer common answers as big options; typing is the fallback.
4. Optional sections start with a Yes / No question. "No" skips them, and empty sections never appear on the CV. "Skip for now" is always available.
5. She writes in her own words. Prompts, examples and sentence starters help her write well; nothing is written for her.
6. Encouraging tone. Rule problems are shown as friendly next steps, never as red errors.
7. The look of the CV (template) is chosen at the end, on her real CV.
8. It's a mobile web page: every question has its own URL, so the phone's Back button works. One main button per screen, which sticks to the bottom when the content is long (and sits above the keyboard on Android).
11. Progress: a bar with one segment per section. Finished sections are full, and the current one fills as she answers its questions.
9. Depth without clutter: the guided flow collects everything, and "Edit everything" shows every field, section by section.
10. English only (decided). The CV is written in English. Questions and hints are in simple English. If she types in another script (e.g. Devanagari), a gentle note asks her to write it in English.

## The flow

The guided flow keeps the current builder's 9 sections, their names and every field (`src/components/ResumeForm.tsx`). Only the way each field is asked changes. "Req" means the current `validateResumeData` (`src/utils/resumeRules.ts`) requires it.

Order change from today (decided): Education is second, before Work Experience, because most students have more to say about their studies.

Each section starts with a one-line intro screen and ends with a section check (required rules only, see Section checks). Repeating sections loop with "Add another?" and have no fixed limit.

### 0. Welcome
- First visit: "Build your CV in 9 short sections. When you're done, Curie will review it and tell you how to make it better." "Let's start", or "Sign in with Google to save your CV" for students who want to continue on another device. Building works without signing in; signing in is required to submit (see Submission and review).
- Returning visit: shows where she is. "You've finished 4 of 9 sections", or "Curie is reviewing your CV", or "Your review is ready".

### 1. Personal Information -> `personalInfo`
| Current field | Req | Guided question |
|---|---|---|
| Full Name | Yes, Title Case | "What's your full name?" Auto Title Case. |
| Email (Registered Id if you have) | Yes | "Your email. Use the one registered with VigyanShaala if you have it." Email keyboard. |
| Phone | Yes | "Your phone number." Phone keypad. |
| Location | Yes | "Which city or town do you live in?" |
| LinkedIn (Optional) | No | "Do you have a LinkedIn profile?" Yes / No, then link. |
| Website (Optional) | No | "Do you have a website, portfolio or GitHub?" Yes / No, then link. |
| Professional Summary (rich text) | Yes | Written by her, last in this section, with help: three sentence starters she completes ("I am a ___ student at ___.", "I am good at ___.", "I am looking for ___."), an example summary, and a note that she can come back to improve it once the rest of the CV is done. |
| Profile Photo (Optional, photo templates only) | No | Not asked here. Asked only when she picks a look with a photo (see Your CV), as today. |

### 2. Education -> `education[]` (any number)
Intro: "Start with what you're studying now. Then Class 12 and Class 10." (Class 10 and 12 are expected for Bachelor's students.)
| Current field | Req | Guided question |
|---|---|---|
| Degree | Yes | Options: B.Sc., B.Com, B.A., B.Tech, BCA, BBA, Diploma, Class 12, Class 10, Something else. |
| Field of Study | Yes | Options based on degree (e.g. Physics, Chemistry for B.Sc.; Science, Commerce, Arts for Class 12), or type. |
| School/University | Yes | "College or school name." (For Class 10 and 12, shares a screen with Board.) |
| Location | Yes | "Which city?" |
| Start Date | Yes | Date picker. |
| Currently studying here / Ongoing | | "Are you still studying here?" Yes / No. |
| End Date | Yes unless ongoing | Date picker, only if not ongoing. |
| Score type | Yes if a score is given | "How are your marks shown?" Percentage / GPA (out of 10), or "I don't have marks yet". |
| Score | Yes if a type is chosen | Number. Percentage 0 to 100, GPA above 0 and at most 10, checked as she types. |
Then "Add another? (Class 12, Class 10, a diploma, another degree)".

### 3. Work Experience -> `experience[]` (any number)
Intro: "Have you done an internship or a job?" with the hint "Part-time work, tuition teaching, family business and freelance work count too." No skips the section.
| Current field | Req | Guided question |
|---|---|---|
| Experience type | Yes | "Was it an internship or a job?" Two big options. |
| Company | Yes | "Where?" |
| Position | Yes | "What was your role?" |
| Location | Yes | "Which city?" or "It was online". |
| Start Date | Yes, not in future | Date picker, future dates blocked. |
| Currently working here | | "Are you still doing it?" Yes / No. |
| End Date | Yes unless current, not in future | Date picker, only if not current. |
| Description (rich text) | No | Detail prompts (below). |
For a job, the overlap rule with education dates is kept, shown gently: "These dates overlap with your studies. If this was during college, choose Internship."

### 4. Skills -> `skills[]` (any number, at least 2)
| Current field | Req | Guided question |
|---|---|---|
| Skill name | At least 2 | Chips: tools she listed in Work Experience and Projects, common skills for her field of study, plus "Add your own". One skill per chip, as today. |
| Proficiency | Yes per skill | One screen: each skill with Beginner / Intermediate / Advanced / Expert as four taps. |

### 5. Projects -> `projects[]` (any number, optional)
Intro: "Have you made or worked on a project? College, home, competition or research all count."
| Current field | Req | Guided question |
|---|---|---|
| Project Name | | "What was it called?" |
| Project Date (Optional) | No | Date picker, with "Skip". |
| Skills and Technologies Used | | "What did you use?" Chips plus "Add your own". Also suggested in Skills. |
| Description (rich text) | | Detail prompts (below). |

### 6. Achievements -> `achievements[]` (any number, optional)
Intro: "Have you achieved something you're proud of? Competitions, olympiads, hackathons, ranks, leadership roles, NSS, NCC, sports, volunteering."
| Current field | Req | Guided question |
|---|---|---|
| Achievement Title | | "What was it?" |
| Date (Optional) | No | Date picker, with "Skip". |
| Description (rich text) | | Detail prompts (below). |

### 7. Awards -> `awards[]` (any number, optional)
Intro: "Have you won an award or prize?"
| Current field | Req | Guided question |
|---|---|---|
| Award Title | Yes | "What was the award?" |
| Issuer/Organization | Yes | "Who gave it?" |
| Date | Yes | Date picker. |
| Description (rich text) | Yes | "What was it for?" One box, with an example. |

### 8. Courses & Certifications -> `certifications[]` (any number, optional)
Intro: "Have you done any course or got a certificate? Online courses count."
| Current field | Req | Guided question |
|---|---|---|
| Certification/Course Name | Yes | "What was the course called?" |
| Issuer/Institution | Yes | Options: NPTEL, Coursera, Google, Your college, Other. |
| Issue Date | Yes | Date picker. |
| Expiry Date (Optional) | No | "Does it expire?" No / Yes, then date. |
| Credential ID (Optional) | No | "Certificate ID or number", with "Skip". |

### 9. Publications -> `publications[]` (any number, optional)
Intro: "Have you written a paper or article that was published?"
| Current field | Req | Guided question |
|---|---|---|
| Publication Title | | "What's the title?" |
| Journal/Conference | | "Where was it published?" |
| Publication Date | | Date picker. |
| Authors (Optional) | No | "Who wrote it with you?", with "Only me". |
| Publication Link (Optional) | No | "Link to it", with "Skip". |

### After section 9: Your CV
- Full CV preview. Tap any part to jump back to that question.
- "Edit everything": the 9 sections with every field, for fine-tuning, reordering and deleting.
- "Submit to Curie for review" (main button). See Submission and review.
- "Choose a look" is the last step of the build, right after section 9, and can be changed any time from Your CV except during a review. The look does not affect Curie's review. Download unlocks once Curie accepts the CV (decided).

## Detail prompts (for every description)
The "Tell me about it" screen shows three short boxes, each optional, with an example under each:
1. What did you do?
2. What did you use? (tools, software, methods, people you worked with)
3. What happened because of it? (the result, numbers if you know them)

Each filled box becomes one bullet point in the description, in her words, with a capital letter and full stop added. She sees the bullets on the next screen and can edit them, or add more bullets. Tips under the boxes: "Start with an action word: made, built, taught, organised, found."

## Section checks (replace the download checklist)
Decided: the download checklist (`DOWNLOAD_CHECKLIST`) is removed. Each section ends with a short check of the required rules from `validateResumeData`. Each problem is shown in friendly words with a button that goes straight to the question, e.g. "Class 10 is missing. Add it."
- Personal Information: name (Title Case, auto-fixed), email, phone, location, Professional Summary.
- Education: school, degree, field, location, start date, end date or ongoing; score type and score together; GPA above 0 and at most 10, percentage 0 to 100; Class 10 and 12 present for Bachelor's students.
- Work Experience: type, company, position, location, start date, end date or current; no future dates; job dates don't overlap education.
- Skills: at least 2, one per box, each with a proficiency.
- Awards: title, issuer, date, description.
- Courses & Certifications: name, issuer, issue date.

Most rules are also checked while she answers, so the check is usually a quick "Looks good" screen. "Fix later" is allowed, but every section must pass before she can submit to Curie.

## Submission and review
1. Submit. On Your CV, "Submit to Curie for review". Enabled once every section check passes; otherwise it takes her to the first section that needs something. Sign-in is required to submit (decided): if she isn't signed in, she's asked to sign in with Google first, and her CV so far is attached to her account. A confirmation screen shows what happens next, including attempts left ("Attempt 1 of 10"): "Curie will read your whole CV and give you a review. This usually takes about N minutes."
2. Waiting. "Curie is reviewing your CV." She can close the page. When she comes back on any device, signed in, the welcome screen shows the review status. The CV is read-only while under review, so the review matches what she submitted.
3. Review. One screen with:
   - Verdict: Accepted, or Needs another attempt.
   - Overall star rating (out of 5).
   - Overall feedback (Curie's paragraph).
   - Section-wise feedback: one card per section, in CV order, each with Curie's comment and a status (Good, or Needs work). Sections that need work come first and have an "Improve this section" button.
   - Attempt number ("Attempt 1 of 10").
4. Reattempt (if not accepted). "Improve this section" opens that section with Curie's feedback pinned at the top, so she can read it while editing. Section checks run again. Sections she has improved are ticked on the review screen. When ready: "Submit again" (attempt 2).
5. Accepted. A celebration screen with the stars and overall feedback, then Choose a look, then Download. Download is available only after acceptance (decided). After acceptance she can still change the look and download again; changing the content means a new submission.

Attempts (decided): up to 10, like any other assignment. Remaining attempts are shown on the submit screen and the review screen. From attempt 8, a gentle note says how many are left.

Past attempts stay visible ("Attempt 1: Needs another attempt, 3 stars") so she can see her progress.

## Other features
- Autosave after every answer, on the phone (and to the account if signed in).
- Back goes to the previous question. Answers are kept.
- Every item can be reordered, edited, or deleted from "Edit everything".
- Light pages that work on a slow connection.

## CURIE integration
This matches the existing CURIE assessment-review API (`POST /api/v1/assessment-reviews/`, status via `GET /api/v1/assessment-reviews/{trigger_id}/`). No new Curie writing capabilities are needed.

| Our concept | CURIE field |
|---|---|
| One CV | `submission_id` (stable per CV) |
| Attempt number | `submission_version_number` |
| Each of the 9 sections | One entry in `form_data`, keyed by a stable section ID (e.g. `personal`, `education`), with `label` = section name and `answer` = the section as plain text |
| Section-wise feedback | `field_feedback[]`, matched by `field_id` to the section ID (`comment`, `criterion_scores`) |
| Overall feedback | `overall_feedback` |
| Verdict | Derived from `gate_criterion_scores` (rule to agree with CURIE) |
| Star rating | Derived from the criterion scores (rule to agree with CURIE) |
| Student | `user_id` (Google account ID; sign-in is required to submit) |

To request from the CURIE team:
1. Our own shared secret (not the TAS one).
2. A new `origin` value for this app (the schema only accepts `"tas"` today).
3. A resume `assignment_type` with a rubric: gate criteria that decide Accept / Reject, and per-section criteria, keyed to our 9 section IDs.
4. An explicit verdict and star rating in the response, or an agreed rule for deriving them from the scores.
5. Values to use for `assignment_id`, `course_id` and `usage_key`.
6. Callback: we would rather poll the status endpoint. Can `callback_url` be optional?
7. Typical review time, so we can set expectations in the waiting screen.

## Mapping to the current app
- Every field of the existing `ResumeData` (`src/utils/resumeRules.ts`) and every field in `ResumeForm.tsx` is collected; see the tables above. Preview, templates, PDF and Word export keep working unchanged.
- New data: submissions (attempt number, the CV as submitted, status, review result) per CV, tied to the signed-in user.
- Download moves behind acceptance, so the current header Download buttons are replaced by Download on the accepted screen and on Your CV after acceptance.

## Decisions log
- Curie reviews the CV as an assignment submission; she does not write.
- Download only after Curie accepts.
- Up to 10 attempts.
- Sign-in with Google is required to submit. Building does not need sign-in.
- The CV is in English only.
- Education is second, before Work Experience.
- The download checklist is replaced by section checks.
- No languages field.

## Open questions
1. What happens if the 10th attempt is not accepted? (For example: the CV stays as is with its last review, and a mentor at VigyanShaala is contacted, or attempts reset after a cool-off.)
