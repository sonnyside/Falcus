import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

export async function GET() {
  const data = await redis.get("widget-data");

  if (!data) {
    return NextResponse.json({
      title: "Næste mikro",
      area: "",
      micro: "Ingen data endnu",
      streak: 0,
      done: false,
      updatedAt: null,
    });
  }

  return NextResponse.json(data);
}