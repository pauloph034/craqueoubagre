import { getCurrentUser } from "@/server/session";
import { startRankedSeason } from "@/server/seasons";
import type { DraftPick, TacticalStyle } from "@/types/game";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na conta para iniciar uma temporada." }, { status: 401 });
  if (!user.country) return NextResponse.json({ error: "Escolha seu pais no perfil antes de entrar no ranking." }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { squad?: DraftPick[]; formation?: string; tacticalStyle?: TacticalStyle };
  try {
    const season = await startRankedSeason(user, body);
    return NextResponse.json({ season }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel iniciar a temporada." }, { status: 400 });
  }
}
