import { useEffect } from "react";
import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { GuidedProvider } from "./GuidedContext";
import { clearState, saveState } from "./state";
import { signOut } from "./backend";
import { demoState } from "./demo";
import { StepScreen } from "./StepScreen";
import {
  AttemptView,
  Download,
  EditEverything,
  EditSection,
  Improve,
  LookPicker,
  PhotoStep,
  ReviewScreen,
  SignIn,
  Submit,
  Welcome,
  YourCv,
} from "./screens";

/** The guided, mobile-first CV flow. Each screen has its own URL so the phone's Back button works. */
export default function GuidedApp() {
  return (
    <Routes>
      {/* Outside the provider so nothing re-saves the old CV over the demo before the reload. */}
      <Route path="demo" element={<DemoLoader />} />
      <Route path="fresh" element={<FreshStart />} />
      <Route
        path="*"
        element={
          <GuidedProvider>
            <GuidedRoutes />
          </GuidedProvider>
        }
      />
    </Routes>
  );
}

function GuidedRoutes() {
  return (
    <Routes>
      <Route index element={<Welcome />} />
      <Route path="s/:key" element={<StepScreen />} />
      <Route path="cv" element={<YourCv />} />
      <Route path="edit" element={<EditEverything />} />
      <Route path="edit/:section" element={<EditSection />} />
      <Route path="signin" element={<SignIn />} />
      <Route path="submit" element={<Submit />} />
      <Route path="review" element={<ReviewScreen />} />
      <Route path="improve/:section" element={<Improve />} />
      <Route path="look" element={<LookPicker />} />
      <Route path="photo" element={<PhotoStep />} />
      <Route path="download" element={<Download />} />
      <Route path="attempt/:attempt" element={<AttemptView />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/**
 * /demo loads a complete sample CV and opens the landing page; /demo?to=cv jumps to the finished CV.
 * In local development the demo also switches to test mode (simulated sign-in and review, nothing
 * written to Supabase); /demo?live=1 keeps the real backend.
 */
function DemoLoader() {
  const [params] = useSearchParams();
  useEffect(() => {
    if (import.meta.env.DEV) {
      try {
        if (params.get("live") === "1")
          localStorage.removeItem("guided-mock-backend");
        else localStorage.setItem("guided-mock-backend", "1");
      } catch {
        // Storage blocked: the demo still loads, using whichever backend is configured.
      }
    }
    saveState(demoState());
    // Full reload so the app starts in the chosen mode with the demo CV.
    window.location.replace(params.get("to") === "cv" ? "/cv" : "/");
  }, [params]);
  return null;
}

/**
 * /fresh clears this browser: the CV on this device (e.g. the demo) and the Google sign-in, then opens
 * the landing page as a first-time student. A CV saved to an account stays in the account.
 */
function FreshStart() {
  useEffect(() => {
    void (async () => {
      // Sign out properly first, so the sign-in can't be written back while this page is open.
      await signOut("local").catch(() => undefined);
      clearState();
      try {
        // Supabase keeps the sign-in under "sb-..." keys; removing them signs this browser out.
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        // Storage blocked: nothing saved to clear.
      }
      window.location.replace("/");
    })();
  }, []);
  return null;
}
