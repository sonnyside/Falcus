"use client";

import { useEffect, useMemo, useState } from "react";

type TestEvent = {
  testerId: string;
  eventName: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

type Tester = {
  id: string;
  name?: string;
};

function getAttentionPoints(events: TestEvent[]): string[] {
  const points: string[] = [];

  if (events.length === 0) {
    return ["Ingen events fundet for den valgte tester endnu."];
  }

  const hasError = events.some((event) => event.eventName.toLowerCase().includes("error"));
  if (hasError) {
    points.push("Der er registreret mindst ét event med fejlindikator.");
  }

  const hasSessionStart = events.some((event) => event.eventName === "session_start");
  if (!hasSessionStart) {
    points.push("Der mangler et session_start-event i loggen.");
  }

  const latest = events[0];
  if (latest) {
    points.push(`Seneste event: ${latest.eventName}.`);
  }

  return points;
}

export default function TestLogPage() {
  const [testers, setTesters] = useState<Tester[]>([]);
  const [selectedTesterId, setSelectedTesterId] = useState<string>("");
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [loadingTesters, setLoadingTesters] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    async function loadTesters() {
      try {
        setLoadingTesters(true);
        setError("");

        const response = await fetch("/api/test-log/testers", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Kunne ikke hente testere");
        }

        const data = (await response.json()) as Tester[];
        setTesters(data);

        if (data.length > 0) {
          setSelectedTesterId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukendt fejl ved hentning af testere");
      } finally {
        setLoadingTesters(false);
      }
    }

    loadTesters();
  }, []);

  useEffect(() => {
    if (!selectedTesterId) {
      setEvents([]);
      return;
    }

    async function loadEvents() {
      try {
        setLoadingEvents(true);
        setError("");

        const response = await fetch(`/api/test-log/${selectedTesterId}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Kunne ikke hente events");
        }

        const data = (await response.json()) as TestEvent[];
        const sortedEvents = [...data].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        setEvents(sortedEvents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ukendt fejl ved hentning af events");
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }

    loadEvents();
  }, [selectedTesterId]);

  const attentionPoints = useMemo(() => getAttentionPoints(events), [events]);

  return (
    <main style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <h1>Test-log</h1>

      <section style={{ marginTop: "1rem" }}>
        <h2>Testere</h2>
        {loadingTesters ? (
          <p>Henter testere…</p>
        ) : testers.length === 0 ? (
          <p>Ingen testere fundet.</p>
        ) : (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {testers.map((tester) => (
              <button
                key={tester.id}
                type="button"
                onClick={() => setSelectedTesterId(tester.id)}
                style={{
                  padding: "0.5rem 0.8rem",
                  borderRadius: 8,
                  border: tester.id === selectedTesterId ? "2px solid #2563eb" : "1px solid #cbd5e1",
                  background: tester.id === selectedTesterId ? "#dbeafe" : "#fff",
                  cursor: "pointer",
                }}
              >
                {tester.name ?? tester.id}
              </button>
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Events</h2>
        {loadingEvents ? (
          <p>Henter events…</p>
        ) : events.length === 0 ? (
          <p>Ingen events at vise.</p>
        ) : (
          <ul style={{ display: "grid", gap: "0.75rem", paddingLeft: 0, listStyle: "none" }}>
            {events.map((event, index) => (
              <li key={`${event.testerId}-${event.timestamp}-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem" }}>
                <div><strong>{event.eventName}</strong></div>
                <div>Tester: {event.testerId}</div>
                <div>Tid: {new Date(event.timestamp).toLocaleString("da-DK")}</div>
                {event.metadata ? (
                  <pre style={{ marginTop: "0.5rem", background: "#f8fafc", padding: "0.5rem", borderRadius: 6, overflowX: "auto" }}>
                    {JSON.stringify(event.metadata, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: "1.5rem" }}>
        <h2>Opmærksomhedspunkter</h2>
        <ul>
          {attentionPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      {error ? <p style={{ color: "#dc2626", marginTop: "1rem" }}>{error}</p> : null}
    </main>
  );
}
