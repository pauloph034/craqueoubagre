import type { CampaignSummary, SiteMetrics, UserAccount } from "@/types/game";

const legacyHistoryKey = "champions-xi:history:v1";
const legacyActiveKey = "champions-xi:active:v1";
const activeKey = "craque-ou-bagre:active:v1";
const historyKey = "craque-ou-bagre:history:v1";
const settingsKey = "craque-ou-bagre:settings:v1";
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

function safeLoadWithLegacy<T>(key: string, legacyKey: string, fallback: T): T {
  const current = safeLoad<T>(key, fallback);
  if (current !== fallback) return current;
  const legacy = safeLoad<T>(legacyKey, fallback);
  if (legacy !== fallback) safeSave(key, legacy);
  return legacy;
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
  loadHistory: () => safeLoadWithLegacy<CampaignSummary[]>(historyKey, legacyHistoryKey, []),
  saveHistory: (history: CampaignSummary[]) => safeSave(historyKey, history.slice(0, 100)),
  loadActive: <T>(fallback: T) => safeLoadWithLegacy<T>(activeKey, legacyActiveKey, fallback),
  saveActive: (campaign: unknown) => safeSave(activeKey, campaign),
  clearActive: () => {
    safeRemove(activeKey);
    safeRemove(legacyActiveKey);
  },
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
