"use client";

import { CSSProperties, useMemo, useState } from "react";

type TestEvent = {
  id: string;
  tester: string;
  event: string;
  timestamp: string;
};

function getAttentionPoints(events: TestEvent[]) {
  const has = (eventName: string) => events.some((event) => event.event === eventName);
  const count = (eventName: string) => events.filter((event) => event.event === eventName).length;

  const points: string[] = [];

  if (has("app_opened") && !has("area_selected")) {
    points.push("Åbnede appen, men valgte ikke et område.");
  }

  if (has("area_selected") && !has("task_confirmed")) {
    points.push("Valgte område, men bekræftede ikke en opgave.");
  }

  if (has("task_confirmed") && !has("draft_saved")) {
    points.push("Skrev/bekræftede opgave, men gemte ikke mikrohandling.");
  }

  if (has("draft_saved") && !has("focus_created")) {
    points.push("Gemte en opgave, men kom ikke frem til fokus.");
  }

  if (has("focus_created") && !has("focus_completed")) {
    points.push("Oprettede fokus, men markerede ikke noget som gjort.");
  }

  if (count("app_opened") > 1 && !has("draft_saved")) {
    points.push("Åbnede appen flere gange uden at gemme en opgave.");
  }

  if (count("draft_saved") > 1 && !has("focus_created")) {
    points.push("Lavede flere opgaver, men kom ikke videre til fokus.");
  }

  return points;
}

const sampleEvents: TestEvent[] = [];

export default function TestLogPage() {
  const [selectedTester, setSelectedTester] = useState("");
  const [loading] = useState(false);

  const testers = useMemo(
    () => Array.from(new Set(sampleEvents.map((event) => event.tester))),
    []
  );

  const selectedEvents = useMemo(
    () => sampleEvents.filter((event) => event.tester === selectedTester),
    [selectedTester]
  );

  const attentionPoints = useMemo(
    () => getAttentionPoints(selectedEvents),
    [selectedEvents]
  );

  return (
    <main style={styles.page}>
      <h1 style={styles.title}>Testlog admin</h1>

      <div style={styles.controls}>
        <label style={styles.label} htmlFor="tester-select">Vælg tester</label>
        <select
          id="tester-select"
          style={styles.select}
          value={selectedTester}
          onChange={(event) => setSelectedTester(event.target.value)}
        >
          <option value="">Vælg...</option>
          {testers.map((tester) => (
            <option key={tester} value={tester}>{tester}</option>
          ))}
        </select>
      </div>

      {selectedTester && !loading && attentionPoints.length > 0 && (
        <section style={styles.attentionSection}>
          <h2 style={styles.sectionTitle}>Opmærksomhedspunkter</h2>
          <div style={styles.attentionList}>
            {attentionPoints.map((point) => (
              <article key={point} style={styles.attentionCard}>
                <span style={styles.warningIcon}>⚠️</span>
                <span style={styles.attentionText}>{point}</span>
              </article>
            ))}
          </div>
        </section>
      )}

      <section style={styles.eventsSection}>
        <h2 style={styles.sectionTitle}>Hændelser</h2>
        {selectedEvents.length === 0 ? (
          <p style={styles.empty}>Ingen hændelser for valgt tester.</p>
        ) : (
          <ul style={styles.eventList}>
            {selectedEvents.map((event) => (
              <li key={event.id} style={styles.eventItem}>
                <strong style={styles.eventName}>{event.event}</strong>
                <span style={styles.eventTimestamp}>{event.timestamp}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0b1220",
    color: "#e2e8f0",
    padding: "24px",
    fontFamily: "Inter, sans-serif",
  },
  title: {
    marginBottom: "16px",
  },
  controls: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#94a3b8",
  },
  select: {
    width: "100%",
    maxWidth: "280px",
    backgroundColor: "#111827",
    color: "#e2e8f0",
    border: "1px solid #334155",
    borderRadius: "8px",
    padding: "10px",
  },
  attentionSection: {
    marginBottom: "20px",
  },
  sectionTitle: {
    marginBottom: "10px",
  },
  attentionList: {
    display: "grid",
    gap: "10px",
  },
  attentionCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    padding: "12px",
    backgroundColor: "#3a2415",
    border: "1px solid #92400e",
    borderRadius: "10px",
  },
  warningIcon: {
    lineHeight: 1.2,
  },
  attentionText: {
    color: "#fde68a",
  },
  eventsSection: {
    marginTop: "8px",
  },
  empty: {
    color: "#94a3b8",
  },
  eventList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "grid",
    gap: "8px",
  },
  eventItem: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 12px",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    backgroundColor: "#111827",
  },
  eventName: {
    color: "#cbd5e1",
  },
  eventTimestamp: {
    color: "#94a3b8",
    fontSize: "12px",
  },
};
