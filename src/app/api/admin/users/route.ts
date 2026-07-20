import { deleteStoredUser, getStoredUser, listPublicUsers, sanitizeUser, updateStoredUser } from "@/server/db";
import { hashPassword } from "@/server/password";
import { requireAdmin } from "@/server/session";
import { cleanUsername } from "@/server/validation";
import { NextResponse } from "next/server";

function temporaryPassword() {
  return `bagre-${Math.random().toString(36).slice(2, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  return NextResponse.json({ users: await listPublicUsers() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: "reset-password" | "toggle-role"; username?: string };
  const username = cleanUsername(body.username);
  if (!username || username === "admin" || username === admin.username) return NextResponse.json({ error: "Usuario protegido." }, { status: 400 });
  const user = await getStoredUser(username);
  if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });

  if (body.action === "reset-password") {
    const password = temporaryPassword();
    await updateStoredUser(user.username, { passwordHash: hashPassword(password) });
    return NextResponse.json({ password, users: await listPublicUsers() });
  }

  if (body.action === "toggle-role") {
    await updateStoredUser(user.username, { role: user.role === "admin" ? "player" : "admin" });
    return NextResponse.json({ users: await listPublicUsers() });
  }

  return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const url = new URL(request.url);
  const username = cleanUsername(url.searchParams.get("username"));
  if (!username || username === "admin" || username === admin.username) return NextResponse.json({ error: "Usuario protegido." }, { status: 400 });
  await deleteStoredUser(username);
  return NextResponse.json({ users: await listPublicUsers() });
}
