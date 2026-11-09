import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

// Never touch the live Supabase project from tests: use the mock backend and block Supabase calls.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("guided-mock-backend", "1"));
  await page.route(/supabase\.co/, (route) => route.fulfill({ status: 201, contentType: "application/json", body: "[]" }));
});

// "Save" when the question was opened from a section overview.
const next = (page: Page) => page.getByRole("button", { name: /^(Next|Save)$/ }).click();
const tap = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();

async function answer(page: Page, text: string) {
  await page.getByRole("textbox").fill(text);
  await next(page);
}

/** The demo CV as a returning student sees it: home says "Welcome back" and lists the sections. */
async function returningStudent(page: Page) {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("guided-cv-v1") ?? "{}");
    localStorage.setItem("guided-cv-v1", JSON.stringify({ ...saved, lastStep: "publications.check" }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Asha!" })).toBeVisible();
}

/** Enters "2023-07" the way a student would: picks the month, types the year. */
async function month(page: Page, value: string) {
  const [year, mm] = value.split("-");
  await page.getByRole("combobox", { name: "Month" }).selectOption(mm);
  await page.getByRole("textbox", { name: "Year" }).fill(year);
  await next(page);
}

async function school(page: Page, opts: { degree: string; field: string; name: string; start: string; end: string; percent: string }) {
  await tap(page, opts.degree);
  await tap(page, opts.field);
  await answer(page, opts.name);
  await answer(page, "Nashik");
  await month(page, opts.start);
  await tap(page, "No");
  await month(page, opts.end);
  await tap(page, "Percentage");
  await answer(page, opts.percent);
}

test("a student builds a full CV, gets a review, improves it and downloads", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");

  await tap(page, "Let's start without signing in");

  // 1. Personal Information
  await tap(page, "Start this section");
  await answer(page, "asha rao");
  await answer(page, "asha.rao@gmail.com");
  await answer(page, "98765 43210");
  await answer(page, "Nashik, Maharashtra");
  await tap(page, "No"); // LinkedIn
  await tap(page, "No"); // website
  // Her own words; "Need help?" shows what to cover and varied examples, not a template.
  await tap(page, "Need help? See what to write");
  await expect(page.getByText("A good summary answers three things")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Professional summary" })
    .fill("Third-year B.Sc. Physics student at K.T.H.M. College, Nashik, who enjoys building websites and working with data in Python. Looking for a software internship.");
  await next(page);
  await expect(page.getByRole("heading", { name: "Looks good!" })).toBeVisible();
  await tap(page, "Continue to Education");

  // 2. Education: current degree, then Class 12 and Class 10 from the add-another screen
  await tap(page, "Start this section");
  await tap(page, "B.Sc.");
  await tap(page, "Physics");
  await answer(page, "K.T.H.M. College");
  await answer(page, "Nashik");
  await month(page, "2023-07");
  await tap(page, "Yes"); // still studying
  await tap(page, "GPA (out of 10)");
  await page.getByRole("textbox").fill("12");
  await next(page);
  await expect(page.getByText("GPA should be more than 0 and at most 10.")).toBeVisible();
  await answer(page, "8.4");
  await tap(page, "Add Class 12");
  await school(page, { degree: "Class 12", field: "Science", name: "Sharada Vidyalaya", start: "2021-06", end: "2023-03", percent: "82" });
  await tap(page, "Add Class 10");
  await school(page, { degree: "Class 10", field: "State board", name: "Sharada Vidyalaya", start: "2020-06", end: "2021-03", percent: "88" });
  await tap(page, "No, move on");
  await expect(page.getByRole("heading", { name: "Looks good!" })).toBeVisible();
  await tap(page, "Continue to Work Experience");

  // 3. Work Experience: "internship or job" is asked once, with the opening question
  await tap(page, "Yes, an internship");
  await expect(page.getByRole("heading", { name: "Where did you work?" })).toBeVisible();
  await answer(page, "Ankur Tech Solutions");
  await answer(page, "Web Development Intern");
  await answer(page, "Pune");
  await month(page, "2025-06");
  await tap(page, "No"); // still doing it
  await month(page, "2025-08");
  // Points in her own words, plus the optional three-question helper.
  await page.getByRole("textbox", { name: "Point 1", exact: true }).fill("Worked with the design team.");
  await tap(page, "Need help? Answer 3 short questions");
  const boxes = page.getByRole("textbox");
  await boxes.nth(0).fill("made 5 pages of the company website");
  await boxes.nth(1).fill("HTML, CSS and Git");
  await boxes.nth(2).fill("the website went live for 200 customers");
  await tap(page, "Turn these into points");
  await expect(page.getByRole("textbox", { name: "Point 1", exact: true })).toHaveValue("Worked with the design team.");
  await expect(page.getByRole("textbox", { name: "Point 2", exact: true })).toHaveValue("Made 5 pages of the company website.");
  await next(page);
  await expect(page.getByRole("heading", { name: "Any other internship or job?" })).toBeVisible();
  await tap(page, "No, that's all");
  await tap(page, "Continue to Skills");

  // 4. Skills: tools from her answers are suggested; pick only 3 so Curie asks for more
  await tap(page, "Start this section");
  for (const skill of ["HTML", "CSS", "Git"]) await page.getByRole("button", { name: skill, exact: true }).first().click();
  await next(page);
  await page.getByRole("radio", { name: "Advanced" }).first().click();
  await next(page);
  await tap(page, "Continue to Projects");

  // 5 to 9. Optional sections, skipped
  for (const section of ["Projects", "Achievements", "Awards", "Courses & Certifications", "Publications"]) {
    await expect(page.getByRole("heading", { name: section })).toBeVisible();
    await tap(page, "No, skip this section");
  }

  // Last step: choose a look, then Your CV -> sign in -> submit
  await expect(page).toHaveURL(/\/look$/);
  await expect(page.getByText("Last step")).toBeVisible();
  await tap(page, "Use Classic");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.locator("text=Asha Rao").first()).toBeVisible();
  await tap(page, "Submit to Curie for review");
  await expect(page.getByRole("heading", { name: "Sign in to submit your CV" })).toBeVisible();
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await expect(page.getByText("This is attempt 1 of 10.", { exact: false })).toBeVisible();
  await tap(page, "Submit to Curie");

  // Review 1, on her CV's home (Curie's review tab): needs another attempt
  await expect(page).toHaveURL(/\/cv\?tab=review$/);
  await expect(page.getByText("Curie is reviewing your CV")).toBeVisible();
  await expect(page.getByText("Needs another attempt")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Add a few more skills that fit the roles you want.")).toBeVisible();
  // Both tabs: her CV is a tap away.
  await page.getByRole("tab", { name: "My CV" }).click();
  await expect(page.locator("text=Asha Rao").first()).toBeVisible();
  await page.getByRole("tab", { name: /Curie's review/ }).click();

  // Improve Skills: its questions, with Curie's comment; Submit again as soon as she changes something
  await tap(page, "Improve this section");
  await expect(page.getByText("Curie said:")).toBeVisible();
  await tap(page, "Start this section");
  await page.getByPlaceholder("Add your own").fill("Python");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await next(page);
  await expect(page.getByText("You've made changes since Curie's review.")).toBeVisible();
  await page.goto("/cv?tab=review");
  await expect(page.getByText("✓ Improved")).toBeVisible();
  await tap(page, "Submit again");
  await expect(page.getByText("This is attempt 2 of 10.", { exact: false })).toBeVisible();
  await tap(page, "Submit to Curie");

  // Review 2: accepted -> its moment -> her CV's home -> change the look -> download
  await expect(page.getByRole("heading", { name: "Accepted!" })).toBeVisible({ timeout: 15_000 });
  await tap(page, "See my CV and the review");
  await expect(page.getByText("Accepted by Curie", { exact: true })).toBeVisible();
  await tap(page, "Change look");
  await expect(page.getByRole("radiogroup", { name: "Looks" }).getByRole("radio")).toHaveCount(9);
  await page.getByRole("radio", { name: "Minimal" }).click();
  await tap(page, "Use Minimal");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.getByText("Accepted by Curie.")).toBeVisible();
  await page.getByRole("button", { name: "Download my CV" }).click();
  await expect(page.getByRole("heading", { name: "Your CV is ready to send" })).toBeVisible();
  await expect(page.locator("#resume-preview")).toContainText("Web Development Intern");
  await expect(page.getByRole("button", { name: "Download my CV" })).toBeEnabled();

  // After submitting, Home is her CV; past attempts are on Curie's review tab and open as submitted
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.getByRole("link", { name: "Home", exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: /Curie's review/ }).click();
  await expect(page.getByRole("link", { name: /Attempt 2/ })).toBeVisible();
  await page.getByRole("link", { name: /Attempt 1/ }).click();
  await expect(page.getByText("Needs another attempt", { exact: false })).toBeVisible();
});

test("download needs only the required details, not sign-in or a review", async ({ page }) => {
  // (On Your CV before submitting, Download is one of the small actions under "Submit to Curie".)
  // An empty CV can't be downloaded yet.
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/download");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.getByText("Add the required details to download your CV.")).toBeVisible();

  // A complete CV can be downloaded straight away, without signing in or submitting.
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your CV is ready to send" })).toBeVisible();
  await expect(page.locator("#resume-preview")).toContainText("Asha Rao");
});

test("the demo opens on the landing page, pre-filled", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /Sign in with Google to save your CV/ })).toBeVisible();
  await page.getByRole("button", { name: "Let's start without signing in" }).click();
  await page.getByRole("button", { name: "Start this section" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("Asha Rao");
});

test("the demo CV passes every section check and can be submitted", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.getByRole("button", { name: "Submit to Curie for review" })).toBeVisible();
  await page.goto("/s/experience.0.about");
  await expect(page.getByRole("textbox", { name: "Point 1", exact: true })).toHaveValue("Built 5 pages of the company website.");
});

test("a section's edit screen shows every answer in the new style; each opens its own question and saving returns", async ({ page }) => {
  await returningStudent(page);
  await page.getByRole("button", { name: /5\. Projects/ }).click();
  await expect(page).toHaveURL(/\/edit\/projects$/);
  // None of the old builder's form: no rich-text toolbar, no "Add Project" form button.
  await expect(page.locator(".ql-toolbar")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add Project" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /What you did.*Made a website for the college fest\./ })).toBeVisible();

  await page.getByRole("button", { name: /What you did.*Made a website for the college fest\./ }).click();
  await expect(page.getByRole("heading", { name: "Describe it" })).toBeVisible();
  await page.getByRole("button", { name: "Add another point" }).click();
  await page.getByRole("textbox", { name: "Point 2", exact: true }).fill("Used by about 300 students during the fest.");
  await tap(page, "Save");
  await expect(page).toHaveURL(/\/edit\/projects$/);
  await expect(page.getByRole("button", { name: /Used by about 300 students during the fest\./ })).toBeVisible();
  // The phone's Back button goes to where she came from, not back into the question.
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/edit/personal");
  await expect(page.getByRole("button", { name: /Professional summary.*I am a 3rd-year B\.Sc\. Physics student/ })).toBeVisible();
  await page.getByRole("button", { name: /Phone/ }).click();
  await tap(page, "Cancel");
  await expect(page).toHaveURL(/\/edit\/personal$/);
});

test.describe("on a laptop", () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false });

  test("the CV shows beside the questions and opens in a full-width view", async ({ page }) => {
    await page.goto("/demo");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/s/experience.0.about");
    await expect(page.getByText("Your CV so far")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(900);

    await page.getByRole("button", { name: "Full view" }).click();
    const fullView = page.getByRole("dialog", { name: "Your CV, full view" });
    await expect(fullView).toBeVisible();
    const lookName = fullView.locator("[aria-live=polite]");
    await expect(lookName).toHaveText("Classic");
    await fullView.getByRole("radio", { name: "Shaded Headers" }).click();
    await expect(lookName).toHaveText("Shaded Headers");
    await fullView.getByRole("button", { name: "Back" }).click();
    await expect(fullView).toHaveCount(0);
    await expect(page.getByText("Your CV so far · Shaded Headers")).toBeVisible();
  });
});

test("on a shared phone, another student can clear the previous CV", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("guided-cv-v1") ?? "{}");
    localStorage.setItem("guided-cv-v1", JSON.stringify({ ...saved, lastStep: "education.0.degree" }));
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Welcome back, Asha!" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue as Asha" })).toBeVisible();
  // Home shows every section, and any of them opens from here.
  await expect(page.getByRole("button", { name: /9\. Publications/ })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "I'm not Asha: start a new CV" }).click();
  await expect(page.getByRole("button", { name: "Let's start without signing in" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("guided-cv-v1") ?? "")).not.toContain("Asha");
});

test("on a phone, the CV opens from the top bar and peeks after each section", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/experience.0.about");
  // Describe it shows which entry it's about: what she has entered so far.
  await expect(page.getByRole("button", { name: /So far: Internship · Ankur Tech Solutions · Web Development Intern/ })).toBeVisible();
  await page.getByRole("button", { name: "Preview my CV" }).click();
  const fullView = page.getByRole("dialog", { name: "Your CV, full view" });
  await expect(fullView).toContainText("Web Development Intern");
  // Every look is shown as a small picture; tapping one switches to it.
  await fullView.getByRole("radio", { name: "Modern" }).click();
  await expect(fullView.locator("[aria-live=polite]")).toHaveText("Modern");
  await expect(fullView.getByRole("button", { name: "Zoom: fit to screen" })).toBeVisible();
  await fullView.getByRole("button", { name: "Zoom in" }).click();
  await fullView.getByRole("button", { name: "Zoom in" }).click();
  await expect(fullView.getByText("75%")).toBeVisible();
  await fullView.getByRole("button", { name: /Tap to fit to screen/ }).click();
  await expect(fullView.getByText("Fit", { exact: true })).toBeVisible();
  await fullView.getByRole("button", { name: "Back" }).click();
  await expect(fullView).toHaveCount(0);

  await page.goto("/s/experience.check");
  await page.getByRole("button", { name: "Open your CV" }).click();
  await expect(fullView).toBeVisible();
});

test("from any question she can see every section and jump to one", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/skills.pick");
  await page.getByRole("button", { name: "All sections" }).click();
  const list = page.getByRole("dialog");
  await expect(list.getByText("Your sections")).toBeVisible();
  await expect(list.getByRole("button")).toContainText(["1. Personal Information", "2. Education", "3. Work Experience"]);
  await list.getByRole("button", { name: /2\. Education/ }).click();
  await expect(page).toHaveURL(/\/edit\/education$/);
  // The section bar is on the edit screen too.
  await expect(page.getByRole("button", { name: "All sections" })).toBeVisible();
});

test("adding an entry from a section's edit screen asks the questions, then comes back", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/edit/experience");
  await page.getByRole("button", { name: "Add another internship or job" }).click();
  await expect(page).toHaveURL(/\/s\/experience\.2\.type\?back=/);
  await expect(page.getByRole("heading", { name: "Was it an internship or a job?" })).toBeVisible();
  await page.getByRole("button", { name: "Job", exact: true }).click();
  await page.getByRole("textbox").fill("Sharma Tutorials");
  await tap(page, "Save");
  await page.getByRole("textbox").fill("Maths Tutor");
  await tap(page, "Save");
  await page.getByRole("button", { name: "It was online" }).click();
  await month(page, "2024-06");
  await page.getByRole("button", { name: "No", exact: true }).click();
  await month(page, "2025-03");
  await page.getByRole("textbox", { name: "Point 1", exact: true }).fill("Taught maths to 12 Class 9 students.");
  await tap(page, "Save");
  await expect(page).toHaveURL(/\/edit\/experience$/);
  await expect(page.getByRole("heading", { name: "Maths Tutor, Sharma Tutorials" })).toBeVisible();

  // Delete asks first, then removes the entry.
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Maths Tutor, Sharma Tutorials" }).click();
  await expect(page.getByRole("heading", { name: "Maths Tutor, Sharma Tutorials" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /Research Intern/ })).toBeVisible();
});

test("an entry she starts adding and backs out of isn't left behind", async ({ page }) => {
  await returningStudent(page);
  await page.getByRole("button", { name: /3\. Work Experience/ }).click();
  await page.getByRole("button", { name: "Add another internship or job" }).click();
  await expect(page.getByRole("heading", { name: "Was it an internship or a job?" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/edit\/experience$/);
  await expect(page.getByRole("heading", { name: "Not filled in yet" })).toHaveCount(0);
});

test("entries on the 'add another' screen open for editing", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/experience.more");
  await page.getByRole("button", { name: /Research Intern/ }).click();
  await expect(page).toHaveURL(/\/edit\/experience$/);
});

test("marks can be left out only for a degree she's still studying", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("guided-cv-v1") ?? "{}");
    saved.data.education[1].gpa = ""; // Class 12, finished
    saved.data.education[0].gpa = ""; // current B.Sc.
    localStorage.setItem("guided-cv-v1", JSON.stringify(saved));
  });
  await page.goto("/s/education.check");
  await expect(page.getByText("Add your marks for Class 12.")).toBeVisible();
  await expect(page.getByText("Add your marks for B.Sc..")).toHaveCount(0);
});

test("a second internship or job is chosen on the 'any other' screen, not asked again", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/experience.more");
  await tap(page, "Add a job");
  await expect(page).toHaveURL(/\/s\/experience\.2\.company$/);
  await expect(page.getByRole("heading", { name: "Where did you work?" })).toBeVisible();
  // Back from here skips the (already answered) type question.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/experience\.more$/);
});

test("Back on a question goes to the previous question, even after a trip Home", async ({ page }) => {
  await returningStudent(page);
  await page.goto("/s/education.0.school");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/education.0.school");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/education\.0\.field$/);
});

test("from a question she can see her answers in the section, change one and come back to the question", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/experience.0.about");
  await page.getByRole("button", { name: "Work Experience: see your answers" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Your Work Experience so far" })).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Delete", exact: false })).toHaveCount(0);
  await sheet.getByRole("button", { name: /^City/ }).first().click();
  await page.getByRole("textbox").fill("Mumbai");
  await tap(page, "Save");
  await expect(page).toHaveURL(/\/s\/experience\.0\.about$/);
  await expect(page.getByRole("heading", { name: "Describe it" })).toBeVisible();
});

test("on a phone, looks are a swipeable carousel of full-size CVs", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await page.goto("/look");
  await expect(page.getByText("1 of 9 · swipe to see more")).toBeVisible();
  await page.getByRole("button", { name: "Next look" }).click();
  await expect(page.getByText("2 of 9 · swipe to see more")).toBeVisible();
  await expect(page.getByRole("button", { name: "Use Shaded Headers" })).toBeVisible();
  // Swiping works too.
  await page.locator(".snap-x").evaluate((el) => el.scrollTo({ left: 4 * el.clientWidth }));
  await expect(page.getByText("5 of 9 · swipe to see more")).toBeVisible();
});

test("each question shows what she has entered so far; starting a new entry, the ones already added", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/s/experience.0.start");
  const soFar = page.getByRole("button", { name: /^So far:/ });
  await expect(soFar).toContainText("Ankur Tech Solutions");
  await soFar.click();
  await expect(page.getByRole("heading", { name: "Your Work Experience so far" })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/s/experience.more");
  await tap(page, "Add a job");
  await expect(page.getByRole("button", { name: /^Already added: Web Development Intern, Ankur Tech Solutions; Research Intern, IISER Pune/ })).toBeVisible();
});

test("/fresh clears the CV on this device and opens the landing page", async ({ page }) => {
  await returningStudent(page);
  await page.goto("/fresh");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Let's start without signing in" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("guided-cv-v1") ?? "")).not.toContain("Asha");
});

test("a course or certificate can have an optional description, as in the original builder", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await page.goto("/edit/certifications");
  await page.getByRole("button", { name: /^What it covered/ }).click();
  await expect(page.getByRole("heading", { name: "What did it cover?" })).toBeVisible();
  await page.getByRole("textbox").fill("python basics, data types and simple programs");
  await tap(page, "Save");
  await expect(page).toHaveURL(/\/edit\/certifications$/);
  await expect(page.getByRole("button", { name: /What it covered.*Python basics, data types and simple programs\./ })).toBeVisible();
  await page.goto("/cv");
  await expect(page.locator("text=Python basics, data types and simple programs.").first()).toBeVisible();
});

test("after a review, 'Edit my CV' goes back into the questions, and she can submit again from any question once she changes something", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await tap(page, "Submit to Curie for review");
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await tap(page, "Submit to Curie");
  await expect(page.getByText("Needs another attempt")).toBeVisible({ timeout: 15_000 });
  // Nothing changed yet: the review leads to editing, not to submitting the same CV again.
  await expect(page.getByRole("button", { name: "Submit again" })).toHaveCount(0);
  await tap(page, "Edit my CV");
  // She picks the part to change; Curie's flagged sections come first and are marked.
  const picker = page.getByRole("dialog");
  await expect(picker.getByRole("heading", { name: "Which part do you want to change?" })).toBeVisible();
  await expect(picker.getByRole("button").first()).toContainText("Projects");
  await expect(picker.getByRole("button").first()).toContainText("Curie: needs work");
  await picker.getByRole("button", { name: /Projects/ }).click();
  // The same question-by-question journey, with her answers filled in.
  await expect(page).toHaveURL(/\/s\/projects\.intro$/);
  await expect(page.getByText(/Curie said:.*Add more detail/)).toBeVisible();
  await expect(page.getByText("You've made changes since Curie's review.")).toHaveCount(0);

  await page.goto("/s/projects.0.name");
  await page.getByRole("textbox").fill("College fest website for 300 students");
  await next(page);
  await expect(page.getByText("You've made changes since Curie's review.")).toBeVisible();
  // The review now offers to send the changes, with more editing a tap away.
  await page.goto("/review");
  await expect(page).toHaveURL(/\/cv\?tab=review$/);
  await tap(page, "Edit my CV");
  await expect(page.getByRole("heading", { name: "Which part do you want to change?" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await tap(page, "Submit again");
  await expect(page.getByText("This is attempt 2 of 10.", { exact: false })).toBeVisible();
});

test("after submitting, signing out from her CV clears this phone for the next student", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await tap(page, "Submit to Curie for review");
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await tap(page, "Submit to Curie");
  await expect(page.getByText("Needs another attempt")).toBeVisible({ timeout: 15_000 });
  await page.goto("/");
  await expect(page).toHaveURL(/\/cv$/);

  page.once("dialog", (dialog) => dialog.accept());
  await tap(page, "Sign out");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Let's start without signing in" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("guided-cv-v1") ?? "")).not.toContain("Asha");
});
