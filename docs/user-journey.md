# User Journey: Mobile-first CV Builder with Curie review

> Superseded for the student experience by [guided-cv-flow.md](guided-cv-flow.md) (Curie as assignment reviewer, sign-in to submit, download after acceptance). The release plan and data notes below still apply.

Status: DRAFT v1 for discussion. Curie is assumed to work as described; integration comes last.

## Who and where
- Primary user: a student or early-career woman in STEM (VigyanShaala community), building her first CV.
- Primary device: a phone, one-handed, possibly on a slow or intermittent connection.
- Identity: none required in v1. Optional Google sign-in saves work across devices. See the release plan.

## Journey

| # | Stage | What the user does | What the system does |
|---|-------|--------------------|----------------------|
| 1 | Land | Opens the link. Sees what she gets: a CV with feedback. Can optionally sign in with Google to save her work. | Restores an in-progress draft from the browser, or from the account if signed in. |
| 2 | Pick a template | Accepts the default or picks another from a short list. Can change later. | Stores the choice. Preview is not shown yet. |
| 3 | Fill a section | Works through one section at a time (Personal, Education, Experience, Skills, Projects, then optional ones). Sees "Step 3 of 9". Can skip optional sections. | Autosaves the draft on every change. Light inline validation (required fields, formats). |
| 4 | Ask Curie (per section) | Taps "Review with Curie" on a section whenever she wants. | Sends that section to Curie. Shows a clear loading state. |
| 5 | Read feedback | Sees Curie's comment and scores for that section, in plain language, under the section. | Stores the review (version, scores, comment). |
| 6 | Act on feedback | Edits the section, or dismisses a suggestion with a reason. Taps "Review again". | Bumps the review version. Shows what changed since the last round. |
| 7 | Section done | Curie says the section is good, or the user chooses to move on. | Marks the section "reviewed" or "skipped". Progress updates. |
| 8 | Whole-CV check (optional) | Taps "Review my whole CV" for an overall read. | Sends all sections. Shows overall feedback and a ready status. |
| 9 | Preview | Switches to a full-page preview scaled to the phone screen. Can change template here. | Renders the same preview that is used for export. |
| 10 | Download | Taps Download, goes through the existing checklist, and picks PDF or Word. | Generates the file. Stores the final CV and download event. |
| 11 | Return | Comes back later on the same device and continues or re-downloads. | Restores the draft and review history from the stored session. |

## The Curie loop (stages 4 to 7)
`idle -> reviewing -> feedback shown -> user edits or dismisses -> reviewing again -> good enough`

- The user is always in control. Curie suggests, the user decides.
- A section can be reviewed any number of times. Each round is a new version.
- Exit rule (decided): the user can move on at any time, and Curie also shows a "ready" status. Both are shown, and neither blocks the user.

## Failure and edge cases to design for
- Curie is slow or down: the user can keep editing, retry later, and is never blocked from downloading.
- Offline or flaky network: edits stay local, and the review button explains why it is unavailable.
- Empty section: the review button is disabled with a hint.
- User edits during a review: the result is marked "outdated" instead of being applied to new text.
- Very long text: respect Curie's per-field limit of 10,000 characters.

## Data to store (backend, on AWS)
- User: anonymous browser ID, or the Google account ID once signed in (v1). Created and last-seen timestamps.
- Resume draft: all section content, selected template, last-edited time.
- Reviews: trigger ID, section, version, status, scores, comment, and whether each suggestion was accepted or dismissed.
- Events: downloads (PDF or Word, template), review requests.
- v1 keeps Supabase (`src/utils/resumeStorage.ts` today writes to `two_resume_builder_downloads`). AWS replaces it in v2.

## Release plan
| Version | Identity | Database |
|---------|----------|----------|
| v1 | No login required, plus an optional "Sign in with Google" | Supabase (existing) |
| v2 | Same as v1 | Move to AWS |
| v3 | Email plus OTP replaces Google sign-in as the optional login (or sits beside it) | AWS |

### v1 behaviour
- A user can build, review with Curie and download without signing in. Their draft is kept in the browser and, for Curie, an anonymous per-browser ID is used.
- Signing in with Google is optional. It saves the draft and review history to the account, so it follows the user across devices.
- If an anonymous user signs in, their existing draft is attached to the account instead of being lost.
- The ILP is not involved. Users reach the builder by its own URL.

## Decisions
- Curie loop exit: user-controlled plus a Curie "ready" status shown together. Download is never gated.
- Hosting and identity are independent of the ILP.
- v1 storage is Supabase. AWS comes in v2.
- Deletion and retention: out of scope for now.

## Open questions
1. Who owns the Supabase project, and can we get the project URL and keys, and permission to create tables and enable Google auth?
2. Who creates the Google OAuth client (Google Cloud project, consent screen)?
3. Abuse control: with no login, what limit on Curie reviews per anonymous user is acceptable?
4. Where do we host v1 (Render for testing, then AWS in v2)?
5. Does Curie review also run automatically (e.g. when leaving a section), or only on demand? Current decision: on demand.
6. Name and email from a Google account can pre-fill the Personal section. Do we want that?
