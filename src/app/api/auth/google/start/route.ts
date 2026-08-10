import {
  createGoogleOAuthChallenge,
  getSupabaseAuthConfig,
  googleOAuthCookieMaxAge,
  googleOAuthStateCookie,
  googleOAuthVerifierCookie,
  safeOAuthRedirect
} from "@/server/google-oauth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { url } = getSupabaseAuthConfig();
    const { verifier, challenge, state } = createGoogleOAuthChallenge();
    const redirect = safeOAuthRedirect(request.nextUrl.searchParams.get("redirect"));
    const callbackUrl = new URL("/api/auth/google/callback", request.nextUrl.origin);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("redirect", redirect);

    const authorizeUrl = new URL(`${url}/auth/v1/authorize`);
    authorizeUrl.searchParams.set("provider", "google");
    authorizeUrl.searchParams.set("redirect_to", callbackUrl.toString());
    authorizeUrl.searchParams.set("code_challenge", challenge);
    authorizeUrl.searchParams.set("code_challenge_method", "s256");

    const response = NextResponse.redirect(authorizeUrl);
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/api/auth/google",
      maxAge: googleOAuthCookieMaxAge
    };
    response.cookies.set(googleOAuthVerifierCookie, verifier, cookieOptions);
    response.cookies.set(googleOAuthStateCookie, state, cookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login com Google indisponivel.";
    const redirectUrl = new URL("/conta", request.nextUrl.origin);
    redirectUrl.searchParams.set("oauthError", message);
    return NextResponse.redirect(redirectUrl);
  }
}

