import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { TrackEvent } from "@/lib/tracking";

const redis = Redis.fromEnv();

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TrackEvent;

    if (!body?.eventName || !body?.timestamp) {
      return NextResponse.json({ ok: false, error: "invalid payload" }, { status: 400 });
    }

    const testerId = body.testerId?.trim() || "default";
    const key = `falcus:events:${testerId}`;
    const event: TrackEvent = { ...body, testerId };

    await redis.rpush(key, JSON.stringify(event));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track POST error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
