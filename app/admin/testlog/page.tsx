"use client";

import { useEffect, useState } from "react";

type TestEvent = {
  testerId: string;
  eventName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

type TesterSummary = {
  eventCount: number;
  latestEventName: string;
  latestActivity: string;
};

const FUNNEL_ORDER = [
  "app_opened",
  "area_selected",
  "task_confirmed",
  "draft_saved",
  "focus_created",
  "focus_completed",
] as const;

function getLastMeaningfulEvent(events: TestEvent[]) {
  return [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )[0];
}

function getFunnelStatus(events: TestEvent[]) {
  const furthestIndex = events.reduce((best, event) => {
    const idx = FUNNEL_ORDER.indexOf(event.eventName as (typeof FUNNEL_ORDER)[number]);
    return Math.max(best, idx);
  }, -1);

  if (furthestIndex >= 5) return "Fokus fuldført";
  if (furthestIndex >= 4) return "Fokus oprettet";
  if (furthestIndex >= 3) return "Mikrohandling gemt";
  if (furthestIndex >= 2) return "Opgave valgt";
  if (furthestIndex >= 1) return "Område valgt";
  return "Kun åbnet";
}

function getDropoffStep(events: TestEvent[]) {
  const furthestIndex = events.reduce((best, event) => {
    const idx = FUNNEL_ORDER.indexOf(event.eventName as (typeof FUNNEL_ORDER)[number]);
    return Math.max(best, idx);
  }, -1);

  if (furthestIndex >= 5) return "Fuldførte fokus";
  if (furthestIndex >= 4) return "Fokus oprettet, men ikke fuldført";
  if (furthestIndex >= 3) return "Stoppede før fokus";
  if (furthestIndex >= 2) return "Stoppede før mikrohandling";
  if (furthestIndex >= 1) return "Stoppede efter områdevalg";
  return "Stoppede før områdevalg";
}

function isLikelyGibberish(value: unknown) {
  if (typeof value !== "string") return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.includes("test")) return true;
  if (normalized.length < 4) return true;
  if (/(.)\1{3,}/.test(normalized)) return true;

  return false;
}

function getAttentionPoints(events: TestEvent[]) {
  const points: string[] = [];

  const appOpenedCount = events.filter((e) => e.eventName === "app_opened").length;
  const hasAreaSelected = events.some((e) => e.eventName === "area_selected");
  const hasTaskConfirmed = events.some((e) => e.eventName === "task_confirmed");
  const hasDraftSaved = events.some((e) => e.eventName === "draft_saved");
  const hasFocusCreated = events.some((e) => e.eventName === "focus_created");
  const hasFocusCompleted = events.some((e) => e.eventName === "focus_completed");

  if (appOpenedCount > 2 && !hasAreaSelected) {
    points.push("Gentagne app-åbninger uden områdevalg.");
  }

  if (hasAreaSelected && !hasTaskConfirmed) {
    points.push("Kommer til områdevalg, men vælger ikke opgave.");
  }

  if (hasTaskConfirmed && !hasDraftSaved) {
    points.push("Vælger opgave, men gemmer ikke mikrohandling.");
  }

  if (hasDraftSaved && !hasFocusCreated) {
    points.push("Gemmer mikrohandling, men opretter ikke fokus.");
  }

  if (hasFocusCreated && !hasFocusCompleted) {
    points.push("Opretter fokus, men fuldfører det ikke.");
  }

  const lastEvent = getLastMeaningfulEvent(events);
  if (lastEvent?.eventName === "area_selected") {
    points.push("Brugeren stoppede direkte efter valg af område.");
  }

  if (lastEvent?.eventName === "task_confirmed") {
    points.push("Brugeren stoppede efter opgavevalg, før mikrohandling.");
  }

  if (lastEvent?.eventName === "draft_saved") {
    points.push("Brugeren gemte mikrohandling, men stoppede før fokus.");
  }

  if (appOpenedCount > 1 && !hasDraftSaved) {
    points.push("Flere åbninger uden gemt opgave.");
  }

  const hasGibberishInput = events.some((event) => {
    if (!event.metadata) return false;
    const task = event.metadata.task;
    const micro = event.metadata.micro;

    return isLikelyGibberish(task) || isLikelyGibberish(micro);
  });

  if (hasGibberishInput) {
    points.push("Input ligner test eller utydelig formulering.");
  }

  return [...new Set(points)];
}

export default function TestLogAdminPage() {
  const [testers, setTesters] = useState<string[]>([]);
  const [selectedTester, setSelectedTester] = useState<string | null>(null);
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [testerSummaries, setTesterSummaries] = useState<
    Record<string, TesterSummary>
  >({});

  useEffect(() => {
    async function loadTesters() {
      const res = await fetch("/api/test-log/testers");
      const data = await res.json();
      const testerList = Array.isArray(data) ? data : [];
      setTesters(testerList);

      const summaryEntries = await Promise.all(
        testerList.map(async (testerId: string) => {
          try {
            const testerRes = await fetch(`/api/test-log/${testerId}`);
            const testerData = await testerRes.json();
            const testerEvents = Array.isArray(testerData)
              ? (testerData as TestEvent[])
              : [];
            const latest = getLastMeaningfulEvent(testerEvents);

            return [
              testerId,
              {
                eventCount: testerEvents.length,
                latestEventName: latest?.eventName ?? "-",
                latestActivity: latest?.timestamp ?? "",
              },
            ] as const;
          } catch {
            return [
              testerId,
              {
                eventCount: 0,
                latestEventName: "-",
                latestActivity: "",
              },
            ] as const;
          }
        }),
      );

      setTesterSummaries(Object.fromEntries(summaryEntries));
    }

    loadTesters();
  }, []);

  async function loadTester(testerId: string) {
    setSelectedTester(testerId);
    setLoading(true);

    const res = await fetch(`/api/test-log/${testerId}`);
    const data = await res.json();

    setEvents(Array.isArray(data) ? data.reverse() : []);
    setLoading(false);
  }

  const lastEvent = getLastMeaningfulEvent(events);
  const attentionPoints = getAttentionPoints(events);

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <h1 style={styles.title}>Falcus testlog</h1>
        <p style={styles.muted}>Se hvem der tester, og hvor de går i stå.</p>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Testere</h2>

          {testers.length === 0 && (
            <p style={styles.muted}>Ingen testere registreret endnu.</p>
          )}

          <div style={styles.testerGrid}>
            {testers.map((tester) => {
              const summary = testerSummaries[tester];

              return (
                <button
                  key={tester}
                  onClick={() => loadTester(tester)}
                  style={{
                    ...styles.testerButton,
                    borderColor:
                      selectedTester === tester
                        ? "#8B5CF6"
                        : "rgba(255,255,255,0.12)",
                  }}
                >
                  <span style={styles.testerName}>{tester}</span>
                  <span style={styles.testerMeta}>
                    {summary?.eventCount ?? 0} events
                  </span>
                  <span style={styles.testerMeta}>
                    Seneste: {summary?.latestEventName ?? "-"}
                  </span>
                  <span style={styles.testerMeta}>
                    {summary?.latestActivity
                      ? new Date(summary.latestActivity).toLocaleString("da-DK")
                      : "Ingen aktivitet"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {selectedTester ? `Log: ${selectedTester}` : "Vælg en tester"}
          </h2>

          {loading && <p style={styles.muted}>Henter events...</p>}

          {!loading && selectedTester && (
            <div style={styles.radarCard}>
              <h3 style={styles.radarTitle}>Radar</h3>
              <div style={styles.radarGrid}>
                <div>
                  <p style={styles.radarLabel}>Antal events</p>
                  <strong>{events.length}</strong>
                </div>
                <div>
                  <p style={styles.radarLabel}>Sidste aktivitet</p>
                  <strong>
                    {lastEvent
                      ? new Date(lastEvent.timestamp).toLocaleString("da-DK")
                      : "-"}
                  </strong>
                </div>
                <div>
                  <p style={styles.radarLabel}>Status</p>
                  <strong>{getFunnelStatus(events)}</strong>
                </div>
                <div>
                  <p style={styles.radarLabel}>Sandsynligt stop</p>
                  <strong>{getDropoffStep(events)}</strong>
                </div>
              </div>

              {attentionPoints.length > 0 && (
                <ul style={styles.attentionList}>
                  {attentionPoints.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {!loading && selectedTester && events.length === 0 && (
            <p style={styles.muted}>Ingen events endnu.</p>
          )}

          <div style={styles.eventList}>
            {events.map((event, index) => (
              <div key={`${event.timestamp}-${index}`} style={styles.eventCard}>
                <div style={styles.eventTop}>
                  <strong>{event.eventName}</strong>
                  <span style={styles.time}>
                    {new Date(event.timestamp).toLocaleString("da-DK")}
                  </span>
                </div>

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <pre style={styles.pre}>
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#06101f",
    color: "#F8FAFC",
    fontFamily: "Inter, Arial, sans-serif",
    padding: 20,
  },
  shell: {
    maxWidth: 760,
    margin: "0 auto",
  },
  title: {
    fontSize: 36,
    marginBottom: 6,
  },
  muted: {
    color: "rgba(255,255,255,0.65)",
  },
  card: {
    padding: 18,
    borderRadius: 22,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    marginTop: 16,
  },
  sectionTitle: {
    marginTop: 0,
    fontSize: 20,
  },
  testerGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  testerButton: {
    padding: "12px 16px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    display: "grid",
    gap: 4,
    minWidth: 240,
    textAlign: "left",
  },
  testerName: {
    fontWeight: 800,
    fontSize: 15,
  },
  testerMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  radarCard: {
    marginBottom: 14,
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(139,92,246,0.45)",
    background: "rgba(139,92,246,0.12)",
  },
  radarTitle: {
    margin: "0 0 10px",
  },
  radarGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },
  radarLabel: {
    margin: "0 0 4px",
    fontSize: 12,
    color: "rgba(255,255,255,0.72)",
  },
  attentionList: {
    margin: "12px 0 0",
    paddingLeft: 18,
    color: "#ddd6fe",
    fontSize: 13,
  },
  eventList: {
    display: "grid",
    gap: 10,
  },
  eventCard: {
    padding: 14,
    borderRadius: 16,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  eventTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
  },
  time: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  pre: {
    marginTop: 10,
    whiteSpace: "pre-wrap",
    fontSize: 12,
    color: "#C7D2FE",
  },
};
