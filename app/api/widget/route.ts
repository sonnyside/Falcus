import { NextResponse } from "next/server";
import { redis, WIDGET_KEY } from "@/lib/widgetStore";

const fallback = {
  title: "Vælg fokus",
  micro: "Vælg handling for lige nu",
  area: "",
  emoji: "🦅",
  streak: 0,
  points: 0,
  queuedCount: 0,
  queued1Title: "",
  queued1Micro: "",
  queued1Area: "",
  queued2Title: "",
  queued2Micro: "",
  queued2Area: "",
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  const data = await redis.get(WIDGET_KEY);

  return NextResponse.json(data || fallback, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}