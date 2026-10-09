import { expect, test, type Page } from "@playwright/test";

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

// Never touch the live Supabase project from tests: use the mock backend and block Supabase calls.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("guided-mock-backend", "1"));
  await page.route(/supabase\.co/, (route) => route.fulfill({ status: 201, contentType: "application/json", body: "[]" }));
});

const next = (page: Page) => page.getByRole("button", { name: "Next", exact: true }).click();
const tap = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).click();

async function answer(page: Page, text: string) {
  await page.getByRole("textbox").fill(text);
  await next(page);
}

async function month(page: Page, value: string) {
  await page.locator('input[type="month"]').fill(value);
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

  await tap(page, "Let's start");

  // 1. Personal Information
  await tap(page, "Okay");
  await answer(page, "asha rao");
  await answer(page, "asha.rao@gmail.com");
  await answer(page, "98765 43210");
  await answer(page, "Nashik, Maharashtra");
  await tap(page, "No"); // LinkedIn
  await tap(page, "No"); // website
  const blanks = page.getByRole("textbox");
  await blanks.nth(0).fill("3rd-year B.Sc. Physics");
  await blanks.nth(1).fill("K.T.H.M. College, Nashik");
  await blanks.nth(2).fill("web development and Python");
  await blanks.nth(3).fill("a software internship");
  await expect(page.getByText("On your CV:")).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "Looks good!" })).toBeVisible();
  await tap(page, "Continue to Education");

  // 2. Education: current degree, then Class 12 and Class 10 from the add-another screen
  await tap(page, "Okay");
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

  // 3. Work Experience
  await tap(page, "Yes");
  await tap(page, "Internship");
  await answer(page, "Ankur Tech Solutions");
  await answer(page, "Web Development Intern");
  await answer(page, "Pune");
  await month(page, "2025-06");
  await tap(page, "No"); // still doing it
  await month(page, "2025-08");
  const boxes = page.getByRole("textbox");
  await boxes.nth(0).fill("made 5 pages of the company website");
  await boxes.nth(1).fill("HTML, CSS and Git");
  await boxes.nth(2).fill("the website went live for 200 customers");
  await next(page);
  await expect(page.getByRole("textbox", { name: "Point 1", exact: true })).toHaveValue("Made 5 pages of the company website.");
  await tap(page, "Looks good");
  await tap(page, "No, move on");
  await tap(page, "Continue to Skills");

  // 4. Skills: tools from her answers are suggested; pick only 3 so Curie asks for more
  await tap(page, "Okay");
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
  await tap(page, "Use this look");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.locator("text=Asha Rao").first()).toBeVisible();
  await tap(page, "Submit to Curie for review");
  await expect(page.getByRole("heading", { name: "Sign in to submit your CV" })).toBeVisible();
  await page.getByRole("button", { name: /Continue with Google/ }).click();
  await expect(page.getByText("This is attempt 1 of 10.", { exact: false })).toBeVisible();
  await tap(page, "Submit to Curie");

  // Review 1: needs another attempt
  await expect(page.getByText("Curie is reviewing your CV")).toBeVisible();
  await expect(page.getByText("Needs another attempt")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Add a few more skills that fit the roles you want.")).toBeVisible();

  // Improve Skills using the full section form, then submit again
  await tap(page, "Improve this section");
  await expect(page.getByText("Curie said:")).toBeVisible();
  await page.getByRole("button", { name: "Add Skill" }).click();
  await page.getByPlaceholder("Skill name (e.g., JavaScript, Project Management)").last().fill("Python");
  await tap(page, "Done, back to my review");
  await expect(page.getByText("✓ Improved")).toBeVisible();
  await tap(page, "Submit again");
  await expect(page.getByText("This is attempt 2 of 10.", { exact: false })).toBeVisible();
  await tap(page, "Submit to Curie");

  // Review 2: accepted -> choose a look -> download
  await expect(page.getByRole("heading", { name: "Accepted!" })).toBeVisible({ timeout: 15_000 });
  await tap(page, "Choose a look");
  await expect(page.getByText("1 of 9", { exact: false })).toBeVisible();
  await tap(page, "Use this look");
  await expect(page.getByRole("heading", { name: "Your CV is ready to send" })).toBeVisible();
  await expect(page.locator("#resume-preview")).toContainText("Web Development Intern");
  await expect(page.getByRole("button", { name: "Download my CV" })).toBeEnabled();
});

test("download is locked until Curie accepts the CV", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/download");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.getByRole("button", { name: /Finish Personal Information/ })).toBeVisible();
});

test("the demo opens on the landing page, pre-filled", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: /Sign in with Google to save your CV/ })).toBeVisible();
  await page.getByRole("button", { name: "Let's start" }).click();
  await page.getByRole("button", { name: "Okay" }).click();
  await expect(page.getByRole("textbox")).toHaveValue("Asha Rao");
});

test("the demo CV passes every section check and can be submitted", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await expect(page.getByRole("button", { name: "Submit to Curie for review" })).toBeVisible();
  await page.goto("/s/experience.0.about");
  await expect(page.getByRole("textbox").first()).toHaveValue("built 5 pages of the company website");
});

test("editing a section uses plain boxes, not a formatting toolbar", async ({ page }) => {
  await page.goto("/demo?to=cv");
  await expect(page).toHaveURL(/\/cv$/);
  await page.goto("/edit/projects");
  await expect(page.locator(".ql-toolbar")).toHaveCount(0);
  const firstPoint = page.getByRole("textbox", { name: "Description point 1" }).first();
  await expect(firstPoint).toHaveValue("Made a website for the college fest.");
  await page.getByRole("button", { name: "Add another point" }).first().click();
  await page.getByRole("textbox", { name: "Description point 2" }).first().fill("Used by about 300 students during the fest.");
  await page.goto("/cv");
  await expect(page.locator("text=Used by about 300 students during the fest.").first()).toBeVisible();

  await page.goto("/edit/personal");
  await expect(page.locator(".ql-toolbar")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Professional Summary *" })).toHaveValue(/I am a 3rd-year B\.Sc\. Physics student/);
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
    await expect(fullView.getByText("Classic")).toBeVisible();
    await fullView.getByRole("button", { name: "Next look" }).click();
    await expect(fullView.getByText("Shaded Headers")).toBeVisible();
    await fullView.getByRole("button", { name: "Back to questions" }).click();
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

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "I'm not Asha: start a new CV" }).click();
  await expect(page.getByRole("button", { name: "Let's start" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("guided-cv-v1") ?? "")).not.toContain("Asha");
});
