import { recordVisit } from "@/server/db";
import { NextResponse } from "next/server";

export async function POST() {
  const metrics = await recordVisit();
  return NextResponse.json({ metrics });
}
