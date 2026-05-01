import { NextRequest, NextResponse } from "next/server";
import { redis, WIDGET_KEY } from "@/lib/widgetStore";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const payload = {
    title: body.title || "Vælg fokus",
    micro: body.micro || "Vælg handling for lige nu",
    area: body.area || "",
    emoji: body.emoji || "🦅",
    streak: Number(body.streak || 0),
    points: Number(body.points || 0),
    queuedCount: Number(body.queuedCount || 0),
    queued1Title: body.queued1Title || "",
    queued1Micro: body.queued1Micro || "",
    queued1Area: body.queued1Area || "",
    queued2Title: body.queued2Title || "",
    queued2Micro: body.queued2Micro || "",
    queued2Area: body.queued2Area || "",
    updatedAt: new Date().toISOString(),
  };

  await redis.set(WIDGET_KEY, payload);

  return NextResponse.json({ ok: true, payload });
}