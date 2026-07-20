import { getStoredUser, sanitizeUser, updateStoredUser } from "@/server/db";
import { getCurrentUser } from "@/server/session";
import { cleanText } from "@/server/validation";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { playerName?: string; teamName?: string };
  const playerName = cleanText(body.playerName, 48);
  const teamName = cleanText(body.teamName, 48);
  if (playerName.length < 3 || teamName.length < 3) {
    return NextResponse.json({ error: "Use nome do jogador e nome do time com pelo menos 3 caracteres." }, { status: 400 });
  }
  const existing = await getStoredUser(currentUser.username);
  if (!existing) return NextResponse.json({ error: "Conta nao encontrada." }, { status: 404 });
  const user = await updateStoredUser(currentUser.username, { playerName, teamName });
  return NextResponse.json({ user: sanitizeUser(user ?? existing) });
}
