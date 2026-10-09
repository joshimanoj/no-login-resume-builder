import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { clearState, initialState, loadState, saveState, type GuidedState } from "./state";
import { buildSteps } from "./steps";
import { pullCv, pullSubmissions, pushCv, signOut as backendSignOut, usingMock, watchUser } from "./backend";

interface GuidedContextValue {
  state: GuidedState;
  /** Replace the state. Returns the new state so callers can navigate from it. */
  update: (next: GuidedState | ((s: GuidedState) => GuidedState)) => GuidedState;
  /** Save `next`, then go to the step after `fromKey` in the flow built from `next`. */
  advance: (next: GuidedState, fromKey: string) => void;
  goStep: (key: string) => void;
  /** False until we know whether she's signed in (and her saved CV has loaded). */
  authReady: boolean;
  signOut: () => Promise<void>;
}

const GuidedContext = createContext<GuidedContextValue | null>(null);

export const stepPath = (key: string) => `/s/${key}`;

/** The parts of the state saved to her account. */
const SYNCED = ["data", "template", "answers", "prompts", "improved"] as const;
const contentChanged = (a: GuidedState, b: GuidedState) => SYNCED.some((k) => a[k] !== b[k]);
const syncedJson = (s: GuidedState) => JSON.stringify(SYNCED.map((k) => s[k]));
const hasContent = (s: GuidedState) => Boolean(s.lastStep || s.submissions.length || s.data.personalInfo.fullName);

export function GuidedProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GuidedState>(loadState);
  const [authReady, setAuthReady] = useState(usingMock);
  const stateRef = useRef(state);
  const loadedFor = useRef<string | null>(null);
  const lastPushed = useRef<string | null>(null);
  const navigate = useNavigate();

  // Save straight away: students often close the tab right after answering.
  useEffect(() => saveState(state), [state]);

  const update = useCallback<GuidedContextValue["update"]>((next) => {
    const prev = stateRef.current;
    let value = typeof next === "function" ? next(prev) : next;
    if (contentChanged(prev, value) && value.updatedAt === prev.updatedAt) value = { ...value, updatedAt: Date.now() };
    stateRef.current = value;
    setState(value);
    return value;
  }, []);

  // When she signs in, bring in her saved CV and submissions. The newer CV wins between this phone and her account.
  useEffect(
    () =>
      watchUser(async (user) => {
        if (!user) {
          if (stateRef.current.user) update((s) => ({ ...s, user: null }));
          loadedFor.current = null;
          setAuthReady(true);
          return;
        }
        if (loadedFor.current === user.id) return; // token refreshes and repeat events
        loadedFor.current = user.id;
        try {
          const [cloud, submissions] = await Promise.all([pullCv(user.id), pullSubmissions(user.id)]);
          update((s) => {
            const otherAccount = Boolean(s.user && s.user.id !== user.id);
            const base = otherAccount ? initialState() : s;
            const useCloud = cloud && (otherAccount || !hasContent(base) || cloud.updatedAt > (base.updatedAt ?? 0));
            if (useCloud) {
              const fromCloud = { ...base, ...cloud, user, submissions };
              lastPushed.current = syncedJson(fromCloud);
              return fromCloud;
            }
            return { ...base, user, submissions, updatedAt: base.updatedAt ?? Date.now() };
          });
        } catch (error) {
          console.error("Could not load the saved CV:", error);
          update((s) => ({ ...s, user }));
        }
        setAuthReady(true);
      }),
    [update],
  );

  // Save her CV to her account a moment after each change.
  useEffect(() => {
    const user = state.user;
    if (!user || usingMock() || loadedFor.current !== user.id) return;
    const payload = syncedJson(state);
    if (payload === lastPushed.current) return;
    const t = setTimeout(() => {
      pushCv(user.id, state)
        .then(() => (lastPushed.current = payload))
        .catch((error) => console.error("Could not save the CV to the account:", error));
    }, 1200);
    return () => clearTimeout(t);
  }, [state]);

  const signOut = useCallback(async () => {
    await backendSignOut();
    // Her CV is saved to her account; clear it from this phone in case the phone is shared.
    loadedFor.current = null;
    lastPushed.current = null;
    clearState();
    update(initialState());
  }, [update]);

  const goStep = useCallback((key: string) => navigate(stepPath(key)), [navigate]);

  const advance = useCallback<GuidedContextValue["advance"]>(
    (next, fromKey) => {
      update(next);
      const steps = buildSteps(next);
      const i = steps.findIndex((st) => st.key === fromKey);
      const following = steps[i + 1];
      // After the last section comes the last step: choosing a look.
      navigate(following ? stepPath(following.key) : "/look");
    },
    [navigate, update],
  );

  return (
    <GuidedContext.Provider value={{ state, update, advance, goStep, authReady, signOut }}>{children}</GuidedContext.Provider>
  );
}

export function useGuided() {
  const ctx = useContext(GuidedContext);
  if (!ctx) throw new Error("useGuided must be used inside GuidedProvider");
  return ctx;
}
