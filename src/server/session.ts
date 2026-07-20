import type { UserAccount } from "@/types/game";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ensureAdminUser, getStoredUser, sanitizeUser } from "./db";

const sessionCookie = "cob_session";
const maxAgeSeconds = 60 * 60 * 24 * 14;

type SessionPayload = {
  username: string;
  exp: number;
};

function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET precisa estar configurado em producao.");
  return "dev-only-change-me-before-production";
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function createToken(payload: SessionPayload) {
  const body = base64Url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

function verifyToken(token?: string) {
  if (!token) return undefined;
  const [body, signature] = token.split(".");
  if (!body || !signature) return undefined;
  const expected = sign(body);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.username || payload.exp < Date.now()) return undefined;
    return payload;
  } catch {
    return undefined;
  }
}

export async function setSession(username: string) {
  const jar = await cookies();
  jar.set(sessionCookie, createToken({ username, exp: Date.now() + maxAgeSeconds * 1000 }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.set(sessionCookie, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
}

export async function getCurrentUser(): Promise<UserAccount | undefined> {
  await ensureAdminUser();
  const jar = await cookies();
  const payload = verifyToken(jar.get(sessionCookie)?.value);
  if (!payload) return undefined;
  const user = await getStoredUser(payload.username);
  return user ? sanitizeUser(user) : undefined;
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? user : undefined;
}
