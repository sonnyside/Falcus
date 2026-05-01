"use client";

import { logTestEvent } from "@/lib/testLog";
import { getTesterId } from "@/lib/tester";
import { useEffect, useMemo, useState } from "react";

type Area = { id: string; label: string; emoji: string; color: string };
type DraftTask = { areaId: string; title: string; micro: string };
type ActiveTaskStatus = "focus" | "queued";

type ActiveTask = {
  id: string;
  areaId: string;
  title: string;
  micro: string;
  priority: 1 | 2 | 3;
  status: ActiveTaskStatus;
};

type Step =
  | "explainer"
  | "onboarding"
  | "pick-area"
  | "pick-task"
  | "pick-micro"
  | "add-more"
  | "prioritize"
  | "focus"
  | "celebrate";

type AppState = {
  hasSeenExplainer: boolean;
  onboardingDone: boolean;
  selectedAreaIds: string[];
  customAreas: Area[];
  activeTasks: ActiveTask[];

  draftTasks: DraftTask[];
  savedStep: Step;
  selectedAreaId: string;
  taskInput: string;
  microInput: string;

  streak: number;
  startedToday: number;
  dopaminePoints: number;
  lastStartedDate: string | null;
};

const STORAGE_KEY = "falcus-v8";

const DEFAULT_AREAS: Area[] = [
  { id: "okonomi", label: "Økonomi", emoji: "💰", color: "#8B5CF6" },
  { id: "hjem", label: "Hjem", emoji: "🏠", color: "#22C55E" },
  { id: "relationer", label: "Relationer", emoji: "❤️", color: "#EC4899" },
  { id: "krop", label: "Krop", emoji: "💪", color: "#F59E0B" },
  { id: "arbejde-skole", label: "Arbejde / Skole", emoji: "💼", color: "#38BDF8" },
  { id: "fri-tid", label: "Fri tid", emoji: "🌤️", color: "#A78BFA" },
];

const INITIAL_STATE: AppState = {
  hasSeenExplainer: false,
  onboardingDone: false,
  selectedAreaIds: [],
  customAreas: [],
  activeTasks: [],

  draftTasks: [],
  savedStep: "onboarding",
  selectedAreaId: "",
  taskInput: "",
  microInput: "",

  streak: 0,
  startedToday: 0,
  dopaminePoints: 0,
  lastStartedDate: null,
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadState(): AppState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    return { ...INITIAL_STATE, ...JSON.parse(raw) };
  } catch {
    return INITIAL_STATE;
  }
}

function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

function examplesForArea(areaId: string): string[] {
  switch (areaId) {
    case "okonomi":
      return ["betale en regning", "åbne budgettet", "tjekke min konto"];
    case "hjem":
      return ["rydde bordet", "tage én ting", "tømme opvaskeren"];
    case "relationer":
      return ["skrive til én", "ringe til min mor", "svare på en besked"];
    case "krop":
      return ["tage sko på", "drikke vand", "spise morgenmad"];
    case "arbejde-skole":
      return ["svare på en mail", "åbne et dokument", "finde 1 kilde"];
    case "fri-tid":
      return ["læse 2 sider", "lytte til musik", "tegne i 5 min"];
    default:
      return ["skrive det ned", "tage første skridt", "finde det frem"];
  }
}

function microSuggestions(areaId: string, taskTitle: string): string[] {
  const t = taskTitle.toLowerCase();

  if (areaId === "okonomi") {
    if (t.includes("regning")) return ["Åbn bank-appen", "Find regningen", "Se saldo"];
    if (t.includes("konto")) return ["Åbn bank-appen", "Log ind", "Se saldo"];
    if (t.includes("budget")) return ["Åbn budgettet", "Find tallene", "Se første post"];
    return ["Åbn bank-appen", "Find det frem", "Se første tal"];
  }

  if (areaId === "hjem") return ["Gå hen til det", "Tag én ting", "Åbn skabet"];
  if (areaId === "relationer") return ["Åbn beskeder", "Skriv hej", "Find kontakten"];
  if (areaId === "krop") return ["Rejs dig op", "Hent vand", "Tag sko på"];

  if (areaId === "arbejde-skole") {
    if (t.includes("koncept")) return ["Åbn dokumentet", "Find 1 kilde", "Skriv overskriften"];
    if (t.includes("mail")) return ["Åbn mail", "Find tråden", "Skriv første linje"];
    return ["Åbn dokumentet", "Find filen", "Skriv 1 linje"];
  }

  if (areaId === "fri-tid") return ["Find bogen", "Åbn appen", "Sæt dig ned"];
  return ["Åbn det", "Find det frem", "Tag første lille skridt"];
}

function reprioritize(tasks: ActiveTask[]): ActiveTask[] {
  return tasks.map((task, index) => ({
    ...task,
    priority: (index + 1) as 1 | 2 | 3,
    status: index === 0 ? "focus" : "queued",
  }));
}

function activeToDraft(tasks: ActiveTask[]): DraftTask[] {
  return [...tasks]
    .sort((a, b) => a.priority - b.priority)
    .map((task) => ({
      areaId: task.areaId,
      title: task.title,
      micro: task.micro,
    }));
}

function buildWidgetUrl(
  origin: string,
  focusTask: ActiveTask | null,
  queuedTasks: ActiveTask[],
  areaMap: Record<string, Area>,
  streak: number,
  points: number
) {
  const params = new URLSearchParams();

  params.set("title", focusTask?.title || "Vælg fokus");
  params.set("micro", focusTask?.micro || "Vælg handling for lige nu");
  params.set("area", focusTask ? areaMap[focusTask.areaId]?.label || "" : "");
  params.set("emoji", focusTask ? areaMap[focusTask.areaId]?.emoji || "🦅" : "🦅");
  params.set("streak", String(streak));
  params.set("points", String(points));
  params.set("queuedCount", String(queuedTasks.length));

  queuedTasks.slice(0, 2).forEach((task, index) => {
    params.set(`queued${index + 1}Title`, task.title);
    params.set(`queued${index + 1}Micro`, task.micro);
    params.set(`queued${index + 1}Area`, areaMap[task.areaId]?.label || "");
  });

  return `${origin}/api/widget?${params.toString()}`;
}

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [appState, setAppState] = useState<AppState>(INITIAL_STATE);
  const [step, setStep] = useState<Step>("onboarding");

  const [testerId, setTesterId] = useState("default");

  const [customAreaInput, setCustomAreaInput] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [microInput, setMicroInput] = useState("");
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [lastReward, setLastReward] = useState(0);
  const [widgetCopied, setWidgetCopied] = useState(false);

  useEffect(() => {
  const loaded = loadState();
  const currentTesterId = getTesterId();
setTesterId(currentTesterId);

logTestEvent(currentTesterId, "app_opened");
  const today = todayKey();

  if (loaded.lastStartedDate !== today) {
    loaded.startedToday = 0;
  }

  setAppState(loaded);

  setDraftTasks(loaded.draftTasks || []);
  setSelectedAreaId(loaded.selectedAreaId || "");
  setTaskInput(loaded.taskInput || "");
  setMicroInput(loaded.microInput || "");

  if (!loaded.hasSeenExplainer) {
    setStep("explainer");
  } else if (!loaded.onboardingDone) {
    setStep("onboarding");
  } else if (loaded.savedStep && loaded.savedStep !== "celebrate") {
    setStep(loaded.savedStep);
  } else if (loaded.activeTasks.length > 0) {
    setStep("focus");
  } else {
    setStep("pick-area");
  }

  setHydrated(true);
}, []);

useEffect(() => {
  if (!hydrated) return;

  setAppState((prev) => ({
    ...prev,
    draftTasks,
    savedStep: step === "explainer" ? prev.savedStep : step,
    selectedAreaId,
    taskInput,
    microInput,
  }));
}, [
  hydrated,
  draftTasks,
  step,
  selectedAreaId,
  taskInput,
  microInput,
]);

  const allAreas = useMemo(() => [...DEFAULT_AREAS, ...appState.customAreas], [appState.customAreas]);

  const areaMap = useMemo<Record<string, Area>>(() => {
    return Object.fromEntries(allAreas.map((area) => [area.id, area]));
  }, [allAreas]);

  useEffect(() => {
  if (!hydrated) return;

  saveState(appState);

  const focusTask = appState.activeTasks.find((task) => task.status === "focus") || null;
  const queuedTasks = appState.activeTasks.filter((task) => task.status === "queued");

  const payload = {
    title: focusTask?.title || "Vælg fokus",
    micro: focusTask?.micro || "Vælg handling for lige nu",
    area: focusTask ? areaMap[focusTask.areaId]?.label || "" : "",
    emoji: focusTask ? areaMap[focusTask.areaId]?.emoji || "🦅" : "🦅",
    streak: appState.streak,
    points: appState.dopaminePoints,
    queuedCount: queuedTasks.length,
    queued1Title: queuedTasks[0]?.title || "",
    queued1Micro: queuedTasks[0]?.micro || "",
    queued1Area: queuedTasks[0] ? areaMap[queuedTasks[0].areaId]?.label || "" : "",
    queued2Title: queuedTasks[1]?.title || "",
    queued2Micro: queuedTasks[1]?.micro || "",
    queued2Area: queuedTasks[1] ? areaMap[queuedTasks[1].areaId]?.label || "" : "",
  };

  fetch("/api/widget/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}, [appState, hydrated, areaMap]);

  const selectedAreas = useMemo<Area[]>(() => {
    const chosen = allAreas.filter((area) => appState.selectedAreaIds.includes(area.id));

    if (appState.onboardingDone && chosen.length === 0) {
      return DEFAULT_AREAS;
    }

    return chosen;
  }, [allAreas, appState.selectedAreaIds, appState.onboardingDone]);

  useEffect(() => {
    if (appState.onboardingDone && appState.selectedAreaIds.length === 0) {
      setAppState((prev) => ({
        ...prev,
        selectedAreaIds: DEFAULT_AREAS.map((area) => area.id),
      }));
    }
  }, [appState.onboardingDone, appState.selectedAreaIds.length]);

  const selectedArea = selectedAreas.find((area) => area.id === selectedAreaId) || null;
  const focusTask = appState.activeTasks.find((task) => task.status === "focus") || null;
  const queuedTasks = appState.activeTasks.filter((task) => task.status === "queued");

  const widgetUrl =
    typeof window !== "undefined"
      ? buildWidgetUrl(
          window.location.origin,
          focusTask,
          queuedTasks,
          areaMap,
          appState.streak,
          appState.dopaminePoints
        )
      : "";

  function updateState(patch: Partial<AppState>) {
    setAppState((prev) => ({ ...prev, ...patch }));
  }

  function skipExplainer() {
  setAppState((prev) => {
    const nextStep =
      prev.savedStep && prev.savedStep !== "explainer"
        ? prev.savedStep
        : prev.onboardingDone
          ? "pick-area"
          : "onboarding";

    setStep(nextStep);

    return {
      ...prev,
      hasSeenExplainer: true,
      savedStep: nextStep,
    };
  });
}

function showExplainerAgain() {
  setAppState((prev) => ({
    ...prev,
    savedStep: step === "explainer" ? prev.savedStep : step,
  }));

  setStep("explainer");
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
    if (!label || appState.customAreas.length >= 3) return;

    const newArea: Area = {
      id: `custom-${makeId()}`,
      label,
      emoji: "✨",
      color: "#64748B",
    };

    setAppState((prev) => ({
      ...prev,
      customAreas: [...prev.customAreas, newArea],
      selectedAreaIds: [...prev.selectedAreaIds, newArea.id],
    }));

    setCustomAreaInput("");
  }

  function finishOnboarding() {
    if (appState.selectedAreaIds.length === 0) return;
    updateState({ onboardingDone: true });
    setStep("pick-area");
  }

  function chooseArea(areaId: string) {
    setSelectedAreaId(areaId);
    setTaskInput("");
    setStep("pick-task");
    logTestEvent(testerId, "area_selected", { areaId });
  }

  function chooseTask(taskTitle: string) {
    setTaskInput(taskTitle);
    setMicroInput("");
    setStep("pick-micro");
    logTestEvent(testerId, "task_confirmed", { taskTitle });
  }

  function saveDraftTask() {
    if (!selectedAreaId || !taskInput.trim() || !microInput.trim()) return;
    if (draftTasks.length >= 3) return;

    logTestEvent(testerId, "draft_saved", {
  areaId: selectedAreaId,
  task: taskInput.trim(),
  micro: microInput.trim(),
});

    const next: DraftTask[] = [
      ...draftTasks,
      {
        areaId: selectedAreaId,
        title: taskInput.trim(),
        micro: microInput.trim(),
      },
    ];

    setDraftTasks(next);
    setSelectedAreaId("");
    setTaskInput("");
    setMicroInput("");

    setStep(next.length >= 3 ? "prioritize" : "add-more");
  }

  function goToAddAnother() {
    setStep("pick-area");
  }

  function goToPrioritize() {
    if (draftTasks.length === 0) return;
    setStep("prioritize");
    logTestEvent(testerId, "prioritize_clicked", {
  draftCount: draftTasks.length,
});
  }

  function moveDraft(index: number, direction: "up" | "down") {
    setDraftTasks((prev) => {
      const next = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next;
    });
  }

  function confirmPriorities() {
    if (draftTasks.length === 0) return;

    const activeTasks: ActiveTask[] = reprioritize(
      draftTasks.map((task, index) => ({
        id: makeId(),
        areaId: task.areaId,
        title: task.title,
        micro: task.micro,
        priority: (index + 1) as 1 | 2 | 3,
        status: index === 0 ? "focus" : "queued",
      }))
    );

    updateState({ activeTasks });
    setDraftTasks([]);
setSelectedAreaId("");
setTaskInput("");
setMicroInput("");

setAppState((prev) => ({
  ...prev,
  draftTasks: [],
  savedStep: "focus",
  selectedAreaId: "",
  taskInput: "",
  microInput: "",
}));

logTestEvent(testerId, "focus_created", {
  draftCount: draftTasks.length,
});

setStep("focus");
  }

  function editPlanAddMore() {
    const drafts = activeToDraft(appState.activeTasks);
    setDraftTasks(drafts);
    setSelectedAreaId("");
    setTaskInput("");
    setMicroInput("");
    setStep("add-more");
  }

  function editPriorities() {
    const drafts = activeToDraft(appState.activeTasks);
    setDraftTasks(drafts);
    setStep("prioritize");
  }

  function completeFocusTask() {
    if (!focusTask) return;

    logTestEvent(testerId, "focus_completed", {
  task: focusTask.title,
  micro: focusTask.micro,
  areaId: focusTask.areaId,
});

    const today = todayKey();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    const isNewStartedDay = appState.lastStartedDate !== today;

    const nextStreak =
      appState.lastStartedDate === today
        ? appState.streak
        : appState.lastStartedDate === yesterdayKey
          ? appState.streak + 1
          : 1;

    const reward = 10;
    const remaining = appState.activeTasks.filter((task) => task.id !== focusTask.id);
    const reprioritized = reprioritize(remaining);

    setLastReward(reward);

    updateState({
      activeTasks: reprioritized,
      streak: nextStreak,
      startedToday: isNewStartedDay ? 1 : appState.startedToday + 1,
      dopaminePoints: appState.dopaminePoints + reward,
      lastStartedDate: today,
    });

    setStep("celebrate");
  }

  function resetAndPlanAgain() {
  setAppState((prev) => ({
    ...prev,
    activeTasks: [],
    draftTasks: [],
    savedStep: "pick-area",
    selectedAreaId: "",
    taskInput: "",
    microInput: "",
  }));

  setDraftTasks([]);
  setSelectedAreaId("");
  setTaskInput("");
  setMicroInput("");
  setStep("pick-area");
}

  async function copyWidgetUrl() {
    if (!widgetUrl) return;
    await navigator.clipboard.writeText(widgetUrl);
    setWidgetCopied(true);
    window.setTimeout(() => setWidgetCopied(false), 1800);
  }

  const addMoreHeading = (() => {
    if (draftTasks.length === 0) return "Har du en mere?";
    if (draftTasks.length === 1) {
      const first = draftTasks[0];
      const areaLabel = areaMap[first.areaId]?.label || "det område";
      return `Du har valgt 1 vigtig ting i ${areaLabel}`;
    }
    return `Du har valgt ${draftTasks.length} vigtige ting`;
  })();

  const addMoreText = (() => {
    if (draftTasks.length === 1) return "Hvad er det næste vigtigste område at tage hånd om i dag?";
    if (draftTasks.length === 2) return "Vil du vælge ét område mere eller gå til prioritering nu?";
    return "Du har nået maks 3. Nu kan du prioritere dem.";
  })();

  if (!hydrated) {
    return <main style={styles.loading}>Laster Falcus...</main>;
  }

  return (
    <main style={styles.page}>
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.72);
        }
      `}</style>

      <div style={styles.shell}>
        <header style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.logoMark}>🦅</span>
            <span style={styles.logoText}>Falcus</span>
          </div>

          <button style={styles.explainerButton} onClick={showExplainerAgain}>
  Se forklaring
</button>

          <div style={styles.headerBadges}>
            <div style={styles.streakBadge}>🔥 {appState.streak}</div>
            <div style={styles.pointsBadge}>✨ {appState.dopaminePoints}</div>
          </div>
        </header>

        <div style={{ fontSize: 12, opacity: 0.45, marginBottom: 10 }}>
  tester: {testerId}
</div>

        {step === "explainer" && (
  <section style={styles.card}>
    <div style={styles.eyebrow}>Sådan virker Falcus</div>
    <h1 style={styles.title}>Ikke en to-do app</h1>

    <p style={styles.textMuted}>
      Vælg 1-3 ting, gør dem små, og lad Falcus huske næste lille start for dig.
    </p>

    <video
      src="/falcus-explainer.mp4"
      controls
      playsInline
      style={styles.video}
    />

    <button style={styles.primaryButton} onClick={skipExplainer}>
      Forstået, kalibrér Falcus
    </button>

    <button style={styles.quietButton} onClick={skipExplainer}>
      Spring over
    </button>
  </section>
)}

        {step === "onboarding" && (
          <section style={styles.card}>
            <div style={styles.eyebrow}>Kalibrering</div>
            <h1 style={styles.title}>Lad Falcus kalibrere blikket</h1>
            <p style={styles.textMuted}>
              Vælg de områder, du gerne vil have hjælp til at få øje på.
            </p>
            <p style={styles.textMuted}>
              Falcus bruger dem til at minde dig om det vigtige, også det der let bliver glemt.
              Du kan altid ændre det senere.
            </p>

            <div style={styles.areaGrid}>
              {allAreas.map((area) => {
                const active = appState.selectedAreaIds.includes(area.id);
                return (
                  <button
                    key={area.id}
                    onClick={() => toggleArea(area.id)}
                    style={{
                      ...styles.areaChip,
                      borderColor: active ? area.color : "rgba(255,255,255,0.10)",
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
                  style={styles.input}
                  value={customAreaInput}
                  onChange={(e) => setCustomAreaInput(e.target.value)}
                  placeholder="Tilføj eget område"
                />
                <button style={styles.smallButton} onClick={addCustomArea}>
                  Tilføj
                </button>
              </div>
            )}

            <button
              style={{
                ...styles.primaryButton,
                opacity: appState.selectedAreaIds.length > 0 ? 1 : 0.45,
                cursor: appState.selectedAreaIds.length > 0 ? "pointer" : "not-allowed",
              }}
              disabled={appState.selectedAreaIds.length === 0}
              onClick={finishOnboarding}
            >
              Kalibrér Falcus
            </button>
          </section>
        )}

        {step === "pick-area" && (
          <>
            <section style={styles.heroCard}>
              <div>
                <div style={styles.eyebrow}>Vælg område</div>
                <h1 style={styles.title}>Hvilket område skal du have hånd om?</h1>
                <p style={styles.textMuted}>
                  Vælg et område først. Så bliver det lettere at vælge det vigtigste lige nu.
                </p>
              </div>
              <div style={styles.heroBird}>🦅</div>
            </section>

            <section style={styles.card}>
              <div style={styles.rowBetweenWrap}>
                <div style={styles.sectionLabelNoMargin}>Dine områder</div>
                <button style={styles.inlineActionButton} onClick={() => setStep("onboarding")}>
                  Tilpas dine områder
                </button>
              </div>

              <div style={styles.areaGrid}>
                {selectedAreas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => chooseArea(area.id)}
                    style={{ ...styles.areaCard, borderColor: area.color }}
                  >
                    <div style={styles.areaEmoji}>{area.emoji}</div>
                    <div style={styles.areaLabel}>{area.label}</div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {step === "pick-task" && selectedArea && (
          <section style={styles.card}>
            <button style={styles.backButton} onClick={() => setStep("pick-area")}>
              ← Tilbage
            </button>

            <div style={styles.eyebrow}>{selectedArea.label}</div>
            <h1 style={styles.title}>Hvad er vigtigt at få hånd om?</h1>

            <input
              style={styles.bigInput}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Skriv opgave..."
            />

            <button
              style={{
                ...styles.primaryButton,
                opacity: taskInput.trim() ? 1 : 0.45,
                cursor: taskInput.trim() ? "pointer" : "not-allowed",
              }}
              disabled={!taskInput.trim()}
              onClick={() => chooseTask(taskInput)}
            >
              Videre
            </button>

            <div style={styles.sectionLabel}>Det kunne f.eks. være:</div>
            <div style={styles.exampleList}>
              {examplesForArea(selectedArea.id).map((example) => (
                <div key={example} style={styles.exampleItem}>
                  • {example}
                </div>
              ))}
            </div>
          </section>
        )}

        {step === "pick-micro" && selectedArea && (
          <section style={styles.card}>
            <button style={styles.backButton} onClick={() => setStep("pick-task")}>
              ← Tilbage
            </button>

            <div style={styles.eyebrow}>Mindste start</div>
            <h1 style={styles.title}>Hvad er nok til at være i gang?</h1>
            <p style={styles.taskPreview}>
              <strong>Opgave:</strong> {taskInput}
            </p>

            <input
              style={styles.bigInput}
              value={microInput}
              onChange={(e) => setMicroInput(e.target.value)}
              placeholder="Skriv mikrohandling..."
            />

            <div style={styles.examplesBox}>
  <div style={styles.examplesTitle}>Det kunne fx se sådan her ud</div>

  <div style={styles.exampleCard}>
    <div style={styles.exampleArea}>Økonomi</div>
    <div style={styles.exampleTask}>Tjek konto</div>
    <div style={styles.exampleMicro}>→ Åbn bank-app</div>
  </div>

  <div style={styles.exampleCard}>
    <div style={styles.exampleArea}>Hjem</div>
    <div style={styles.exampleTask}>Ryd bord</div>
    <div style={styles.exampleMicro}>→ Fjern én ting</div>
  </div>
</div>

            <button
              style={{
                ...styles.primaryButton,
                marginTop: 12,
                opacity: microInput.trim() ? 1 : 0.45,
                cursor: microInput.trim() ? "pointer" : "not-allowed",
              }}
              disabled={!microInput.trim()}
              onClick={saveDraftTask}
            >
              Gem mikrohandling
            </button>
          </section>
        )}

        {step === "add-more" && (
  <section style={styles.card}>
    <div style={styles.eyebrow}>Valgt indtil nu</div>
    <h1 style={styles.title}>
  Du har valgt {draftTasks.length} ting til i dag
</h1>

<p style={styles.textMuted}>
  Du kan stoppe her eller vælge op til {3 - draftTasks.length} mere. 
  Det må gerne være samme område. 
  Falcus hjælper dig bare med at holde fast i næste lille start.
</p>

    <div style={styles.dayPlanCard}>
      <div style={styles.dayPlanHeader}>Din lille dagsplan</div>

      <div style={styles.previewListCompact}>
        {draftTasks.map((task, index) => (
          <div
            key={`${task.areaId}-${task.title}-${index}`}
            style={styles.previewCardCompact}
          >
            <div style={styles.previewTop}>
              <span style={styles.previewNumber}>{index + 1}</span>
              <span style={styles.previewArea}>
                {areaMap[task.areaId]?.label}
              </span>
            </div>

            <div style={styles.previewTitle}>{task.title}</div>
            <div style={styles.textMutedSmall}>{task.micro}</div>
          </div>
        ))}
      </div>
    </div>

    {draftTasks.length < 3 && (
      <button style={styles.primaryChoiceButton} onClick={goToAddAnother}>
        <div style={styles.primaryChoiceTop}>Næste valg</div>
        <div style={styles.primaryChoiceTitle}>Vælg en mere</div>
        <div style={styles.primaryChoiceText}>
          Tilføj det næste vigtigste område i dag.
        </div>
      </button>
    )}

    <button style={styles.quietButton} onClick={goToPrioritize}>
  Jeg er færdig for nu
</button>
  </section>
)}

        {step === "prioritize" && (
          <section style={styles.card}>
            <button style={styles.backButton} onClick={() => setStep("add-more")}>
              ← Tilbage
            </button>

            <div style={styles.eyebrow}>Prioritér</div>
            <h1 style={styles.title}>Hvad skal være fokus nu?</h1>
            <p style={styles.textMuted}>Sæt rækkefølgen. Nr. 1 bliver vist som fokus nu i app og widget.</p>

            <div style={styles.previewList}>
              {draftTasks.map((task, index) => (
                <div key={`${task.areaId}-${task.title}-${index}`} style={styles.priorityCard}>
                  <div>
                    <div style={styles.priorityBadge}>{index === 0 ? "Fokus nu" : "På vej"}</div>
                    <div style={styles.previewTitle}>{task.title}</div>
                    <div style={styles.textMutedSmall}>
                      {task.micro} · {areaMap[task.areaId]?.label}
                    </div>
                  </div>

                  <div style={styles.priorityButtons}>
                    <button style={styles.moveButton} onClick={() => moveDraft(index, "up")} disabled={index === 0}>
                      ↑
                    </button>
                    <button
                      style={styles.moveButton}
                      onClick={() => moveDraft(index, "down")}
                      disabled={index === draftTasks.length - 1}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button style={styles.primaryButton} onClick={confirmPriorities}>
              Prioritet ok
            </button>
          </section>
        )}

        {step === "focus" && (
          <>
            <section style={styles.focusCard}>
              <div style={styles.rowBetween}>
                <div style={styles.eyebrowFocus}>Fokus nu</div>
                <button style={styles.linkButton} onClick={resetAndPlanAgain}>
                  Ny plan
                </button>
              </div>

              {focusTask ? (
                <>
                  <div style={styles.focusMain}>
                    <div>
                      <div style={styles.focusAreaPill}>{areaMap[focusTask.areaId]?.label || "Andet"}</div>
                      <h1 style={styles.focusTitle}>{focusTask.title}</h1>
                      <p style={styles.focusMicro}>{focusTask.micro}</p>
                    </div>
                    <div style={styles.focusBirdBig}>🦅</div>
                  </div>

                  <div style={styles.progressRow}>
                    <div style={styles.progressDotGroup}>
                      {appState.activeTasks.map((task) => (
                        <span
                          key={task.id}
                          style={{
                            ...styles.progressDot,
                            background: task.status === "focus" ? "#F59E0B" : "rgba(255,255,255,0.15)",
                          }}
                        />
                      ))}
                    </div>
                    <div style={styles.textMutedSmall}>
                      {focusTask.priority}/{appState.activeTasks.length}
                    </div>
                  </div>

                  <button style={styles.doneButton} onClick={completeFocusTask}>
                    Marker som gjort
                  </button>

                  <div style={styles.focusEditGrid}>
                    {appState.activeTasks.length < 3 && (
                      <button style={styles.secondaryFullButton} onClick={editPlanAddMore}>
                        Tilføj flere opgaver
                      </button>
                    )}
                    <button style={styles.secondaryFullButton} onClick={editPriorities}>
                      Omprioritér
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h1 style={styles.title}>Vælg fokus og handling for lige nu</h1>
                  <p style={styles.textMuted}>Når du vælger en opgave og en mikrohandling, husker Falcus den for dig.</p>
                  <button style={styles.primaryButton} onClick={() => setStep("pick-area")}>
                    Vælg fokus
                  </button>
                </>
              )}
            </section>

            {queuedTasks.length > 0 && (
              <section style={styles.card}>
                <div style={styles.sectionLabel}>På vej</div>
                <div style={styles.previewList}>
                  {queuedTasks.map((task) => (
                    <div key={task.id} style={styles.previewCard}>
                      <div style={styles.previewTop}>
                        <span style={styles.previewNumber}>{task.priority}</span>
                        <span style={styles.previewArea}>{areaMap[task.areaId]?.label}</span>
                      </div>
                      <div style={styles.previewTitle}>{task.title}</div>
                      <div style={styles.textMutedSmall}>{task.micro}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section style={styles.card}>
  <div style={styles.previewCard}>
    <div style={styles.previewLabel}>FOKUS NU</div>
    <div style={styles.previewTitle}>
      {focusTask?.title || "Vælg fokus"}
    </div>
    <div style={styles.previewMicro}>
      {focusTask?.micro || "Vælg handling for lige nu"}
    </div>
    <div style={styles.previewArea}>
      {focusTask ? areaMap[focusTask.areaId]?.label : ""}
    </div>
  </div>
</section>
          </>
        )}

        {step === "celebrate" && (
          <section style={styles.celebrateCard}>
            <div style={styles.celebrateSpark}>✨</div>
            <div style={styles.eyebrow}>Godt gået</div>
            <h1 style={styles.title}>Du er i gang</h1>
            <p style={styles.textMuted}>Små starter tæller. Falcus husker resten for dig.</p>

            <div style={styles.rewardGrid}>
              <div style={styles.rewardBox}>
                <div style={styles.rewardNumber}>+{lastReward}</div>
                <div style={styles.rewardLabel}>dopamin-point</div>
              </div>
              <div style={styles.rewardBox}>
                <div style={styles.rewardNumber}>🔥 {appState.streak}</div>
                <div style={styles.rewardLabel}>streak</div>
              </div>
              <div style={styles.rewardBox}>
                <div style={styles.rewardNumber}>{appState.startedToday}</div>
                <div style={styles.rewardLabel}>påbegyndt i dag</div>
              </div>
            </div>

            <div style={styles.inlineRow}>
              <button
                style={styles.secondaryButton}
                onClick={() => setStep(appState.activeTasks.length > 0 ? "focus" : "pick-area")}
              >
                Færdig for nu
              </button>
              <button
                style={styles.primaryButton}
                onClick={() => setStep(appState.activeTasks.length > 0 ? "focus" : "pick-area")}
              >
                Se fokus
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
      "radial-gradient(circle at top, rgba(73,87,255,0.22), transparent 30%), linear-gradient(180deg, #06101f 0%, #0b1327 100%)",
    color: "#F8FAFC",
    fontFamily: "Inter, Arial, sans-serif",
  },
  shell: {
    width: "100%",
    maxWidth: 460,
    margin: "0 auto",
    padding:
      "max(20px, env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  headerBadges: { display: "grid", gap: 8, flexShrink: 0 },
  logoRow: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  logoMark: { fontSize: 26, flexShrink: 0 },
  logoText: { fontSize: 30, fontWeight: 900, letterSpacing: -0.8, lineHeight: 1.05 },
  streakBadge: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  pointsBadge: {
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(245,158,11,0.10)",
    border: "1px solid rgba(245,158,11,0.20)",
    fontWeight: 800,
    whiteSpace: "nowrap",
    color: "#FDE68A",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#081120",
    color: "#fff",
  },
  heroCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: 20,
    borderRadius: 24,
    background: "linear-gradient(180deg, rgba(25,38,76,0.96), rgba(12,18,36,0.96))",
    border: "1px solid rgba(255,255,255,0.08)",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  heroBird: { fontSize: 42, lineHeight: 1, flexShrink: 0 },
  card: {
    padding: 18,
    borderRadius: 24,
    background: "rgba(12,18,36,0.90)",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.24)",
    marginBottom: 14,
  },
  focusCard: {
    padding: 18,
    borderRadius: 28,
    background: "linear-gradient(180deg, rgba(12,34,31,0.95), rgba(10,18,30,0.98))",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 10px 40px rgba(0,0,0,0.26)",
    marginBottom: 14,
  },
  celebrateCard: {
    padding: 22,
    borderRadius: 28,
    background: "linear-gradient(180deg, rgba(34,19,76,0.96), rgba(12,18,36,0.96))",
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 14px 40px rgba(124,58,237,0.18)",
    marginBottom: 14,
    textAlign: "center",
  },
  celebrateSpark: { fontSize: 42, marginBottom: 8 },
  eyebrow: {
    fontSize: 13,
    color: "#8B5CF6",
    fontWeight: 800,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  eyebrowFocus: {
    fontSize: 13,
    color: "#67E8F9",
    fontWeight: 800,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { margin: 0, fontSize: 32, lineHeight: 1.08, letterSpacing: -1 },
  textMuted: { color: "rgba(255,255,255,0.68)", fontSize: 15, lineHeight: 1.45 },
  textMutedSmall: { color: "rgba(255,255,255,0.58)", fontSize: 12 },
  areaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 },
  areaChip: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "14px 12px",
    borderRadius: 16,
    color: "#fff",
    fontWeight: 800,
    cursor: "pointer",
  },
  areaCard: {
    textAlign: "left",
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(24,35,66,0.95), rgba(12,18,36,0.95))",
    color: "#fff",
    cursor: "pointer",
    minHeight: 96,
  },
  areaEmoji: { fontSize: 28, marginBottom: 8 },
  areaLabel: { fontSize: 18, fontWeight: 800, lineHeight: 1.15 },
  inlineRow: { display: "flex", gap: 10, alignItems: "center", marginTop: 14 },
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
    background: "rgba(15,24,48,0.92)",
    color: "#fff",
    outline: "none",
    fontSize: 18,
    boxSizing: "border-box",
    marginTop: 8,
    marginBottom: 12,
  },
  smallButton: {
    height: 46,
    padding: "0 14px",
    borderRadius: 14,
    border: "none",
    background: "#334155",
    color: "#fff",
    fontWeight: 800,
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
    fontWeight: 900,
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
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryFullButton: {
    width: "100%",
    height: 56,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    marginTop: 12,
  },
  sectionLabel: { fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.90)", marginBottom: 10 },
  sectionLabelNoMargin: { fontSize: 14, fontWeight: 800, color: "rgba(255,255,255,0.90)" },
  stack: { display: "grid", gap: 10 },
  optionButton: {
    textAlign: "left",
    padding: "15px 16px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  exampleList: { display: "grid", gap: 8, marginTop: 6 },
  exampleItem: { color: "rgba(255,255,255,0.74)", fontSize: 15, lineHeight: 1.4 },
  backButton: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    marginBottom: 8,
    cursor: "pointer",
    padding: 0,
  },
  taskPreview: { color: "#F8FAFC", fontSize: 16, marginTop: 6, marginBottom: 10 },
  previewList: { display: "grid", gap: 10, marginTop: 12, marginBottom: 14 },
  previewListCompact: { display: "grid", gap: 8, marginTop: 10 },
  previewCard: {
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  previewCardCompact: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.06)",
  },
  previewTop: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 },
  previewNumber: {
    width: 22,
    height: 22,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.10)",
    fontSize: 12,
    fontWeight: 800,
  },
  previewArea: { fontSize: 12, color: "rgba(255,255,255,0.62)", fontWeight: 700 },
  previewTitle: { fontSize: 18, fontWeight: 800, marginBottom: 4 },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 },
  rowBetweenWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  linkButton: {
    border: "none",
    background: "transparent",
    color: "#A5B4FC",
    fontWeight: 700,
    cursor: "pointer",
    padding: 0,
  },
  inlineActionButton: {
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "#C7D2FE",
    fontWeight: 800,
    cursor: "pointer",
    padding: "10px 14px",
    borderRadius: 14,
    fontSize: 14,
  },
  priorityCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  priorityBadge: {
    display: "inline-block",
    padding: "5px 10px",
    borderRadius: 999,
    background: "rgba(245,185,66,0.14)",
    color: "#F5B942",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  priorityButtons: { display: "grid", gap: 8 },
  moveButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "#fff",
    fontSize: 16,
    cursor: "pointer",
  },
  focusMain: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-end",
    marginTop: 14,
  },
  focusAreaPill: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(103,232,249,0.14)",
    color: "#A5F3FC",
    fontSize: 13,
    fontWeight: 800,
    marginBottom: 10,
  },
  focusTitle: { margin: 0, fontSize: 44, lineHeight: 0.96, letterSpacing: -1.6 },
  focusMicro: {
    margin: "10px 0 0",
    fontSize: 18,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.35,
  },
  focusBirdBig: { fontSize: 72, lineHeight: 1 },
  progressRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  progressDotGroup: { display: "flex", gap: 8 },
  progressDot: { width: 12, height: 12, borderRadius: 999, display: "inline-block" },
  doneButton: {
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
  focusEditGrid: { marginTop: 4 },
  widgetCard: {
    padding: 16,
    borderRadius: 22,
    background: "linear-gradient(180deg, rgba(24,38,86,0.95), rgba(13,20,40,0.98))",
    border: "1px solid rgba(124,58,237,0.55)",
    boxShadow: "0 0 30px rgba(91,91,247,0.16)",
    marginBottom: 12,
  },
  widgetEyebrow: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  widgetTitle: { fontSize: 20, fontWeight: 900, marginBottom: 4 },
  widgetMicro: { color: "rgba(255,255,255,0.76)", fontSize: 15, marginBottom: 8 },
  widgetArea: { color: "rgba(255,255,255,0.58)", fontSize: 12, fontWeight: 700 },
  widgetUrlBox: {
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    overflowWrap: "anywhere",
  },
  widgetUrlLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "rgba(255,255,255,0.58)",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  widgetUrlText: { fontSize: 13, color: "#E2E8F0", lineHeight: 1.5 },
  rewardGrid: { display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 18, marginBottom: 18 },
  rewardBox: {
    padding: 16,
    borderRadius: 18,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  rewardNumber: { fontSize: 28, fontWeight: 900, marginBottom: 4 },
  rewardLabel: { color: "rgba(255,255,255,0.68)", fontSize: 13, fontWeight: 700 },
  dayPlanCard: {
    padding: 14,
    borderRadius: 20,
    background: "rgba(255,255,255,0.035)",
    border: "1px solid rgba(255,255,255,0.08)",
    marginTop: 10,
    marginBottom: 14,
  },
  dayPlanHeader: {
    fontSize: 13,
    fontWeight: 800,
    color: "#C7D2FE",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  addAreaCardButton: {
    width: "100%",
    textAlign: "left",
    padding: 16,
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "linear-gradient(180deg, rgba(28,41,74,0.85), rgba(17,24,39,0.95))",
    color: "#fff",
    cursor: "pointer",
    marginBottom: 12,
  },
  addAreaCardTop: {
    fontSize: 12,
    fontWeight: 800,
    color: "#A5B4FC",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  addAreaCardTitle: { fontSize: 20, fontWeight: 900, marginBottom: 6 },
  addAreaCardText: { fontSize: 14, color: "rgba(255,255,255,0.68)", lineHeight: 1.4 },

  primaryChoiceButton: {
  width: "100%",
  textAlign: "left",
  padding: 18,
  borderRadius: 22,
  border: "1px solid rgba(139,92,246,0.65)",
  background: "linear-gradient(90deg, #5B5BF7, #7C3AED)",
  color: "#fff",
  cursor: "pointer",
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(124,58,237,0.35)",
},
primaryChoiceTop: {
  fontSize: 12,
  fontWeight: 900,
  color: "rgba(255,255,255,0.78)",
  textTransform: "uppercase",
  marginBottom: 8,
  letterSpacing: 0.8,
},
primaryChoiceTitle: {
  fontSize: 24,
  fontWeight: 950,
  marginBottom: 6,
},
primaryChoiceText: {
  fontSize: 15,
  color: "rgba(255,255,255,0.78)",
  lineHeight: 1.4,
},
quietButton: {
  width: "100%",
  height: 52,
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.82)",
  fontSize: 16,
  fontWeight: 800,
  cursor: "pointer",
},
examplesBox: {
  marginTop: 20,
  padding: 16,
  borderRadius: 16,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
},

examplesTitle: {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 12,
  color: "rgba(255,255,255,0.7)",
},

exampleCard: {
  padding: 12,
  borderRadius: 12,
  background: "rgba(255,255,255,0.03)",
  marginBottom: 10,
},

exampleArea: {
  fontSize: 12,
  color: "#9CA3AF",
},

exampleTask: {
  fontSize: 16,
  fontWeight: 700,
},

exampleMicro: {
  fontSize: 14,
  color: "#A78BFA",
},

video: {
  width: "100%",
  borderRadius: 20,
  marginTop: 16,
  marginBottom: 16,
  background: "#000",
},

explainerButton: {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "#C7D2FE",
  fontWeight: 800,
  cursor: "pointer",
  padding: "8px 12px",
  borderRadius: 999,
  fontSize: 12,
},
};