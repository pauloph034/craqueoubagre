import { createStoredUser, ensureAdminUser, getStoredUser } from "@/server/db";
import {
  getSupabaseAuthConfig,
  googleOAuthStateCookie,
  googleOAuthVerifierCookie,
  googlePlayerName,
  googleUsername,
  linkedGoogleUsername,
  safeOAuthRedirect,
  type SupabaseOAuthUser
} from "@/server/google-oauth";
import { hashPassword } from "@/server/password";
import { setSession } from "@/server/session";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type TokenResponse = {
  access_token?: string;
  user?: SupabaseOAuthUser;
  error?: string;
  error_description?: string;
  msg?: string;
};

export async function GET(request: NextRequest) {
  const redirect = safeOAuthRedirect(request.nextUrl.searchParams.get("redirect"));
  const accountUrl = new URL("/conta", request.nextUrl.origin);

  try {
    const providerError = request.nextUrl.searchParams.get("error_description") || request.nextUrl.searchParams.get("error");
    if (providerError) throw new Error(providerError);

    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(googleOAuthStateCookie)?.value;
    const verifier = request.cookies.get(googleOAuthVerifierCookie)?.value;
    if (!code || !state || !storedState || state !== storedState || !verifier) {
      throw new Error("O acesso expirou. Tente entrar com Google novamente.");
    }

    const { url, key } = getSupabaseAuthConfig();
    const tokenResponse = await fetch(`${url}/auth/v1/token?grant_type=pkce`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
      cache: "no-store"
    });
    const token = (await tokenResponse.json().catch(() => ({}))) as TokenResponse;
    if (!tokenResponse.ok || !token.user?.id) {
      throw new Error(token.error_description || token.msg || token.error || "Nao foi possivel validar sua conta Google.");
    }

    const linkedUsername = linkedGoogleUsername(token.user, process.env.ADMIN_GOOGLE_EMAIL, process.env.ADMIN_USERNAME);
    if (linkedUsername) await ensureAdminUser();
    const username = linkedUsername || googleUsername(token.user.id);
    let user = await getStoredUser(username);
    if (linkedUsername && !user) throw new Error("A conta administrativa vinculada nao foi encontrada.");
    const isNew = !user;
    if (!user) {
      user = await createStoredUser({
        username,
        playerName: googlePlayerName(token.user),
        emblemId: "emblem-01",
        passwordHash: hashPassword(randomBytes(48).toString("base64url")),
        role: "player",
        createdAt: new Date().toISOString()
      });
    }
    await setSession(user.username);

    const destination = isNew ? accountUrl : new URL(redirect, request.nextUrl.origin);
    if (isNew) {
      destination.searchParams.set("google", "novo");
      if (redirect !== "/conta") destination.searchParams.set("redirect", redirect);
    }
    const response = NextResponse.redirect(destination);
    clearOAuthCookies(response);
    return response;
  } catch (error) {
    accountUrl.searchParams.set("oauthError", error instanceof Error ? error.message : "Login com Google indisponivel.");
    const response = NextResponse.redirect(accountUrl);
    clearOAuthCookies(response);
    return response;
  }
}

function clearOAuthCookies(response: NextResponse) {
  const options = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/api/auth/google", maxAge: 0 };
  response.cookies.set(googleOAuthVerifierCookie, "", options);
  response.cookies.set(googleOAuthStateCookie, "", options);
}
