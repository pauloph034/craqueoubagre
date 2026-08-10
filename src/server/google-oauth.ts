import { createHash, randomBytes } from "node:crypto";
import { cleanText } from "./validation";

export const googleOAuthVerifierCookie = "cob_google_oauth_verifier";
export const googleOAuthStateCookie = "cob_google_oauth_state";
export const googleOAuthCookieMaxAge = 60 * 10;

export type SupabaseOAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

export function getSupabaseAuthConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Login com Google ainda nao foi configurado.");
  return { url, key };
}

export function createGoogleOAuthChallenge() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const state = randomBytes(24).toString("base64url");
  return { verifier, challenge, state };
}

export function googleUsername(providerId: string) {
  return `g_${createHash("sha256").update(providerId).digest("hex").slice(0, 20)}`;
}

export function linkedGoogleUsername(user: SupabaseOAuthUser, adminEmail?: string, adminUsername?: string) {
  const verifiedEmail = user.email_confirmed_at ? user.email?.trim().toLowerCase() : "";
  const linkedEmail = adminEmail?.trim().toLowerCase();
  if (!verifiedEmail || !linkedEmail || verifiedEmail !== linkedEmail) return undefined;
  return adminUsername?.trim() || "admin";
}

export function googlePlayerName(user: SupabaseOAuthUser) {
  const metadataName = cleanText(user.user_metadata?.full_name || user.user_metadata?.name, 48);
  if (metadataName) return metadataName;
  const emailName = cleanText(user.email?.split("@")[0], 48);
  return emailName || "Jogador";
}

export function safeOAuthRedirect(value: string | null) {
  return value === "/salas" || value === "/temporadas" || value === "/jogar" ? value : "/conta";
}
