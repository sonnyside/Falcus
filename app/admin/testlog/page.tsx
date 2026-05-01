"use client";

import { useEffect, useState } from "react";

type TestEvent = {
  testerId: string;
  eventName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export default function TestLogAdminPage() {
  const [testers, setTesters] = useState<string[]>([]);
  const [selectedTester, setSelectedTester] = useState<string | null>(null);
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/test-log/testers")
      .then((res) => res.json())
      .then((data) => setTesters(Array.isArray(data) ? data : []));
  }, []);

  async function loadTester(testerId: string) {
    setSelectedTester(testerId);
    setLoading(true);

    const res = await fetch(`/api/test-log/${testerId}`);
    const data = await res.json();

    setEvents(Array.isArray(data) ? data.reverse() : []);
    setLoading(false);
  }

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
            {testers.map((tester) => (
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
                {tester}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {selectedTester ? `Log: ${selectedTester}` : "Vælg en tester"}
          </h2>

          {loading && <p style={styles.muted}>Henter events...</p>}

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
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
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