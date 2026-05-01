import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/widgetStore";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const testerId = body.testerId || "default";

  const event = {
    testerId,
    eventName: body.eventName || "unknown_event",
    timestamp: body.timestamp || new Date().toISOString(),
    metadata: body.metadata || {},
  };

  await redis.rpush(`falcus:testlog:${testerId}`, event);
  await redis.sadd("falcus:testers", testerId);

  return NextResponse.json({ ok: true });
}