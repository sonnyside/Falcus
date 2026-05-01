import { NextResponse } from "next/server";
import { redis } from "@/lib/widgetStore";

export async function GET() {
  const testers = await redis.smembers("falcus:testers");
  return NextResponse.json(testers);
}