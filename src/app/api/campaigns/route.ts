import { saveCampaignSummary } from "@/server/db";
import { getCurrentUser } from "@/server/session";
import type { CampaignSummary } from "@/types/game";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: true, skipped: true });
  const body = (await request.json().catch(() => ({}))) as { summary?: CampaignSummary };
  if (!body.summary?.id || !Array.isArray(body.summary.matches)) return NextResponse.json({ error: "Campanha invalida." }, { status: 400 });
  const summary = {
    ...body.summary,
    config: {
      ...body.summary.config,
      userName: user.username,
      teamName: user.teamName?.trim() || body.summary.config.teamName
    }
  };
  await saveCampaignSummary(summary);
  return NextResponse.json({ ok: true });
}
