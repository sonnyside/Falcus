import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET() {
  try {
    const testerIds = await redis.smembers("falcus:testers");
    return NextResponse.json(testerIds);
  } catch (error) {
    console.error("Track testers GET error:", error);
    return NextResponse.json([], { status: 500 });
  }
}
