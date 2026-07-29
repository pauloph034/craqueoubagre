import { createStoredUser, ensureAdminUser, getStoredUser, sanitizeUser } from "@/server/db";
import { hashPassword } from "@/server/password";
import { validatePublicName } from "@/server/name-policy";
import { setSession } from "@/server/session";
import { cleanText, cleanUsername, isStrongEnoughPassword, isValidUsername } from "@/server/validation";
import { isValidEmblemId } from "@/data/team-emblems";
import { isProfileCountry } from "@/data/countries";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await ensureAdminUser();
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string; teamName?: string; emblemId?: string; country?: string };
  const username = cleanUsername(body.username);
  const teamName = cleanText(body.teamName, 48);
  const password = String(body.password ?? "");
  const emblemId = String(body.emblemId ?? "");
  const country = cleanText(body.country, 48);
  const usernamePolicy = validatePublicName(username);
  const teamNamePolicy = validatePublicName(teamName);
  if (!isValidUsername(username) || teamName.length < 3 || !isStrongEnoughPassword(password) || !isValidEmblemId(emblemId) || !isProfileCountry(country)) {
    return NextResponse.json({ error: "Use usuario valido, nome do time, pais, escudo e senha com pelo menos 6 caracteres." }, { status: 400 });
  }
  if (!usernamePolicy.allowed || !teamNamePolicy.allowed) {
    return NextResponse.json({ error: !usernamePolicy.allowed ? usernamePolicy.reason : teamNamePolicy.reason }, { status: 400 });
  }
  if (await getStoredUser(username)) return NextResponse.json({ error: "Usuario ja existe." }, { status: 409 });
  const user = await createStoredUser({
    username,
    playerName: username,
    teamName,
    emblemId,
    country,
    passwordHash: hashPassword(password),
    role: "player",
    createdAt: new Date().toISOString()
  });
  await setSession(user.username);
  return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
}
