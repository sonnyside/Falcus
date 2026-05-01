export const TESTER_STORAGE_KEY = "falcus-tester-id";

export type TrackEventName =
  | "app_opened"
  | "explainer_opened"
  | "explainer_skipped"
  | "onboarding_started"
  | "onboarding_completed"
  | "area_selected"
  | "task_written"
  | "task_confirmed"
  | "micro_written"
  | "draft_saved"
  | "add_more_clicked"
  | "prioritize_clicked"
  | "priority_changed"
  | "focus_created"
  | "focus_completed"
  | "new_plan_clicked"
  | "back_clicked"
  | "user_returned_to_saved_step"
  | "invalid_empty_submit"
  | "api_call_failed"
  | "default_state_fallback";

export type TrackEvent = {
  testerId: string;
  eventName: TrackEventName;
  step: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export function getTesterIdFromUrl() {
  if (typeof window === "undefined") return null;
  const value = new URLSearchParams(window.location.search).get("tester");
  return value?.trim() || null;
}

export function getStoredTesterId() {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(TESTER_STORAGE_KEY);
  return value?.trim() || null;
}

export function resolveTesterId() {
  const testerId = getTesterIdFromUrl() || getStoredTesterId() || "default";
  if (typeof window !== "undefined") {
    localStorage.setItem(TESTER_STORAGE_KEY, testerId);
  }
  return testerId;
}

export async function trackEvent(event: TrackEvent) {
  try {
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // silent by design
  }
}
