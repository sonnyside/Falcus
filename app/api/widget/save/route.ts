import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    await redis.set("widget-data", body);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Widget save error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}