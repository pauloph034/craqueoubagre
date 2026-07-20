import type { CampaignSummary, SiteMetrics, UserAccount } from "@/types/game";

const activeKey = "champions-xi:active:v1";
const historyKey = "champions-xi:history:v1";
const settingsKey = "champions-xi:settings:v1";
const usersKey = "craque-ou-bagre:users:v1";
const sessionKey = "craque-ou-bagre:session:v1";
const metricsKey = "craque-ou-bagre:metrics:v1";

export function safeLoad<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function safeSave(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // LocalStorage indisponivel: o jogo continua sem persistencia.
  }
}

export function safeRemove(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // LocalStorage indisponivel: o jogo continua sem persistencia.
  }
}

export const storage = {
  activeKey,
  historyKey,
  settingsKey,
  usersKey,
  sessionKey,
  metricsKey,
  loadHistory: () => safeLoad<CampaignSummary[]>(historyKey, []),
  saveHistory: (history: CampaignSummary[]) => safeSave(historyKey, history.slice(0, 100)),
  loadUsers: () => safeLoad<UserAccount[]>(usersKey, []),
  saveUsers: (users: UserAccount[]) => safeSave(usersKey, users),
  loadSession: () => safeLoad<string | undefined>(sessionKey, undefined),
  saveSession: (username?: string) => (username ? safeSave(sessionKey, username) : safeRemove(sessionKey)),
  clearLegacyAuth: () => {
    safeRemove(usersKey);
    safeRemove(sessionKey);
  },
  loadMetrics: () => safeLoad<SiteMetrics>(metricsKey, { visits: 0 }),
  saveMetrics: (metrics: SiteMetrics) => safeSave(metricsKey, metrics),
  recordVisit: () => {
    const current = safeLoad<SiteMetrics>(metricsKey, { visits: 0 });
    const now = new Date().toISOString();
    const next = { visits: current.visits + 1, firstVisitAt: current.firstVisitAt ?? now, lastVisitAt: now };
    safeSave(metricsKey, next);
    return next;
  }
};
