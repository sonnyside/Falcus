import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

const fallback = {
  title: "Falcus",
  area: "",
  micro: "Åbn Falcus",
  streak: 0,
  done: false,
  state: "idle",
  completedCount: 0,
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const data = await redis.get("widget-data");
    return NextResponse.json(data ?? fallback);
  } catch (error) {
    console.error("Widget load error:", error);
    return NextResponse.json(fallback, { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    await redis.set("widget-data", {
      ...body,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Widget save error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}