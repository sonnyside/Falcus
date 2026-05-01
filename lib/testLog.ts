export function logTestEvent(
  testerId: string,
  eventName: string,
  metadata: Record<string, unknown> = {}
) {
  if (typeof window === "undefined") return;

  const event = {
    testerId: testerId || "default",
    eventName,
    timestamp: new Date().toISOString(),
    metadata,
  };

  fetch("/api/test-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {
    console.log("Kunne ikke sende test-log", event);
  });
}