import { NextResponse } from "next/server";

type WidgetState = {
  selectedTask?: string;
  microStep?: string;
  selectedAreaId?: string;
  streak?: number;
  todayStartedCount?: number;
  activeList?: Array<{
    id?: string;
    task?: string;
    micro?: string;
    areaId?: string;
    status?: "focus" | "queued";
    createdAt?: string;
  }>;
};

const AREA_LABELS: Record<string, string> = {
  okonomi: "Økonomi",
  hjem: "Hjem",
  relationer: "Relationer",
  krop: "Krop",
  arbejde: "Arbejde / Skole",
  fritid: "Fri tid",
  andet: "Andet",
};

function buildFallback() {
  return {
    title: "Falcus",
    area: "",
    micro: "Åbn appen og vælg næste lille skridt",
    task: "",
    streak: 0,
    todayStartedCount: 0,
    hasFocus: false,
    state: "idle",
    updatedAt: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    return NextResponse.json(buildFallback());
  } catch (error) {
    console.error("Widget GET error:", error);
    return NextResponse.json(buildFallback(), { status: 200 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WidgetState;

    const focusItem =
      body.activeList?.find((item) => item.status === "focus") ?? null;

    const micro =
      focusItem?.micro?.trim() ||
      body.microStep?.trim() ||
      "Åbn appen og vælg næste lille skridt";

    const task = focusItem?.task?.trim() || body.selectedTask?.trim() || "";
    const areaId = focusItem?.areaId || body.selectedAreaId || "";
    const area = AREA_LABELS[areaId] || "";
    const streak = typeof body.streak === "number" ? body.streak : 0;
    const todayStartedCount =
      typeof body.todayStartedCount === "number" ? body.todayStartedCount : 0;

    const payload = {
      title: focusItem ? "Fokus nu" : "Falcus",
      area,
      micro,
      task,
      streak,
      todayStartedCount,
      hasFocus: Boolean(focusItem),
      state: focusItem ? "focus" : "idle",
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ ok: true, widget: payload });
  } catch (error) {
    console.error("Widget POST error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}