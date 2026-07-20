import { ensureAdminUser, getStoredUser, sanitizeUser } from "@/server/db";
import { verifyPassword } from "@/server/password";
import { setSession } from "@/server/session";
import { cleanUsername } from "@/server/validation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await ensureAdminUser();
  const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
  const username = cleanUsername(body.username);
  const password = String(body.password ?? "");
  const user = await getStoredUser(username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Usuario ou senha invalido." }, { status: 401 });
  }
  await setSession(user.username);
  return NextResponse.json({ user: sanitizeUser(user) });
}
