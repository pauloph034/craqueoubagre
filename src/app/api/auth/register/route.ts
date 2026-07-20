import { createStoredUser, ensureAdminUser, getStoredUser, sanitizeUser } from "@/server/db";
import { hashPassword } from "@/server/password";
import { setSession } from "@/server/session";
import { cleanText, cleanUsername, isStrongEnoughPassword, isValidUsername } from "@/server/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await ensureAdminUser();
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string; teamName?: string };
  const username = cleanUsername(body.username);
  const teamName = cleanText(body.teamName, 48);
  const password = String(body.password ?? "");
  if (!isValidUsername(username) || teamName.length < 3 || !isStrongEnoughPassword(password)) {
    return NextResponse.json({ error: "Use usuario valido, nome do time e senha com pelo menos 6 caracteres." }, { status: 400 });
  }
  if (await getStoredUser(username)) return NextResponse.json({ error: "Usuario ja existe." }, { status: 409 });
  const user = await createStoredUser({
    username,
    playerName: username,
    teamName,
    passwordHash: hashPassword(password),
    role: "player",
    createdAt: new Date().toISOString()
  });
  await setSession(user.username);
  return NextResponse.json({ user: sanitizeUser(user) }, { status: 201 });
}
