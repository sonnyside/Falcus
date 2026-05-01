import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const testerId = typeof body?.testerId === "string" ? body.testerId.trim() : "";

    if (testerId) {
      await redis.sadd("falcus:testers", testerId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track POST error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
