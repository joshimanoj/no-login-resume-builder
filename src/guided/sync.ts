import { SECTIONS, hasEnteredAnything, initialState, type GuidedState, type GuidedUser, type Submission } from "./state";
import { isListSection, items, optInKey } from "./steps";
import type { CloudCv } from "./backend";

/** Optional sections she has entries in count as "yes" (a CV taken from a submission has no yes/no answers). */
export function answersForData(s: GuidedState): GuidedState["answers"] {
  const answers: GuidedState["answers"] = {};
  for (const def of SECTIONS) {
    if (def.ask && isListSection(def.id) && items(s, def.id).length > 0) answers[optInKey(def.id)] = true;
  }
  return answers;
}

/**
 * Her CV when she signs in, from the copy on this phone and the copy in her account.
 * - The newer copy wins; an account copy with nothing in it never wins.
 * - Another account's CV on this phone is never kept.
 * - If neither copy has anything but she has submitted, her last submitted CV comes back.
 */
export function mergeOnSignIn(
  local: GuidedState,
  cloud: CloudCv | null,
  submissions: Submission[],
  user: GuidedUser,
): { state: GuidedState; fromCloud: boolean } {
  const otherAccount = Boolean(local.user && local.user.id !== user.id);
  const base = otherAccount ? initialState() : local;
  const localHas = hasEnteredAnything(base.data);
  const usable = cloud && hasEnteredAnything(cloud.data) ? cloud : null;

  if (usable && (!localHas || usable.updatedAt > (base.updatedAt ?? 0))) {
    return { state: { ...base, ...usable, user, submissions }, fromCloud: true };
  }

  const snapshot = submissions[submissions.length - 1]?.snapshot;
  if (!localHas && snapshot && hasEnteredAnything(snapshot)) {
    const restored: GuidedState = { ...base, data: snapshot, template: cloud?.template ?? base.template, user, submissions, updatedAt: Date.now() };
    return { state: { ...restored, answers: { ...answersForData(restored), ...base.answers } }, fromCloud: false };
  }

  return { state: { ...base, user, submissions, updatedAt: base.updatedAt ?? Date.now() }, fromCloud: false };
}
