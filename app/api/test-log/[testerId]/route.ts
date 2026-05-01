import { NextResponse } from "next/server";
import { redis } from "@/lib/widgetStore";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ testerId: string }> }
) {
  const { testerId } = await params;

  const events = await redis.lrange(`falcus:testlog:${testerId}`, 0, -1);

  return NextResponse.json(events);
}