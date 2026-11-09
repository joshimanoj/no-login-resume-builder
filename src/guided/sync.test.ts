import { describe, expect, it } from "vitest";
import { initialState, type GuidedState, type Submission } from "./state";
import { mergeOnSignIn } from "./sync";
import type { CloudCv } from "./backend";

const user = { id: "u1", name: "Asha Rao", email: "asha@example.com" };

const withName = (name: string, extra: Partial<GuidedState> = {}): GuidedState => {
  const s = initialState();
  return { ...s, data: { ...s.data, personalInfo: { ...s.data.personalInfo, fullName: name } }, ...extra };
};

const cloudOf = (s: GuidedState, updatedAt: number): CloudCv => ({
  data: s.data,
  template: s.template,
  answers: s.answers,
  prompts: s.prompts,
  improved: s.improved,
  updatedAt,
});

const submission = (s: GuidedState): Submission => ({ id: "sub1", attempt: 1, submittedAt: 1, snapshot: s.data });

describe("mergeOnSignIn", () => {
  it("an empty account copy never replaces her CV on this phone", () => {
    const local = withName("Asha Rao", { updatedAt: 1 });
    const empty = cloudOf(initialState(), 999);
    const { state, fromCloud } = mergeOnSignIn(local, empty, [], user);
    expect(fromCloud).toBe(false);
    expect(state.data.personalInfo.fullName).toBe("Asha Rao");
  });

  it("with nothing on the phone and an empty account copy, her last submitted CV comes back", () => {
    const submitted = withName("Asha Rao");
    submitted.data.projects = [{ id: "p1", name: "College fest website", description: "", technologies: "" }];
    const { state } = mergeOnSignIn(initialState(), cloudOf(initialState(), 999), [submission(submitted)], user);
    expect(state.data.personalInfo.fullName).toBe("Asha Rao");
    // Optional sections with entries are part of her CV again, so the questions show them.
    expect(state.answers["optin.projects"]).toBe(true);
  });

  it("the newer copy wins between this phone and her account", () => {
    const older = withName("Old name", { updatedAt: 1 });
    const newer = withName("New name");
    expect(mergeOnSignIn(older, cloudOf(newer, 2), [], user).state.data.personalInfo.fullName).toBe("New name");
    const newerLocal = withName("New name", { updatedAt: 3 });
    expect(mergeOnSignIn(newerLocal, cloudOf(withName("Old name"), 2), [], user).state.data.personalInfo.fullName).toBe("New name");
  });

  it("with nothing on the phone, her account copy loads", () => {
    const { state, fromCloud } = mergeOnSignIn(initialState(), cloudOf(withName("Asha Rao"), 1), [], user);
    expect(fromCloud).toBe(true);
    expect(state.data.personalInfo.fullName).toBe("Asha Rao");
  });

  it("another account's CV on this phone is not kept", () => {
    const someoneElse = withName("Priya", { user: { id: "u2", name: "Priya", email: "p@example.com" }, updatedAt: 999 });
    const { state } = mergeOnSignIn(someoneElse, cloudOf(withName("Asha Rao"), 1), [], user);
    expect(state.data.personalInfo.fullName).toBe("Asha Rao");
  });
});
