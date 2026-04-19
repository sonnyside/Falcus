"use client";

import { useEffect, useMemo, useState } from "react";

type Area = {
  id: string;
  label: string;
  color: string;
  emoji: string;
};

type TaskStatus = "focus" | "queued";

type Task = {
  id: string;
  title: string;
  areaId: string;
  micro: string;
  status: TaskStatus;
};

const STORAGE_KEY = "falcus-v2";

const DEFAULT_AREAS: Area[] = [
  { id: "okonomi", label: "Økonomi", color: "#6C63FF", emoji: "💰" },
  { id: "hjem", label: "Hjem", color: "#32C27C", emoji: "🏠" },
  { id: "relationer", label: "Relationer", color: "#FF6B8A", emoji: "❤️" },
  { id: "krop", label: "Krop", color: "#F59E0B", emoji: "💪" },
  { id: "arbejde-skole", label: "Arbejde / Skole", color: "#38BDF8", emoji: "💼" },
  { id: "fri-tid", label: "Fri tid", color: "#A78BFA", emoji: "🌤️" },
];

type StoredState = {
  onboardingDone: boolean;
  selectedAreaIds: string[];
  customAreas: Area[];
  activeTasks: Task[];
  streak: number;
  completionsToday: number;
  lastActiveDate: string | null;
};

type Step = "onboarding" | "start" | "micro" | "focus" | "done";

const initialState: StoredState = {
  onboardingDone: false,
  selectedAreaIds: ["okonomi", "hjem", "relationer", "krop"],
  customAreas: [],
  activeTasks: [],
  streak: 0,
  completionsToday: 0,
  lastActiveDate: null,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): StoredState {
  if (typeof window === "undefined") return initialState;

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    return { ...initialState, ...JSON.parse(raw) };
  } catch {
    return initialState;
  }
}

function saveState(state: StoredState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function detectAreaId(text: string, allowedAreaIds: string[]): string {
  const t = normalize(text);

  const rules: Array<{ words: string[]; areaId: string }> = [
    { areaId: "okonomi", words: ["konto", "penge", "budget", "regning", "skat", "bank", "økonomi"] },
    { areaId: "hjem", words: ["ryd", "opvask", "tøj", "vask", "støvsug", "hjem", "køleskab", "skuffe"] },
    { areaId: "relationer", words: ["ring", "skriv", "besked", "mor", "far", "ven", "kæreste", "familie"] },
    { areaId: "krop", words: ["gå", "løb", "vand", "mad", "medicin", "søvn", "træn", "krop"] },
    { areaId: "arbejde-skole", words: ["mail", "arbejde", "møde", "opgave", "koncept", "kilde", "skole", "rapport"] },
    { areaId: "fri-tid", words: ["bog", "musik", "spil", "slap", "pause", "fri", "tegne", "film"] },
  ];

  for (const rule of rules) {
    if (!allowedAreaIds.includes(rule.areaId)) continue;
    if (rule.words.some((word) => t.includes(word))) return rule.areaId;
  }

  return allowedAreaIds[0] || "okonomi";
}

function microSuggestionsForTask(taskTitle: string, areaId: string): string[] {
  const t = normalize(taskTitle);

  if (areaId === "okonomi") return ["Åbn bank-appen", "Find regningen", "Se saldo"];
  if (areaId === "hjem") return ["Tag én ting", "Åbn skabet", "Gå hen til det"];
  if (areaId === "relationer") return ["Åbn beskeder", "Skriv hej", "Find personen"];
  if (areaId === "krop") return ["Tag sko på", "Hent vand", "Rejs dig op"];
  if (areaId === "arbejde-skole") {
    if (t.includes("koncept")) return ["Åbn dokumentet", "Find 1 kilde", "Skriv overskriften"];
    return ["Åbn dokumentet", "Skriv 1 linje", "Find næste fil"];
  }
  return ["Åbn det", "Tag første lille skridt", "Begynd i 2 min"];
}

function taskSuggestions(areaMap: Record<string, Area>, selectedAreaIds: string[]): Array<{ title: string; areaId: string }> {
  const base = [
    { title: "Tjek konto", areaId: "okonomi" },
    { title: "Læg én ting på plads", areaId: "hjem" },
    { title: "Ring til én", areaId: "relationer" },
    { title: "Tag sko på", areaId: "krop" },
    { title: "Svar på mail", areaId: "arbejde-skole" },
    { title: "Læs 2 sider", areaId: "fri-tid" },
  ];

  return base.filter((item) => selectedAreaIds.includes(item.areaId) && areaMap[item.areaId]).slice(0, 3);
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [appState, setAppState] = useState<StoredState>(initialState);
  const [step, setStep] = useState<Step>("start");

  const [customAreaInput, setCustomAreaInput] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [microInput, setMicroInput] = useState("");

  const [draftTaskTitle, setDraftTaskTitle] = useState("");
  const [draftAreaId, setDraftAreaId] = useState("");

  useEffect(() => {
    const loaded = loadState();
    const today = todayKey();

    if (loaded.lastActiveDate !== today) {
      loaded.completionsToday = 0;
    }

    setAppState(loaded);
    setStep(loaded.onboardingDone ? (loaded.activeTasks.length ? "focus" : "start") : "onboarding");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveState(appState);
  }, [appState, hydrated]);

  const allAreas = useMemo(() => [...DEFAULT_AREAS, ...appState.customAreas], [appState.customAreas]);

  const areaMap = useMemo(() => {
    return Object.fromEntries(allAreas.map((a) => [a.id, a]));
  }, [allAreas]);

  const selectedAreas = allAreas.filter((a) => appState.selectedAreaIds.includes(a.id));

  const suggestions = useMemo(() => taskSuggestions(areaMap, appState.selectedAreaIds), [areaMap, appState.selectedAreaIds]);

  const focusTask = appState.activeTasks.find((t) => t.status === "focus") || null;
  const queuedTasks = appState.activeTasks.filter((t) => t.status === "queued");

  function updateState(patch: Partial<StoredState>) {
    setAppState((prev) => ({ ...prev, ...patch }));
  }

  function toggleArea(areaId: string) {
    setAppState((prev) => {
      const exists = prev.selectedAreaIds.includes(areaId);
      const next = exists
        ? prev.selectedAreaIds.filter((id) => id !== areaId)
        : prev.selectedAreaIds.length < 6
        ? [...prev.selectedAreaIds, areaId]
        : prev.selectedAreaIds;

      return { ...prev, selectedAreaIds: next };
    });
  }

  function addCustomArea() {
    const label = customAreaInput.trim();
    if (!label) return;
    if (appState.customAreas.length >= 3) return;

    const area: Area = {
      id: `custom-${makeId()}`,
      label,
      color: "#64748B",
      emoji: "✨",
    };

    setAppState((prev) => ({
      ...prev,
      customAreas: [...prev.customAreas, area],
      selectedAreaIds: [...prev.selectedAreaIds, area.id],
    }));
    setCustomAreaInput("");
  }

  function finishOnboarding() {
    if (appState.selectedAreaIds.length === 0) return;
    updateState({ onboardingDone: true });
    setStep(appState.activeTasks.length ? "focus" : "start");
  }

  function beginTask(taskTitle: string, suggestedAreaId?: string) {
    const title = taskTitle.trim();
    if (!title) return;

    const areaId = suggestedAreaId || detectAreaId(title, appState.selectedAreaIds);
    setDraftTaskTitle(title);
    setDraftAreaId(areaId);
    setMicroInput("");
    setStep("micro");
  }

  function addTaskWithMicro(micro: string) {
    const cleanMicro = micro.trim();
    if (!cleanMicro || !draftTaskTitle || !draftAreaId) return;
    if (appState.activeTasks.length >= 3) {
      setStep("focus");
      return;
    }

    const nextTask: Task = {
      id: makeId(),
      title: draftTaskTitle,
      areaId: draftAreaId,
      micro: cleanMicro,
      status: appState.activeTasks.length === 0 ? "focus" : "queued",
    };

    setAppState((prev) => ({
      ...prev,
      activeTasks: [...prev.activeTasks, nextTask],
    }));

    setDraftTaskTitle("");
    setDraftAreaId("");
    setMicroInput("");
    setStep("focus");
  }

  function prioritizeTask(taskId: string) {
  setAppState((prev): StoredState => {
    const tasks: Task[] = prev.activeTasks.map((task): Task => ({
      ...task,
      status: (task.id === taskId ? "focus" : "queued") as TaskStatus,
    }));

    return {
      ...prev,
      activeTasks: tasks,
    };
  });

  setStep("focus");
}

  function completeFocusTask() {
  if (!focusTask) return;

  const today = todayKey();
  const hadActivityYesterday =
    appState.lastActiveDate &&
    new Date(today).getTime() - new Date(appState.lastActiveDate).getTime() <= 86400000;

  const nextStreak =
    appState.lastActiveDate === today
      ? appState.streak
      : hadActivityYesterday
      ? appState.streak + 1
      : 1;

  const remaining: Task[] = appState.activeTasks.filter((t) => t.id !== focusTask.id);

  const promoted: Task[] = remaining.map((t, index): Task => ({
    ...t,
    status: (index === 0 ? "focus" : "queued") as TaskStatus,
  }));

  setAppState((prev): StoredState => ({
    ...prev,
    activeTasks: promoted,
    streak: nextStreak,
    completionsToday: prev.completionsToday + 1,
    lastActiveDate: today,
  }));

  setStep("done");
}

  if (!hydrated) {
    return <div style={styles.loading}>Laster Falcus...</div>;
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <header style={styles.header}>
          <div>
            <div style={styles.logoRow}>
              <span style={styles.logoMark}>🦅</span>
              <span style={styles.logoText}>Falcus</span>
            </div>
            <p style={styles.headerMeta}>Kom i gang. Ikke færdiggør.</p>
          </div>

          <div style={styles.badge}>
            🔥 {appState.streak}
          </div>
        </header>

        {step === "onboarding" && (
          <section style={styles.card}>
            <div style={styles.eyebrow}>Første gang</div>
            <h1 style={styles.title}>Hvad er vigtigt i dit liv?</h1>
            <p style={styles.textMuted}>Vælg det vi skal hjælpe dig med at huske. Du kan altid ændre det senere.</p>

            <div style={styles.areaGrid}>
              {allAreas.map((area) => {
                const active = appState.selectedAreaIds.includes(area.id);
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    style={{
                      ...styles.areaButton,
                      borderColor: active ? area.color : "rgba(255,255,255,0.12)",
                      background: active ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <span>{area.emoji}</span>
                    <span>{area.label}</span>
                  </button>
                );
              })}
            </div>

            {appState.customAreas.length < 3 && (
              <div style={styles.inlineRow}>
                <input
                  value={customAreaInput}
                  onChange={(e) => setCustomAreaInput(e.target.value)}
                  placeholder="Tilføj eget område"
                  style={styles.input}
                />
                <button onClick={addCustomArea} style={styles.smallButton}>
                  Tilføj
                </button>
              </div>
            )}

            <button onClick={finishOnboarding} style={styles.primaryButton}>
              Fortsæt
            </button>
          </section>
        )}

        {step === "start" && (
          <>
            <section style={styles.heroCard}>
              <div>
                <div style={styles.eyebrow}>Daglig start</div>
                <h1 style={styles.title}>Hvad trækker i dig lige nu?</h1>
                <p style={styles.textMuted}>Skriv selv eller vælg et forslag. Du kan have op til 3 aktive.</p>
              </div>
              <div style={styles.heroBird}>🦅</div>
            </section>

            <section style={styles.card}>
              <input
                value={taskInput}
                onChange={(e) => setTaskInput(e.target.value)}
                placeholder="Skriv selv..."
                style={styles.bigInput}
              />

              <button
                onClick={() => beginTask(taskInput)}
                style={{
                  ...styles.primaryButton,
                  opacity: taskInput.trim() ? 1 : 0.45,
                  cursor: taskInput.trim() ? "pointer" : "not-allowed",
                }}
                disabled={!taskInput.trim()}
              >
                Videre
              </button>

              <div style={styles.sectionLabel}>Forslag til dig</div>
              <div style={styles.suggestionGrid}>
                {suggestions.map((s) => {
                  const area = areaMap[s.areaId];
                  return (
                    <button
                      key={`${s.areaId}-${s.title}`}
                      onClick={() => beginTask(s.title, s.areaId)}
                      style={{
                        ...styles.suggestionCard,
                        borderColor: area?.color || "#334155",
                        boxShadow: `0 0 0 1px ${area?.color || "#334155"} inset`,
                      }}
                    >
                      <div style={styles.suggestionTitle}>{s.title}</div>
                      <div style={styles.suggestionMeta}>
                        <span>{area?.emoji}</span>
                        <span>{area?.label}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section style={styles.card}>
              <div style={styles.rowBetween}>
                <div style={styles.sectionLabel}>Aktive nu</div>
                <div style={styles.textMutedSmall}>Maks 3</div>
              </div>

              {appState.activeTasks.length === 0 ? (
                <div style={styles.emptyBox}>Når du vælger noget, holder Falcus det for dig her.</div>
              ) : (
                <div style={styles.activeGrid}>
                  {appState.activeTasks.map((task) => {
                    const area = areaMap[task.areaId];
                    const isFocus = task.status === "focus";
                    return (
                      <button
                        key={task.id}
                        onClick={() => prioritizeTask(task.id)}
                        style={{
                          ...styles.activeCard,
                          borderColor: isFocus ? "#F5B942" : "rgba(255,255,255,0.08)",
                        }}
                      >
                        <div style={styles.activeTag}>{isFocus ? "Fokus nu" : "På vej"}</div>
                        <div style={styles.activeTitle}>{task.micro}</div>
                        <div style={styles.activeMeta}>{area?.label || "Andet"}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {step === "micro" && (
          <section style={styles.card}>
            <button onClick={() => setStep("start")} style={styles.backButton}>
              ← Tilbage
            </button>

            <div style={styles.eyebrow}>Gør det mindre</div>
            <h1 style={styles.title}>Hvad er den mindste start?</h1>
            <p style={styles.taskPreview}>Din opgave: {draftTaskTitle}</p>

            <input
              value={microInput}
              onChange={(e) => setMicroInput(e.target.value)}
              placeholder="Skriv mikrohandling..."
              style={styles.bigInput}
            />

            <div style={styles.sectionLabel}>Forslag</div>
            <div style={styles.microList}>
              {microSuggestionsForTask(draftTaskTitle, draftAreaId).map((micro) => (
                <button
                  key={micro}
                  onClick={() => setMicroInput(micro)}
                  style={styles.microSuggestion}
                >
                  {micro}
                </button>
              ))}
            </div>

            <button
              onClick={() => addTaskWithMicro(microInput)}
              style={{
                ...styles.primaryButton,
                opacity: microInput.trim() ? 1 : 0.45,
                cursor: microInput.trim() ? "pointer" : "not-allowed",
              }}
              disabled={!microInput.trim()}
            >
              Start
            </button>
          </section>
        )}

        {step === "focus" && (
          <section style={styles.focusCard}>
            <div style={styles.rowBetween}>
              <div style={styles.eyebrowFocus}>Fokus nu</div>
              <button onClick={() => setStep("start")} style={styles.ghostIcon}>
                ＋
              </button>
            </div>

            {focusTask ? (
              <>
                <div style={styles.focusMain}>
                  <div>
                    <div style={styles.focusLabel}>{areaMap[focusTask.areaId]?.label || "Andet"}</div>
                    <h1 style={styles.focusTitle}>{focusTask.micro}</h1>
                    <p style={styles.textMuted}>{focusTask.title}</p>
                  </div>
                  <div style={styles.focusBird}>🦅</div>
                </div>

                <div style={styles.progressRow}>
                  <div style={styles.textMutedSmall}>I dag: {appState.completionsToday}</div>
                  <div style={styles.textMutedSmall}>
                    {Math.min(appState.activeTasks.length, 3)} / 3 aktive
                  </div>
                </div>

                <button onClick={completeFocusTask} style={styles.ctaDone}>
                  Marker som gjort
                </button>

                {queuedTasks.length > 0 && (
                  <div style={styles.queuedBlock}>
                    <div style={styles.sectionLabel}>På vej</div>
                    <div style={styles.queuedMiniGrid}>
                      {queuedTasks.map((task) => (
                        <button key={task.id} onClick={() => prioritizeTask(task.id)} style={styles.queuedMini}>
                          <div style={styles.queuedMiniTitle}>{task.micro}</div>
                          <div style={styles.textMutedSmall}>{areaMap[task.areaId]?.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 style={styles.title}>Intet i fokus endnu</h1>
                <p style={styles.textMuted}>Vælg noget at gå i gang med.</p>
                <button onClick={() => setStep("start")} style={styles.primaryButton}>
                  Vælg start
                </button>
              </>
            )}
          </section>
        )}

        {step === "done" && (
          <section style={styles.card}>
            <div style={styles.doneBig}>God start ✨</div>
            <p style={styles.textMuted}>Du kom i gang. Det er det vigtige.</p>

            <div style={styles.statsRow}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>🔥 {appState.streak}</div>
                <div style={styles.textMutedSmall}>streak</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{appState.completionsToday}</div>
                <div style={styles.textMutedSmall}>løst i dag</div>
              </div>
            </div>

            <div style={styles.inlineRow}>
              <button onClick={() => setStep(appState.activeTasks.length ? "focus" : "start")} style={styles.secondaryButton}>
                Færdig for nu
              </button>
              <button onClick={() => setStep("start")} style={styles.primaryButton}>
                Tag én mere
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(86,86,255,0.24), transparent 30%), linear-gradient(180deg, #081120 0%, #0b1327 100%)",
    color: "#F8FAFC",
    fontFamily: "Inter, Arial, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 460,
    margin: "0 auto",
    padding: "20px 16px 40px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoMark: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: -0.5,
  },
  headerMeta: {
    margin: "4px 0 0",
    color: "rgba(255,255,255,0.65)",
    fontSize: 14,
  },
  badge: {
    padding: "8px 12px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.08)",
    fontWeight: 700,
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#081120",
    color: "#fff",
    fontFamily: "Inter, Arial, sans-serif",
  },
  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(28,42,84,0.95), rgba(14,20,38,0.95))",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 14,
    gap: 12,
  },
  heroBird: {
    fontSize: 44,
    lineHeight: 1,
  },
  card: {
    padding: 18,
    borderRadius: 24,
    background: "rgba(12, 18, 36, 0.88)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.24)",
    marginBottom: 14,
  },
  focusCard: {
    padding: 18,
    borderRadius: 28,
    background: "linear-gradient(180deg, rgba(12,34,31,0.95), rgba(9,18,30,0.98))",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.28)",
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 13,
    color: "#8B5CF6",
    fontWeight: 700,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  eyebrowFocus: {
    fontSize: 13,
    color: "#67E8F9",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    margin: 0,
    fontSize: 32,
    lineHeight: 1.08,
    letterSpacing: -1,
  },
  textMuted: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 15,
    lineHeight: 1.45,
  },
  textMutedSmall: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
  },
  areaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    margin: "16px 0",
  },
  areaButton: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 12px",
    borderRadius: 16,
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.03)",
    fontWeight: 700,
    cursor: "pointer",
  },
  inlineRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginTop: 14,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    padding: "0 14px",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    outline: "none",
    fontSize: 15,
  },
  bigInput: {
    width: "100%",
    height: 58,
    borderRadius: 18,
    padding: "0 16px",
    border: "1px solid rgba(115,115,255,0.5)",
    background: "rgba(16,24,48,0.9)",
    color: "#fff",
    outline: "none",
    fontSize: 18,
    boxSizing: "border-box",
    marginBottom: 12,
  },
  smallButton: {
    height: 46,
    padding: "0 14px",
    borderRadius: 14,
    border: "none",
    background: "#334155",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
  },
  primaryButton: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    border: "none",
    background: "linear-gradient(90deg, #5B5BF7, #7C3AED)",
    color: "#fff",
    fontSize: 18,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(92,92,247,0.35)",
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 800,
    color: "rgba(255,255,255,0.88)",
    margin: "8px 0 10px",
  },
  suggestionGrid: {
    display: "grid",
    gap: 10,
  },
  suggestionCard: {
    textAlign: "left",
    padding: 16,
    borderRadius: 20,
    background: "linear-gradient(180deg, rgba(28,41,74,0.85), rgba(17,24,39,0.95))",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
  },
  suggestionTitle: {
    fontSize: 22,
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 8,
  },
  suggestionMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    color: "rgba(255,255,255,0.62)",
    fontSize: 13,
  },
  rowBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emptyBox: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
  },
  activeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
  },
  activeCard: {
    textAlign: "left",
    minHeight: 124,
    padding: 14,
    borderRadius: 20,
    background: "linear-gradient(180deg, rgba(18,27,54,0.95), rgba(10,17,30,0.95))",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#fff",
    cursor: "pointer",
  },
  activeTag: {
    fontSize: 11,
    fontWeight: 800,
    color: "#F5B942",
    marginBottom: 10,
    textTransform: "uppercase",
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 800,
    lineHeight: 1.1,
    marginBottom: 8,
  },
  activeMeta: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
  },
  backButton: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    marginBottom: 12,
    cursor: "pointer",
    padding: 0,
  },
  taskPreview: {
    marginTop: 4,
    color: "#F8FAFC",
    fontWeight: 700,
    fontSize: 16,
  },
  microList: {
    display: "grid",
    gap: 10,
    marginBottom: 14,
  },
  microSuggestion: {
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  ghostIcon: {
    width: 36,
    height: 36,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    cursor: "pointer",
  },
  focusMain: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-end",
    marginTop: 14,
  },
  focusLabel: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(103,232,249,0.14)",
    color: "#A5F3FC",
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
  },
  focusTitle: {
    margin: 0,
    fontSize: 52,
    lineHeight: 0.95,
    letterSpacing: -2,
  },
  focusBird: {
    fontSize: 72,
    lineHeight: 1,
  },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 16,
    marginBottom: 16,
  },
  ctaDone: {
    width: "100%",
    height: 64,
    borderRadius: 22,
    border: "none",
    background: "#F59E0B",
    color: "#111827",
    fontWeight: 900,
    fontSize: 22,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(245,158,11,0.28)",
  },
  queuedBlock: {
    marginTop: 16,
  },
  queuedMiniGrid: {
    display: "grid",
    gap: 10,
  },
  queuedMini: {
    textAlign: "left",
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    cursor: "pointer",
  },
  queuedMiniTitle: {
    fontSize: 18,
    fontWeight: 800,
    marginBottom: 4,
  },
  doneBig: {
    fontSize: 38,
    fontWeight: 900,
    letterSpacing: -1,
    marginBottom: 8,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    margin: "16px 0",
  },
  statBox: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 900,
  },
};