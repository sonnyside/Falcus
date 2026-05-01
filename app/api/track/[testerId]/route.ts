import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET(_req: Request, ctx: RouteContext<"/api/track/[testerId]">) {
  try {
    const { testerId } = await ctx.params;
    const key = `falcus:events:${testerId || "default"}`;
    const data = await redis.lrange<string>(key, 0, -1);
    const events = data.map((item) => {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    });

    return NextResponse.json({ testerId: testerId || "default", events });
  } catch (error) {
    console.error("Track GET error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
