"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

const areas = ["DIG", "HJEM", "FAMILIE", "ARBEJDE", "ØKONOMI"] as const;
type Area = (typeof areas)[number];

type Step = "select" | "define" | "prioritize" | "start";

type ActionItem = {
  id: string;
  area: Area;
  task: string;
  micro: string;
  done: boolean;
};

type DayState = {
  items: ActionItem[];
  step: Step;
  lastStartedDate: string | null;
  dayKey: string | null;
  taskSuggestionIndex: Record<Area, number>;
  microSuggestionIndex: Record<Area, number>;
};

type ProgressState = {
  streak: number;
};

const areaLabels: Record<Area, string> = {
  DIG: "Dig",
  HJEM: "Hjem",
  FAMILIE: "Familie",
  ARBEJDE: "Arbejde",
  ØKONOMI: "Økonomi",
};

const taskSuggestions: Record<Area, string[]> = {
  DIG: [
    "Få lidt ro på kroppen",
    "Få lidt luft",
    "Gøre noget godt for mig selv",
    "Få lidt energi tilbage",
    "Lande lidt",
  ],
  HJEM: [
    "Få lidt styr på hjemmet",
    "Få noget ryddet væk",
    "Gøre hjemmet lidt lettere",
    "Tage toppen af rodet",
    "Få lidt orden omkring mig",
  ],
  FAMILIE: [
    "Få fulgt op på én derhjemme",
    "Skabe lidt kontakt",
    "Få sagt det vigtigste",
    "Tjekke ind hos én",
    "Få afklaret en lille ting",
  ],
  ARBEJDE: [
    "Få åbnet arbejdsdagen",
    "Tage hul på det vigtigste",
    "Få rykket én ting videre",
    "Få startet på opgaven",
    "Lukke én lille løkke",
  ],
  ØKONOMI: [
    "Få kigget på økonomien",
    "Få lidt overblik",
    "Få taget én lille økonomiting",
    "Få åbnet budgettet",
    "Få fulgt op på penge",
  ],
};

const microSuggestions: Record<Area, string[]> = {
  DIG: [
    "Drik et glas vand",
    "Ret dig op i 10 sekunder",
    "Tag 3 rolige vejrtrækninger",
    "Gå lige ud og ind igen",
    "Skift til rent tøj",
  ],
  HJEM: [
    "Tøm lidt af opvaskeren",
    "Tag én ren ting fra opvaskemaskinen",
    "Sæt en vask over",
    "Læg noget tøj sammen",
    "Tør bordet af",
    "Tag affaldet med ud",
  ],
  FAMILIE: [
    "Send en kort besked",
    "Spørg lige hvordan det går",
    "Giv én hurtig opdatering",
    "Ring kort til én",
    "Find på noget hyggeligt",
  ],
  ARBEJDE: [
    "Åbn den vigtigste mail",
    "Svar på én besked",
    "Åbn dokumentet",
    "Skriv første linje",
    "Ring til én person",
  ],
  ØKONOMI: [
    "Åbn budgetarket",
    "Tjek din konto",
    "Betal én regning",
    "Kig på én post",
    "Send mail",
  ],
};

const DAY_STORAGE_KEY = "falcus-day";
const PROGRESS_STORAGE_KEY = "falcus-progress";

const primaryButtonClass =
  "w-full rounded-full bg-orange-400 px-5 py-4 text-base font-semibold text-black transition active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed";
const secondaryButtonClass =
  "w-full rounded-full border border-white/15 bg-white/5 px-5 py-4 text-base font-semibold text-white transition hover:bg-white/10";
const shellClass = "mx-auto max-w-md";
const cardClass =
  "rounded-[28px] border border-white/12 bg-white/[0.07] backdrop-blur-sm shadow-sm";
const mutedCardClass =
  "rounded-[24px] border border-white/10 bg-white/[0.05] backdrop-blur-sm";
const inputClass =
  "w-full rounded-2xl border border-white/10 bg-white/8 p-3 text-white outline-none placeholder:text-white/35 focus:border-white/20 focus:bg-white/10";
const labelClass = "text-xs uppercase tracking-[0.18em] text-white/40";

function createSuggestionIndex(): Record<Area, number> {
  return {
    DIG: 0,
    HJEM: 0,
    FAMILIE: 0,
    ARBEJDE: 0,
    ØKONOMI: 0,
  };
}

function getToday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function progressDots(doneCount: number, totalCount: number) {
  return Array.from({ length: totalCount }, (_, i) =>
    i < doneCount ? "✓" : "○"
  ).join(" ");
}

function ChipButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-white/12 bg-white/6 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}

function TopStatus({
  text,
  streak,
}: {
  text: string;
  streak: number;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="text-xs uppercase tracking-[0.18em] text-white/40">
        {text}
      </div>
      {streak > 0 ? (
        <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-white/70">
          🔥 {streak}
        </div>
      ) : null}
    </div>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-teal-950 text-white">
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_35%)] p-6">
        <div className={shellClass}>{children}</div>
      </div>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-5">
      <p className={labelClass}>{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-white/65">{subtitle}</p>
    </div>
  );
}

function FalconHero({
  state,
}: {
  state: "svaever" | "fokuserer" | "dykker" | "tilfreds";
}) {
  const srcMap = {
    svaever: "/falcon-svaever.png",
    fokuserer: "/falcon-fokuserer.png",
    dykker: "/falcon-dykker.png",
    tilfreds: "/falcon-tilfreds.png",
  };

  return (
    <div className="mb-6 flex justify-center">
      <img
        src={srcMap[state]}
        alt="Falcus falk"
        className="w-full max-w-[280px] h-auto object-contain"
      />
    </div>
  );
}

export default function Home() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [streak, setStreak] = useState(0);
  const [lastStartedDate, setLastStartedDate] = useState<string | null>(null);
  const [dayKey, setDayKey] = useState<string | null>(null);
  const [taskSuggestionIndex, setTaskSuggestionIndex] =
    useState<Record<Area, number>>(createSuggestionIndex());
  const [microSuggestionIndex, setMicroSuggestionIndex] =
    useState<Record<Area, number>>(createSuggestionIndex());
  const [hasHydrated, setHasHydrated] = useState(false);

  function clearCurrentDayState() {
    setItems([]);
    setStep("select");
    setLastStartedDate(null);
    setDayKey(getToday());
  }

  useEffect(() => {
    const today = getToday();

    try {
      const progressRaw = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (progressRaw) {
        const parsedProgress: Partial<ProgressState> = JSON.parse(progressRaw);
        setStreak(parsedProgress.streak ?? 0);
      }

      const dayRaw = localStorage.getItem(DAY_STORAGE_KEY);
      if (!dayRaw) {
        setDayKey(today);
        setHasHydrated(true);
        return;
      }

      const parsedDay: Partial<DayState> = JSON.parse(dayRaw);

      const parsedItems = parsedDay.items ?? [];
      const parsedStep = parsedDay.step ?? "select";
      const parsedLastStartedDate = parsedDay.lastStartedDate ?? null;
      const parsedDayKey = parsedDay.dayKey ?? null;

      setTaskSuggestionIndex(
        parsedDay.taskSuggestionIndex ?? createSuggestionIndex()
      );
      setMicroSuggestionIndex(
        parsedDay.microSuggestionIndex ?? createSuggestionIndex()
      );

      if (parsedDayKey === today) {
        setItems(parsedItems);
        setLastStartedDate(parsedLastStartedDate);
        setDayKey(parsedDayKey);
        setStep(parsedItems.length > 0 ? "start" : parsedStep);
      } else {
        setItems([]);
        setLastStartedDate(null);
        setDayKey(today);
        setStep("select");
      }
    } catch (error) {
      console.error("Kunne ikke læse falcus state", error);
      setDayKey(today);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(
      PROGRESS_STORAGE_KEY,
      JSON.stringify({ streak } satisfies ProgressState)
    );
  }, [hasHydrated, streak]);

  useEffect(() => {
    if (!hasHydrated) return;

    const stateToPersist: DayState = {
      items,
      step,
      lastStartedDate,
      dayKey: dayKey ?? getToday(),
      taskSuggestionIndex,
      microSuggestionIndex,
    };

    localStorage.setItem(DAY_STORAGE_KEY, JSON.stringify(stateToPersist));
  }, [
    hasHydrated,
    items,
    step,
    lastStartedDate,
    dayKey,
    taskSuggestionIndex,
    microSuggestionIndex,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;

    function syncDay() {
      const today = getToday();
      setDayKey((prev) => {
        if (prev === today) return prev;
        clearCurrentDayState();
        return today;
      });
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        syncDay();
      }
    }

    syncDay();

    window.addEventListener("focus", syncDay);
    window.addEventListener("pageshow", syncDay);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const interval = window.setInterval(syncDay, 30 * 1000);

    return () => {
      window.removeEventListener("focus", syncDay);
      window.removeEventListener("pageshow", syncDay);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.clearInterval(interval);
    };
  }, [hasHydrated]);

  const currentToday = getToday();
  useEffect(() => {
    if (!hasHydrated) return;
    if (dayKey && dayKey !== currentToday) {
      clearCurrentDayState();
    }
  }, [hasHydrated, dayKey, currentToday]);

  function resetDay() {
    clearCurrentDayState();
  }

  const completedItems = useMemo(() => items.filter((item) => item.done), [items]);
  const activeItems = useMemo(() => items.filter((item) => !item.done), [items]);
  const currentItem = useMemo(() => items.find((item) => !item.done) ?? null, [items]);
  const upcomingItems = useMemo(() => items.filter((item) => !item.done), [items]);

  const hasStartedToday = lastStartedDate === currentToday;
  const completedCount = completedItems.length;
  const totalCount = items.length;
  const activeCount = activeItems.length;
  const everythingDone = totalCount > 0 && currentItem === null;
  const dotProgress = progressDots(completedCount, totalCount);

  const activeItemsAreValid = activeItems.every(
    (item) => item.task.trim() !== "" && item.micro.trim() !== ""
  );

  function handleChooseOneMore() {
    setStep("select");
  }

  function handleAddArea(area: Area) {
    if (activeCount >= 3) return;

    const newItem: ActionItem = {
      id: makeId(),
      area,
      task: "",
      micro: "",
      done: false,
    };

    setItems((prev) => [...prev, newItem]);
  }

  function handleRemoveOneFromArea(area: Area) {
    const latestActiveInArea = [...activeItems]
      .reverse()
      .find((item) => item.area === area);

    if (!latestActiveInArea) return;

    removeItem(latestActiveInArea.id);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateItem(id: string, patch: Partial<ActionItem>) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  function applyTaskSuggestion(id: string, area: Area) {
    const options = taskSuggestions[area];
    const currentIndex = taskSuggestionIndex[area] ?? 0;
    const suggestion = options[currentIndex];

    updateItem(id, { task: suggestion });

    setTaskSuggestionIndex((prev) => ({
      ...prev,
      [area]: (currentIndex + 1) % options.length,
    }));
  }

  function applyMicroSuggestion(id: string, area: Area) {
    const options = microSuggestions[area];
    const currentIndex = microSuggestionIndex[area] ?? 0;
    const suggestion = options[currentIndex];

    updateItem(id, { micro: suggestion, done: false });

    setMicroSuggestionIndex((prev) => ({
      ...prev,
      [area]: (currentIndex + 1) % options.length,
    }));
  }

  function moveActiveItem(id: string, direction: "up" | "down") {
    setItems((prev) => {
      const active = prev.filter((item) => !item.done);
      const completed = prev.filter((item) => item.done);

      const index = active.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= active.length) return prev;

      const nextActive = [...active];
      [nextActive[index], nextActive[targetIndex]] = [
        nextActive[targetIndex],
        nextActive[index],
      ];

      return [...nextActive, ...completed];
    });
  }

  function handleStarted() {
    const today = getToday();

    if (lastStartedDate !== today) {
      setStreak((s) => s + 1);
      setLastStartedDate(today);
    }

    setStep("start");
  }

  function toggleDone(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
    );
  }

  async function saveWidgetData(payload: {
    title: string;
    area: string;
    task: string;
    micro: string;
    streak: number;
    done: boolean;
    state: "idle" | "open" | "done";
    updatedAt: string;
    progress: string;
  }) {
    try {
      await fetch("/api/widget/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error("Kunne ikke gemme widget-data", error);
    }
  }

  useEffect(() => {
    if (!hasHydrated) return;

    const updatedAt = new Date().toISOString();

    if (!hasStartedToday || items.length === 0) {
      saveWidgetData({
        title: "Falcus",
        area: "",
        task: "",
        micro: "Åbn Falcus nu",
        streak,
        done: false,
        state: "idle",
        updatedAt,
        progress: "0/0",
      });
      return;
    }

    if (everythingDone) {
      saveWidgetData({
        title: "I dag",
        area: "",
        task: "",
        micro: "Færdig for i dag - Én mere?",
        streak,
        done: true,
        state: "done",
        updatedAt,
        progress: `${completedCount}/${totalCount}`,
      });
      return;
    }

    if (currentItem) {
      saveWidgetData({
        title: "Næste mikro",
        area: areaLabels[currentItem.area],
        task: currentItem.task || "",
        micro: currentItem.micro || "",
        streak,
        done: false,
        state: "open",
        updatedAt,
        progress: `${completedCount}/${totalCount}`,
      });
    }
  }, [
    hasHydrated,
    hasStartedToday,
    items,
    streak,
    currentItem,
    everythingDone,
    completedCount,
    totalCount,
  ]);

  function activeCountForArea(area: Area) {
    return activeItems.filter((item) => item.area === area).length;
  }

  if (!hasHydrated) {
    return (
      <AppShell>
        <div className={shellClass}>
          <p className="text-sm text-white/60">Lige et øjeblik…</p>
        </div>
      </AppShell>
    );
  }

  if (step === "define") {
    return (
      <AppShell>
        <TopStatus text={`${activeCount} aktive`} streak={streak} />
        <SectionTitle
          eyebrow="Gør dem konkrete"
          title="Hvad er den lille handling?"
          subtitle="For at gå videre skal alle aktive have både opgave og mikrohandling."
        />

        <FalconHero state="fokuserer" />

        <div className="space-y-4">
          {activeItems.map((item, index) => (
            <div key={item.id} className={`${cardClass} p-5`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className={labelClass}>{areaLabels[item.area]}</p>
                  <p className="mt-1 text-lg font-semibold text-white/92">
                    Ny handling
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-sm text-white/70"
                >
                  Fjern
                </button>
              </div>

              <input
                autoFocus={index === 0}
                placeholder="Hvad er opgaven?"
                value={item.task}
                onChange={(e) =>
                  updateItem(item.id, { task: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById(`micro-${item.id}`)?.focus();
                  }
                }}
                className={inputClass}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <ChipButton onClick={() => applyTaskSuggestion(item.id, item.area)}>
                  Forslag til opgave
                </ChipButton>
              </div>

              <input
                id={`micro-${item.id}`}
                placeholder="Det mindste du kan gøre…"
                value={item.micro}
                onChange={(e) =>
                  updateItem(item.id, { micro: e.target.value })
                }
                className={`${inputClass} mt-4`}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <ChipButton onClick={() => applyMicroSuggestion(item.id, item.area)}>
                  Forslag til mikro
                </ChipButton>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setStep("prioritize")}
          disabled={!activeItemsAreValid}
          className={`${primaryButtonClass} mt-7`}
        >
          Prioritér rækkefølge
        </button>

        <button
          onClick={() => setStep("select")}
          className={`${secondaryButtonClass} mt-4`}
        >
          Tilbage
        </button>
      </AppShell>
    );
  }

  if (step === "prioritize") {
    return (
      <AppShell>
        <TopStatus text="Prioritér" streak={streak} />
        <SectionTitle
          eyebrow="Rækkefølge"
          title="Hvad er vigtigst først?"
          subtitle="Kun udfyldte handlinger er med i denne omgang."
        />

        <FalconHero state="fokuserer" />

        <div className="space-y-3">
          {activeItems.map((item, index) => (
            <div key={item.id} className={`${cardClass} p-5`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className={labelClass}>#{index + 1}</p>
                  <p className="mt-1 text-lg font-semibold text-white/92">
                    {areaLabels[item.area]}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => moveActiveItem(item.id, "up")}
                    disabled={index === 0}
                    className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-sm disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveActiveItem(item.id, "down")}
                    disabled={index === activeItems.length - 1}
                    className="rounded-full border border-white/12 bg-white/5 px-3 py-1 text-sm disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
              </div>

              <p className="text-sm text-white/65">
                Opgave: {item.task || "—"}
              </p>
              <p className="mt-1 text-sm text-white/85">
                Mikro: {item.micro || "—"}
              </p>
            </div>
          ))}

          {completedItems.length > 0 && (
            <div className="pt-3">
              <p className={`${labelClass} mb-3`}>Allerede klaret</p>
              <div className="space-y-3">
                {completedItems.map((item) => (
                  <div key={item.id} className={`${mutedCardClass} p-4 opacity-60`}>
                    <p className="text-sm text-white/55">{areaLabels[item.area]}</p>
                    <p className="mt-1 text-sm text-white/80">✓ {item.micro || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setStep("start")}
          className={`${primaryButtonClass} mt-7`}
        >
          Klar
        </button>

        <button
          onClick={() => setStep("define")}
          className={`${secondaryButtonClass} mt-4`}
        >
          Tilbage
        </button>
      </AppShell>
    );
  }

  if (step === "start" && items.length > 0) {
    const roundText = everythingDone
      ? `${totalCount} / ${totalCount}`
      : `${completedCount + 1} / ${totalCount}`;

    const heroState = everythingDone ? "tilfreds" : "dykker";

    return (
      <AppShell>
        <TopStatus text={`${activeCount} aktive`} streak={streak} />
        <SectionTitle
          eyebrow="I gang"
          title="Fokus nu"
          subtitle={
            !hasStartedToday
              ? "Du har valgt. Start når du er klar."
              : everythingDone
              ? "Alt aktivt er klaret. Du kan stoppe eller tage én mere."
              : "Appen holder fokus på næste ufærdige mikrohandling."
          }
        />

        <FalconHero state={heroState} />

        <div className={`${mutedCardClass} mb-5 px-4 py-3`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={labelClass}>Fremdrift i dag</p>
              <p className="mt-1 text-lg font-semibold text-white/90">
                {dotProgress || "—"}
              </p>
            </div>
            <div className="text-right">
              <p className={labelClass}>Runde</p>
              <p className="mt-1 text-lg font-semibold text-white/90">
                {roundText}
              </p>
            </div>
          </div>
        </div>

        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-white/10 bg-white/5 px-6 py-4">
            <p className={labelClass}>{everythingDone ? "I dag" : "Næste mikro"}</p>
          </div>

          <div className="p-6">
            {!everythingDone && currentItem ? (
              <>
                <p className="mb-2 text-sm font-semibold text-white/72">
                  {areaLabels[currentItem.area]}
                </p>
                <p className="text-sm text-white/50">
                  {currentItem.task || "—"}
                </p>
                <p className="mt-3 text-3xl font-semibold leading-tight text-white">
                  {currentItem.micro || "—"}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-semibold leading-tight text-white">
                  Færdig for i dag
                </p>
                <p className="mt-4 text-sm text-white/52">Én mere?</p>
              </>
            )}
          </div>
        </div>

        {!hasStartedToday && (
          <button
            onClick={handleStarted}
            className={`${primaryButtonClass} mt-7`}
          >
            Start
          </button>
        )}

        {hasStartedToday && currentItem && (
          <button
            onClick={() => toggleDone(currentItem.id)}
            className={`${primaryButtonClass} mt-7`}
          >
            Marker som gjort
          </button>
        )}

        {hasStartedToday && everythingDone && (
          <button
            onClick={handleChooseOneMore}
            className={`${primaryButtonClass} mt-7`}
          >
            Én mere?
          </button>
        )}

        {completedItems.length > 0 && (
          <div className="mt-8">
            <p className={`${labelClass} mb-3`}>Klaret indtil nu</p>

            <div className="space-y-2">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
                >
                  <span className="mt-0.5 text-white/75">✓</span>
                  <div className="min-w-0">
                    <p className="text-sm text-white/45">{areaLabels[item.area]}</p>
                    <p className="text-sm text-white/82">{item.micro || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {upcomingItems.length > 1 && !everythingDone && (
          <div className="mt-8">
            <p className={`${labelClass} mb-3`}>På vej</p>

            <div className="space-y-3">
              {upcomingItems
                .filter((item) => item.id !== currentItem?.id)
                .map((item, index) => (
                  <div key={item.id} className={`${mutedCardClass} p-4`}>
                    <p className="text-sm text-white/50">
                      #{index + 2} · {areaLabels[item.area]}
                    </p>
                    <p className="mt-1 text-sm text-white/60">
                      {item.task || "—"}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white/90">
                      {item.micro || "—"}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            onClick={() => setStep("prioritize")}
            className="text-white/55 underline underline-offset-4 hover:text-white/75"
          >
            Prioritér igen
          </button>
          <span className="text-white/20">•</span>
          <button
            onClick={() => setStep("define")}
            className="text-white/55 underline underline-offset-4 hover:text-white/75"
          >
            Redigér tekst
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <TopStatus text="Ny dag" streak={streak} />

      <SectionTitle
        eyebrow="Vælg handlinger"
        title="Hvad giver mest mening lige nu?"
        subtitle="Du kan vælge op til 3 aktive handlinger ad gangen. Samme område må gerne gå igen."
      />

      <FalconHero state="svaever" />

      <div className="space-y-3">
        {areas.map((area) => {
          const areaCount = activeCountForArea(area);
          const canAdd = activeCount < 3;
          const canRemove = areaCount > 0;
          const isSelected = areaCount > 0;

          return (
            <div
              key={area}
              className={`rounded-[26px] border p-5 transition ${
                isSelected
                  ? "border-amber-300/70 bg-amber-400/20 text-white shadow-[inset_0_0_0_1px_rgba(255,209,102,0.15)]"
                  : "border-white/12 bg-white/[0.07] text-white"
              } ${!canAdd && !isSelected ? "opacity-40" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-semibold">{areaLabels[area]}</p>
                  {areaCount > 0 ? (
                    <p className="mt-1 text-sm text-white/60">
                      {areaCount} valgt i denne omgang
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-white/40">
                      Ingen aktive endnu
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveOneFromArea(area)}
                    disabled={!canRemove}
                    className="h-11 w-11 rounded-full border border-white/10 bg-white/6 text-xl leading-none opacity-80 disabled:opacity-25"
                    aria-label={`Fjern én fra ${areaLabels[area]}`}
                  >
                    −
                  </button>

                  <div className="min-w-[2rem] text-center text-sm font-semibold text-white/75">
                    {areaCount}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddArea(area)}
                    disabled={!canAdd}
                    className="h-11 w-11 rounded-full border border-white/10 bg-white/6 text-xl leading-none opacity-80 disabled:opacity-25"
                    aria-label={`Tilføj én til ${areaLabels[area]}`}
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${mutedCardClass} mt-5 px-4 py-3`}>
        <p className="text-sm text-white/70">
          {activeCount} aktive • du kan vælge {Math.max(0, 3 - activeCount)} mere
        </p>
      </div>

      {completedItems.length > 0 && (
        <div className="mt-7">
          <p className={`${labelClass} mb-3`}>Allerede klaret i dag</p>

          <div className="space-y-2">
            {completedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <span className="mt-0.5 text-white/75">✓</span>
                <div className="min-w-0">
                  <p className="text-sm text-white/45">{areaLabels[item.area]}</p>
                  <p className="text-sm text-white/82">{item.micro || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeItems.length > 0 && (
        <button
          onClick={() => setStep("define")}
          className={`${primaryButtonClass} mt-8`}
        >
          Videre
        </button>
      )}

      {items.length > 0 && (
        <button
          onClick={resetDay}
          className={`${secondaryButtonClass} mt-4`}
        >
          Start forfra
        </button>
      )}
    </AppShell>
  );
}