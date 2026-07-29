import { DAILY_RANKED_MATCH_LIMIT } from "@/config/seasons-balance";
import type { DailyAllowance, RankedMatch } from "@/types/seasons";

const TIME_ZONE = "America/Sao_Paulo";

export function saoPauloDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function nextSaoPauloReset(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const offsetHours = date.getTimezoneOffset() === 180 ? 3 : 3;
  return new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day) + 1, offsetHours)).toISOString();
}

export function dailyAllowance(matches: RankedMatch[], now = new Date()): DailyAllowance {
  const dateKey = saoPauloDateKey(now);
  const used = matches.filter((match) => saoPauloDateKey(new Date(match.completedAt)) === dateKey).length;
  return {
    used,
    limit: DAILY_RANKED_MATCH_LIMIT,
    remaining: Math.max(0, DAILY_RANKED_MATCH_LIMIT - used),
    dateKey,
    resetsAt: nextSaoPauloReset(now)
  };
}
