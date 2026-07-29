import { getStoredUser, sanitizeUser, updateStoredUser } from "@/server/db";
import { getCurrentUser } from "@/server/session";
import { cleanText } from "@/server/validation";
import { validatePublicName } from "@/server/name-policy";
import { isValidEmblemId } from "@/data/team-emblems";
import { isProfileCountry } from "@/data/countries";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { playerName?: string; teamName?: string; emblemId?: string; country?: string };
  const playerName = cleanText(body.playerName, 48);
  const teamName = cleanText(body.teamName, 48);
  const emblemId = String(body.emblemId ?? "");
  const country = cleanText(body.country, 48);
  if (playerName.length < 3 || teamName.length < 3 || !isValidEmblemId(emblemId) || !isProfileCountry(country)) {
    return NextResponse.json({ error: "Use nome do jogador, nome do time, pais e um escudo valido." }, { status: 400 });
  }
  const playerNamePolicy = validatePublicName(playerName);
  const teamNamePolicy = validatePublicName(teamName);
  if (!playerNamePolicy.allowed || !teamNamePolicy.allowed) {
    return NextResponse.json({ error: !playerNamePolicy.allowed ? playerNamePolicy.reason : teamNamePolicy.reason }, { status: 400 });
  }
  const existing = await getStoredUser(currentUser.username);
  if (!existing) return NextResponse.json({ error: "Conta nao encontrada." }, { status: 404 });
  const user = await updateStoredUser(currentUser.username, { playerName, teamName, emblemId, country });
  return NextResponse.json({ user: sanitizeUser(user ?? existing) });
}
