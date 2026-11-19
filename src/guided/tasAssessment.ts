export const tasAssessmentEnabled = import.meta.env.VITE_TAS_RESUME_ASSESSMENT === "1";
export const TAS_REVIEW_SESSION_KEY = "tas-resume-review";

export async function tasRequest<T>(operation: "lookup" | "submit" | "status", body: object): Promise<T> {
  const response = await fetch(`/api/tas-resume/${operation}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(typeof data.detail === "string" ? data.detail : "TAS could not process the request.");
  }
  return data as T;
}

export function encodePDF(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The resume PDF could not be read."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

export function readTasReviewSession(): string | null {
  try {
    return sessionStorage.getItem(TAS_REVIEW_SESSION_KEY);
  } catch {
    return null;
  }
}

export function clearTasReviewSession() {
  try {
    sessionStorage.removeItem(TAS_REVIEW_SESSION_KEY);
  } catch {
    // Browser storage may be disabled.
  }
}
