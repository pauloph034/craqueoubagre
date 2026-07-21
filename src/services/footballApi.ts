import { getFootballTeamByApiId, getLocalFootballTeams, getTeamLogo, searchLocalFootballTeams, TEAM_PLACEHOLDER_LOGO } from "@/data/football-clubs";
import type { ApiFootballTeamResponse, FootballTeam, FootballTeamsResult, FootballTeamSource } from "@/types/football";

const API_BASE_URL = "https://v3.football.api-sports.io";
export const FOOTBALL_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

type FootballQuery =
  | { type: "local" }
  | { type: "league"; league: number; season: number }
  | { type: "search"; search: string }
  | { type: "team"; teamId: number };

type CacheEntry = {
  teams: FootballTeam[];
  expiresAt: number;
};

export type FootballQueryValidation =
  | { ok: true; query: FootballQuery }
  | { ok: false; status: number; error: string };

export function createMemoryFootballCache(now: () => number = () => Date.now()) {
  const entries = new Map<string, CacheEntry>();
  return {
    get(key: string) {
      const entry = entries.get(key);
      if (!entry || entry.expiresAt <= now()) return undefined;
      return entry.teams.map((team) => ({ ...team, source: "cache" as FootballTeamSource }));
    },
    set(key: string, teams: FootballTeam[], ttlMs = FOOTBALL_CACHE_TTL_MS) {
      entries.set(key, {
        teams: teams.map((team) => ({ ...team })),
        expiresAt: now() + ttlMs
      });
    },
    clear() {
      entries.clear();
    }
  };
}

export const footballTeamCache = createMemoryFootballCache();

export function validateFootballTeamQuery(params: URLSearchParams): FootballQueryValidation {
  if (params.get("local") === "1") return { ok: true, query: { type: "local" } };

  const teamId = params.get("teamId");
  if (teamId) {
    const parsed = Number(teamId);
    if (!Number.isInteger(parsed) || parsed <= 0) return { ok: false, status: 400, error: "teamId invalido." };
    return { ok: true, query: { type: "team", teamId: parsed } };
  }

  const search = params.get("search")?.trim();
  if (search !== undefined) {
    if (search.length < 3) return { ok: false, status: 400, error: "A busca precisa ter pelo menos 3 caracteres." };
    return { ok: true, query: { type: "search", search } };
  }

  const league = params.get("league");
  const season = params.get("season");
  if (league || season) {
    const parsedLeague = Number(league);
    const parsedSeason = Number(season);
    if (!Number.isInteger(parsedLeague) || parsedLeague <= 0) return { ok: false, status: 400, error: "league invalido." };
    if (!Number.isInteger(parsedSeason) || parsedSeason < 1950 || parsedSeason > 2100) return { ok: false, status: 400, error: "season invalido." };
    return { ok: true, query: { type: "league", league: parsedLeague, season: parsedSeason } };
  }

  return { ok: false, status: 400, error: "Informe league+season, teamId, search ou local=1." };
}

export async function getTeamsByLeague(leagueId: number, season: number): Promise<FootballTeamsResult> {
  return getFootballTeams({ type: "league", league: leagueId, season });
}

export async function searchTeamByName(name: string): Promise<FootballTeamsResult> {
  return getFootballTeams({ type: "search", search: name });
}

export async function getTeamById(teamId: number): Promise<FootballTeamsResult> {
  return getFootballTeams({ type: "team", teamId });
}

export async function getFootballTeams(query: FootballQuery): Promise<FootballTeamsResult> {
  if (query.type === "local") {
    return { teams: getLocalFootballTeams(), source: "local", cache: "local" };
  }

  const cacheKey = cacheKeyForQuery(query);
  const cached = footballTeamCache.get(cacheKey);
  if (cached) return { teams: cached, source: "cache", cache: "hit" };

  const localFallback = localTeamsForQuery(query);
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return { teams: localFallback, source: "local", cache: "local", warning: "missing-api-key" };
  }

  try {
    const response = await requestApiTeams(query, apiKey);
    const teams = response.map(normalizeTeam);
    footballTeamCache.set(cacheKey, teams);
    return { teams, source: "api", cache: "miss" };
  } catch (error) {
    logFootballApiIssue(query, error);
    return {
      teams: localFallback,
      source: "local",
      cache: "local",
      warning: localFallback.length ? "api-unavailable" : "not-found"
    };
  }
}

export function normalizeTeam(item: ApiFootballTeamResponse): FootballTeam {
  const apiId = item.team.id;
  const local = getFootballTeamByApiId(apiId);
  return {
    id: local?.id ?? String(apiId),
    apiId,
    name: item.team.name,
    shortName: local?.shortName ?? item.team.name,
    code: item.team.code ?? local?.code ?? "",
    country: item.team.country ?? local?.country ?? "",
    logo: getTeamLogo(apiId),
    fallbackLogo: TEAM_PLACEHOLDER_LOGO,
    source: "api"
  };
}

function localTeamsForQuery(query: Exclude<FootballQuery, { type: "local" }>) {
  if (query.type === "team") {
    const team = getFootballTeamByApiId(query.teamId);
    return team ? [team] : [];
  }
  if (query.type === "search") return searchLocalFootballTeams(query.search);
  return getLocalFootballTeams();
}

async function requestApiTeams(query: Exclude<FootballQuery, { type: "local" }>, apiKey: string): Promise<ApiFootballTeamResponse[]> {
  const params = new URLSearchParams();
  if (query.type === "league") {
    params.set("league", String(query.league));
    params.set("season", String(query.season));
  } else if (query.type === "search") {
    params.set("search", query.search);
  } else {
    params.set("id", String(query.teamId));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/teams?${params.toString()}`, {
      headers: { "x-apisports-key": apiKey },
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`API-Football respondeu ${response.status}`);
    const body = (await response.json()) as { response?: ApiFootballTeamResponse[] };
    if (!Array.isArray(body.response)) throw new Error("Formato inesperado da API-Football");
    return body.response;
  } finally {
    clearTimeout(timeout);
  }
}

function cacheKeyForQuery(query: FootballQuery) {
  if (query.type === "league") return `league:${query.league}:${query.season}`;
  if (query.type === "search") return `search:${query.search.toLowerCase()}`;
  if (query.type === "team") return `team:${query.teamId}`;
  return "local";
}

function logFootballApiIssue(query: FootballQuery, error: unknown) {
  const message = error instanceof Error ? error.message : "erro desconhecido";
  console.warn("[football-api]", {
    endpoint: "/teams",
    query: query.type,
    at: new Date().toISOString(),
    message
  });
}
