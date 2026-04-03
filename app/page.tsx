"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

const areas = ["DIG", "HJEM", "FAMILIE", "ARBEJDE", "ØKONOMI"] as const;
type Area = (typeof areas)[number];

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
    "Få lidt styr på køkkenet",
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
    "Tag én tallerken med til opvaskeren",
    "Tag affaldet med ud",
    "Læg én ting på plads",
    "Tør bordet af",
    "Sæt vand over",
  ],
  FAMILIE: [
    "Send en kort besked",
    "Spørg lige hvordan det går",
    "Giv én hurtig opdatering",
    "Ring kort til én",
    "Aftal én lille ting",
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
    "Flyt et lille beløb",
  ],
};

type Step =
  | "select"
  | "defineFirst"
  | "expand"
  | "defineRest"
  | "focus"
  | "start";

type AreaDetails = {
  task: string;
  micro: string;
};

type DayState = {
  selected: Area[];
  details: Record<Area, AreaDetails>;
  focusedArea: Area | null;
  step: Step;
  lastStartedDate: string | null;
  taskSuggestionIndex: Record<Area, number>;
  microSuggestionIndex: Record<Area, number>;
};

type ProgressState = {
  streak: number;
};

const DAY_STORAGE_KEY = "falcus-day";
const PROGRESS_STORAGE_KEY = "falcus-progress";

function createEmptyDetails(): Record<Area, AreaDetails> {
  return {
    DIG: { task: "", micro: "" },
    HJEM: { task: "", micro: "" },
    FAMILIE: { task: "", micro: "" },
    ARBEJDE: { task: "", micro: "" },
    ØKONOMI: { task: "", micro: "" },
  };
}

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
      className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
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
    <div className="mb-4 text-xs uppercase tracking-wide text-white/45">
      {text}
      {streak > 0 && <span> • 🔥 {streak} dage</span>}
    </div>
  );
}

export default function Home() {
  const [selected, setSelected] = useState<Area[]>([]);
  const [step, setStep] = useState<Step>("select");
  const [details, setDetails] = useState<Record<Area, AreaDetails>>(
    createEmptyDetails()
  );
  const [focusedArea, setFocusedArea] = useState<Area | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [lastStartedDate, setLastStartedDate] = useState<string | null>(null);
  const [taskSuggestionIndex, setTaskSuggestionIndex] =
    useState<Record<Area, number>>(createSuggestionIndex());
  const [microSuggestionIndex, setMicroSuggestionIndex] =
    useState<Record<Area, number>>(createSuggestionIndex());
  const [hasHydrated, setHasHydrated] = useState(false);

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
        setHasHydrated(true);
        return;
      }

      const parsedDay: Partial<DayState> = JSON.parse(dayRaw);

      const parsedSelected = (parsedDay.selected as Area[]) ?? [];
      const parsedDetails = parsedDay.details ?? createEmptyDetails();
      const parsedFocusedArea = (parsedDay.focusedArea as Area | null) ?? null;
      const parsedStep = parsedDay.step ?? "select";
      const parsedLastStartedDate = parsedDay.lastStartedDate ?? null;

      setTaskSuggestionIndex(
        parsedDay.taskSuggestionIndex ?? createSuggestionIndex()
      );
      setMicroSuggestionIndex(
        parsedDay.microSuggestionIndex ?? createSuggestionIndex()
      );

      const isSameDay = parsedLastStartedDate === today;
      const hasFocusForToday = isSameDay && !!parsedFocusedArea;

      if (isSameDay) {
        setSelected(parsedSelected);
        setDetails(parsedDetails);
        setFocusedArea(parsedFocusedArea);
        setLastStartedDate(parsedLastStartedDate);
        setStep(hasFocusForToday ? "start" : parsedStep);
      } else {
        setSelected([]);
        setDetails(createEmptyDetails());
        setFocusedArea(null);
        setLastStartedDate(null);
        setStep("select");
      }
    } catch (error) {
      console.error("Kunne ikke læse falcus state", error);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const progressState: ProgressState = { streak };
    localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressState));
  }, [hasHydrated, streak]);

  useEffect(() => {
    if (!hasHydrated) return;

    const dayState: DayState = {
      selected,
      details,
      focusedArea,
      step,
      lastStartedDate,
      taskSuggestionIndex,
      microSuggestionIndex,
    };

    localStorage.setItem(DAY_STORAGE_KEY, JSON.stringify(dayState));
  }, [
    hasHydrated,
    selected,
    details,
    focusedArea,
    step,
    lastStartedDate,
    taskSuggestionIndex,
    microSuggestionIndex,
  ]);

  useEffect(() => {
    if (!hasHydrated) return;

    function resetForNewDay() {
      const today = getToday();

      if (lastStartedDate && lastStartedDate !== today) {
        setSelected([]);
        setDetails(createEmptyDetails());
        setFocusedArea(null);
        setStep("select");
        setLastStartedDate(null);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        resetForNewDay();
      }
    }

    resetForNewDay();

    window.addEventListener("focus", resetForNewDay);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", resetForNewDay);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasHydrated, lastStartedDate]);

  function resetDay() {
    setSelected([]);
    setDetails(createEmptyDetails());
    setFocusedArea(null);
    setStep("select");
    setLastStartedDate(null);
  }

  function handleStarted() {
    const today = getToday();

    if (lastStartedDate !== today) {
      setStreak((s) => s + 1);
      setLastStartedDate(today);
    }

    setStep("start");
  }

  function handleSelectFirst(area: Area) {
    setSelected([area]);
    setFocusedArea(area);
    setStep("defineFirst");
  }

  function handleEditText() {
    if (selected.length > 1) {
      setStep("defineRest");
    } else {
      setStep("defineFirst");
    }
  }

  function handleSwitchFocus() {
    setStep("focus");
  }

  function updateDetail(area: Area, field: keyof AreaDetails, value: string) {
    setDetails((prev) => ({
      ...prev,
      [area]: {
        ...prev[area],
        [field]: value,
      },
    }));
  }

  function toggleExtraArea(area: Area) {
    if (selected.includes(area)) {
      if (selected[0] === area) return;
      setSelected((prev) => prev.filter((a) => a !== area));
      return;
    }

    if (selected.length < 3) {
      setSelected((prev) => [...prev, area]);
    }
  }

  function applyTaskSuggestion(area: Area) {
    const options = taskSuggestions[area];
    const currentIndex = taskSuggestionIndex[area] ?? 0;
    const suggestion = options[currentIndex];

    updateDetail(area, "task", suggestion);

    setTaskSuggestionIndex((prev) => ({
      ...prev,
      [area]: (currentIndex + 1) % options.length,
    }));
  }

  function applyMicroSuggestion(area: Area) {
    const options = microSuggestions[area];
    const currentIndex = microSuggestionIndex[area] ?? 0;
    const suggestion = options[currentIndex];

    updateDetail(area, "micro", suggestion);

    setMicroSuggestionIndex((prev) => ({
      ...prev,
      [area]: (currentIndex + 1) % options.length,
    }));
  }

  const firstArea = selected[0] ?? null;
  const extraAreas = selected.slice(1);
  const hasStartedToday = lastStartedDate === getToday();

  const otherSelected = useMemo(() => {
    if (focusedArea === null) return selected;
    return selected.filter((area) => area !== focusedArea);
  }, [selected, focusedArea]);

  const shownOtherSelected = otherSelected.slice(0, 2);
  const hiddenOtherCount = Math.max(
    otherSelected.length - shownOtherSelected.length,
    0
  );

  if (!hasHydrated) {
    return (
      <main className="min-h-screen bg-teal-950 p-6 text-white">
        <div className="mx-auto max-w-md">
          <p className="text-sm text-white/60">Lige et øjeblik…</p>
        </div>
      </main>
    );
  }

  if (step === "defineFirst" && firstArea) {
    const firstTask = details[firstArea]?.task ?? "";
    const firstMicro = details[firstArea]?.micro ?? "";

    return (
      <main className="min-h-screen bg-teal-950 p-6 text-white">
        <div className="mx-auto max-w-md">
          <TopStatus text="1 valgt" streak={streak} />
          <h1 className="mb-2 text-3xl font-bold">Falcus</h1>
          <p className="mb-7 text-sm text-white/70">
            Du valgte én. Gør den lige konkret.
          </p>

          <div className="mb-5 rounded-3xl border border-amber-200/80 bg-amber-300 p-5 text-black shadow-sm">
            <p className="mb-1 text-sm uppercase tracking-wide opacity-70">
              Første valg
            </p>
            <p className="text-lg font-semibold">{areaLabels[firstArea]}</p>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
            <p className="mb-3 font-semibold">{areaLabels[firstArea]}</p>

            <input
              autoFocus
              placeholder="Hvad er opgaven?"
              value={firstTask}
              onChange={(e) => updateDetail(firstArea, "task", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById(`micro-${firstArea}`)?.focus();
                }
              }}
              className="mb-3 w-full rounded-xl bg-white/10 p-3 text-white outline-none placeholder:text-white/40"
            />

            <div className="mb-4 flex flex-wrap gap-2">
              <ChipButton onClick={() => applyTaskSuggestion(firstArea)}>
                Forslag til opgave
              </ChipButton>
            </div>

            <input
              id={`micro-${firstArea}`}
              placeholder="Det mindste du kan gøre…"
              value={firstMicro}
              onChange={(e) => updateDetail(firstArea, "micro", e.target.value)}
              className="mb-3 w-full rounded-xl bg-white/10 p-3 text-white outline-none placeholder:text-white/40"
            />

            <div className="flex flex-wrap gap-2">
              <ChipButton onClick={() => applyMicroSuggestion(firstArea)}>
                Forslag til mikro
              </ChipButton>
            </div>
          </div>

          <p className="mt-4 text-sm text-white/55">Det behøver ikke være stort.</p>

          <button
            onClick={() => setStep("expand")}
            className="mt-7 w-full rounded-full bg-orange-400 px-5 py-4 text-base font-semibold text-black"
          >
            Videre
          </button>

          <button
            onClick={resetDay}
            className="mt-4 w-full rounded-full border border-white/15 px-5 py-4 text-base font-semibold text-white"
          >
            Start forfra
          </button>
        </div>
      </main>
    );
  }

  if (step === "expand" && firstArea) {
    return (
      <main className="min-h-screen bg-teal-950 p-6 text-white">
        <div className="mx-auto max-w-md">
          <TopStatus text={`${selected.length} valgt`} streak={streak} />
          <h1 className="mb-2 text-3xl font-bold">Falcus</h1>
          <p className="mb-7 text-sm text-white/70">
            Du kan tage 2 mere med, hvis det giver mening.
          </p>

          <div className="mb-5 rounded-3xl border border-amber-200/80 bg-amber-300 p-5 text-black shadow-sm">
            <p className="mb-1 text-sm uppercase tracking-wide opacity-70">
              Du har allerede valgt
            </p>
            <p className="text-lg font-semibold">{areaLabels[firstArea]}</p>
            <p className="mt-2 text-sm opacity-80">
              Opgave: {details[firstArea]?.task || "—"}
            </p>
            <p className="text-sm opacity-80">
              Mikro: {details[firstArea]?.micro || "—"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {areas.map((area) => {
              const isSelected = selected.includes(area);
              const isLocked = firstArea === area;
              const isDisabled = !isSelected && selected.length >= 3;

              return (
                <button
                  key={area}
                  onClick={() => toggleExtraArea(area)}
                  disabled={isLocked || isDisabled}
                  className={`rounded-3xl border p-4 text-left font-semibold transition ${
                    isSelected
                      ? "border-amber-200 bg-amber-300 text-black"
                      : "border-white/15 bg-white/10 text-white"
                  } ${isLocked || isDisabled ? "opacity-50" : "opacity-100"}`}
                >
                  {areaLabels[area]}
                  {isLocked && (
                    <p className="mt-1 text-xs opacity-70">Valgt først</p>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-white/65">{selected.length} / 3 valgt</p>

          <button
            onClick={() => {
              if (extraAreas.length > 0) {
                setStep("defineRest");
              } else {
                setFocusedArea(firstArea);
                setStep("focus");
              }
            }}
            className="mt-7 w-full rounded-full bg-orange-400 px-5 py-4 text-base font-semibold text-black"
          >
            Videre
          </button>

          <button
            onClick={() => setStep("defineFirst")}
            className="mt-4 w-full rounded-full border border-white/15 px-5 py-4 text-base font-semibold text-white"
          >
            Tilbage
          </button>
        </div>
      </main>
    );
  }

  if (step === "defineRest") {
    return (
      <main className="min-h-screen bg-teal-950 p-6 text-white">
        <div className="mx-auto max-w-md">
          <TopStatus text={`${selected.length} valgt`} streak={streak} />
          <h1 className="mb-2 text-3xl font-bold">Falcus</h1>
          <p className="mb-7 text-sm text-white/70">
            Gør de andre valg konkrete.
          </p>

          <div className="space-y-4">
            {extraAreas.map((area, index) => (
              <div
                key={area}
                className="rounded-3xl border border-white/15 bg-white/10 p-5"
              >
                <p className="mb-3 font-semibold">{areaLabels[area]}</p>

                <input
                  autoFocus={index === 0}
                  placeholder="Hvad er opgaven?"
                  value={details[area]?.task || ""}
                  onChange={(e) => updateDetail(area, "task", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      document.getElementById(`micro-${area}`)?.focus();
                    }
                  }}
                  className="mb-3 w-full rounded-xl bg-white/10 p-3 text-white outline-none placeholder:text-white/40"
                />

                <div className="mb-4 flex flex-wrap gap-2">
                  <ChipButton onClick={() => applyTaskSuggestion(area)}>
                    Forslag til opgave
                  </ChipButton>
                </div>

                <input
                  id={`micro-${area}`}
                  placeholder="Det mindste du kan gøre…"
                  value={details[area]?.micro || ""}
                  onChange={(e) => updateDetail(area, "micro", e.target.value)}
                  className="mb-3 w-full rounded-xl bg-white/10 p-3 text-white outline-none placeholder:text-white/40"
                />

                <div className="flex flex-wrap gap-2">
                  <ChipButton onClick={() => applyMicroSuggestion(area)}>
                    Forslag til mikro
                  </ChipButton>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-sm text-white/55">
            Bare nok til at du kan komme i gang.
          </p>

          <button
            onClick={() => {
              setFocusedArea(firstArea);
              setStep("focus");
            }}
            className="mt-7 w-full rounded-full bg-orange-400 px-5 py-4 text-base font-semibold text-black"
          >
            Videre
          </button>

          <button
            onClick={() => setStep("expand")}
            className="mt-4 w-full rounded-full border border-white/15 px-5 py-4 text-base font-semibold text-white"
          >
            Tilbage
          </button>
        </div>
      </main>
    );
  }

  if (step === "focus") {
    return (
      <main className="min-h-screen bg-teal-950 p-6 text-white">
        <div className="mx-auto max-w-md">
          <TopStatus
            text={`${selected.length} valgt${focusedArea ? ", vælger fokus" : ""}`}
            streak={streak}
          />
          <h1 className="mb-2 text-3xl font-bold">Falcus</h1>
          <p className="mb-7 text-sm text-white/70">Hvad starter du med?</p>

          <div className="space-y-3">
            {selected.map((area) => {
              const isFocused = focusedArea === area;

              return (
                <button
                  key={area}
                  onClick={() => setFocusedArea(area)}
                  className={`w-full rounded-3xl border p-5 text-left transition ${
                    isFocused
                      ? "border-amber-200 bg-amber-300 text-black"
                      : "border-white/15 bg-white/10 text-white"
                  }`}
                >
                  <p className="font-semibold">{areaLabels[area]}</p>
                  <p className="mt-1 text-sm opacity-80">
                    Opgave: {details[area]?.task || "—"}
                  </p>
                  <p className="text-sm opacity-80">
                    Mikro: {details[area]?.micro || "—"}
                  </p>
                </button>
              );
            })}
          </div>

          {focusedArea && (
            <button
              onClick={() => setStep("start")}
              className="mt-7 w-full rounded-full bg-orange-400 px-5 py-4 text-base font-semibold text-black"
            >
              Start med den her
            </button>
          )}

          <button
            onClick={() => {
              if (extraAreas.length > 0) {
                setStep("defineRest");
              } else {
                setStep("expand");
              }
            }}
            className="mt-4 w-full rounded-full border border-white/15 px-5 py-4 text-base font-semibold text-white"
          >
            Tilbage
          </button>
        </div>
      </main>
    );
  }

  if (step === "start" && focusedArea) {
    return (
      <main className="min-h-screen bg-teal-950 p-6 text-white">
        <div className="mx-auto max-w-md">
          <TopStatus
            text={
              hasStartedToday
                ? `${selected.length} valgt, 1 i fokus`
                : `${selected.length} valgt`
            }
            streak={streak}
          />
          <h1 className="mb-2 text-3xl font-bold">Falcus</h1>

          {hasStartedToday ? (
            <p className="mb-7 text-sm text-white/70">
              Det her er dit fokus i dag.
            </p>
          ) : (
            <p className="mb-7 text-sm text-white/70">
              Du behøver kun starte her.
            </p>
          )}

          <div className="rounded-3xl border border-white/15 bg-white/10 p-5">
            <p className="mb-2 text-sm uppercase tracking-wide text-white/55">
              Dagens kort
            </p>

            <p className="mb-2 text-sm font-semibold text-white/75">
              {areaLabels[focusedArea]}
            </p>

            <p className="text-2xl font-semibold leading-snug text-white">
              {details[focusedArea]?.micro || "—"}
            </p>

            <p className="mt-4 text-sm text-white/55">
              Opgave: {details[focusedArea]?.task || "—"}
            </p>
          </div>

          {shownOtherSelected.length > 0 && (
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="mb-3 text-sm uppercase tracking-wide text-white/50">
                Også valgt i dag
              </p>

              <div className="space-y-2 text-sm">
                {shownOtherSelected.map((area) => (
                  <div
                    key={area}
                    className="border-b border-white/10 pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="font-semibold text-white/90">
                      {areaLabels[area]}
                    </span>
                    <span className="text-white/55"> → </span>
                    <span className="text-white/75">
                      {details[area]?.micro || "—"}
                    </span>
                  </div>
                ))}
              </div>

              {hiddenOtherCount > 0 && (
                <p className="mt-3 text-xs text-white/45">
                  + {hiddenOtherCount} mere valgt
                </p>
              )}
            </div>
          )}

          <p className="mt-4 text-sm text-white/65">
            Begynd bare med mikrohandlingen.
          </p>

          {!hasStartedToday && (
            <button
              onClick={handleStarted}
              className="mt-7 w-full rounded-full bg-orange-400 px-5 py-4 text-base font-semibold text-black"
            >
              Jeg er i gang
            </button>
          )}

          <div className="mt-5 flex items-center justify-center gap-4 text-sm">
            <button
              onClick={handleEditText}
              className="text-white/55 underline underline-offset-4 hover:text-white/75"
            >
              Redigér tekst
            </button>
            <span className="text-white/20">•</span>
            <button
              onClick={handleSwitchFocus}
              className="text-white/55 underline underline-offset-4 hover:text-white/75"
            >
              Skift fokus
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-teal-950 p-6 text-white">
      <div className="mx-auto max-w-md">
        <TopStatus text="Ny dag" streak={streak} />
        <h1 className="mb-2 text-3xl font-bold">Falcus</h1>
        <p className="mb-6 text-sm text-white/70">
          Vælg 1 først. Resten kan komme bagefter.
        </p>

        <h2 className="mb-4 text-lg font-semibold">
          Hvad giver mest mening lige nu?
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {areas.map((area) => (
            <button
              key={area}
              onClick={() => handleSelectFirst(area)}
              className="rounded-3xl border border-white/15 bg-white/10 p-5 text-left font-semibold text-white transition hover:bg-white/15"
            >
              {areaLabels[area]}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-white/70">Du behøver kun vælge ét.</p>
      </div>
    </main>
  );
}