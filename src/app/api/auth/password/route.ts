import { getStoredUser, sanitizeUser, updateStoredUser } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/password";
import { getCurrentUser } from "@/server/session";
import { isStrongEnoughPassword } from "@/server/validation";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { currentPassword?: string; nextPassword?: string };
  const currentPassword = String(body.currentPassword ?? "");
  const nextPassword = String(body.nextPassword ?? "");
  if (!isStrongEnoughPassword(nextPassword)) return NextResponse.json({ error: "A nova senha precisa ter pelo menos 6 caracteres." }, { status: 400 });
  const user = await getStoredUser(currentUser.username);
  if (!user || !verifyPassword(currentPassword, user.passwordHash)) return NextResponse.json({ error: "Senha atual ou temporaria incorreta." }, { status: 401 });
  const updated = await updateStoredUser(user.username, { passwordHash: hashPassword(nextPassword) });
  return NextResponse.json({ user: sanitizeUser(updated ?? user) });
}
