import clubsJson from "@/data/clubs.json";
import type { FootballTeam } from "@/types/football";

export const TEAM_PLACEHOLDER_LOGO = "/images/team-placeholder.svg";
const API_LOGO_BASE_URL = "https://media.api-sports.io/football/teams";

type ClubJson = {
  id: string;
  name: string;
  shortName: string;
  country: string;
};

type ClubApiMapping = {
  id: string;
  apiId: number | null;
  officialName: string;
  shortName: string;
  code: string;
  country: string;
  aliases?: string[];
};

const clubApiMappings: ClubApiMapping[] = [
  { id: "ajax", apiId: 194, officialName: "Ajax", shortName: "Ajax", code: "AJA", country: "Paises Baixos" },
  { id: "arsenal", apiId: 42, officialName: "Arsenal", shortName: "Arsenal", code: "ARS", country: "Inglaterra" },
  { id: "atletico", apiId: 530, officialName: "Atletico Madrid", shortName: "Atletico", code: "ATM", country: "Espanha", aliases: ["atletico-madrid", "atletico de madrid"] },
  { id: "barcelona", apiId: 529, officialName: "Barcelona", shortName: "Barcelona", code: "BAR", country: "Espanha" },
  { id: "bayern", apiId: 157, officialName: "Bayern Munich", shortName: "Bayern", code: "BAY", country: "Alemanha", aliases: ["bayern-munique", "bayern de munique"] },
  { id: "benfica", apiId: 211, officialName: "Benfica", shortName: "Benfica", code: "BEN", country: "Portugal" },
  { id: "celtic", apiId: 247, officialName: "Celtic", shortName: "Celtic", code: "CEL", country: "Escocia" },
  { id: "chelsea", apiId: 49, officialName: "Chelsea", shortName: "Chelsea", code: "CHE", country: "Inglaterra" },
  { id: "dortmund", apiId: 165, officialName: "Borussia Dortmund", shortName: "Dortmund", code: "BVB", country: "Alemanha", aliases: ["borussia-dortmund", "borussia dortmund"] },
  { id: "dynamo-kyiv", apiId: 572, officialName: "Dynamo Kyiv", shortName: "Dynamo Kyiv", code: "DKY", country: "Ucrania" },
  { id: "hamburg", apiId: null, officialName: "Hamburg", shortName: "Hamburg", code: "HSV", country: "Alemanha" },
  { id: "internazionale", apiId: 505, officialName: "Inter", shortName: "Inter", code: "INT", country: "Italia", aliases: ["inter", "internazionale"] },
  { id: "juventus", apiId: 496, officialName: "Juventus", shortName: "Juventus", code: "JUV", country: "Italia" },
  { id: "leverkusen", apiId: 168, officialName: "Bayer Leverkusen", shortName: "Leverkusen", code: "B04", country: "Alemanha", aliases: ["bayer leverkusen"] },
  { id: "liverpool", apiId: 40, officialName: "Liverpool", shortName: "Liverpool", code: "LIV", country: "Inglaterra" },
  { id: "man-city", apiId: 50, officialName: "Manchester City", shortName: "Man. City", code: "MCI", country: "Inglaterra", aliases: ["manchester-city", "manchester city"] },
  { id: "man-united", apiId: 33, officialName: "Manchester United", shortName: "Man. United", code: "MUN", country: "Inglaterra", aliases: ["manchester-united", "manchester united"] },
  { id: "marseille", apiId: 81, officialName: "Marseille", shortName: "Marseille", code: "OM", country: "Franca" },
  { id: "milan", apiId: 489, officialName: "AC Milan", shortName: "Milan", code: "MIL", country: "Italia", aliases: ["ac milan"] },
  { id: "monaco", apiId: 91, officialName: "Monaco", shortName: "Monaco", code: "ASM", country: "Franca" },
  { id: "napoli", apiId: 492, officialName: "Napoli", shortName: "Napoli", code: "NAP", country: "Italia" },
  { id: "nottingham-forest", apiId: 65, officialName: "Nottingham Forest", shortName: "Nottingham", code: "NFO", country: "Inglaterra" },
  { id: "panathinaikos", apiId: 617, officialName: "Panathinaikos", shortName: "Panathinaikos", code: "PAO", country: "Grecia" },
  { id: "paris-saint-germain", apiId: 85, officialName: "Paris Saint Germain", shortName: "PSG", code: "PSG", country: "Franca", aliases: ["psg", "paris saint-germain", "paris saint germain"] },
  { id: "porto", apiId: 212, officialName: "FC Porto", shortName: "Porto", code: "POR", country: "Portugal" },
  { id: "psv", apiId: 197, officialName: "PSV Eindhoven", shortName: "PSV", code: "PSV", country: "Paises Baixos", aliases: ["psv eindhoven"] },
  { id: "real-madrid", apiId: 541, officialName: "Real Madrid", shortName: "Real Madrid", code: "RMA", country: "Espanha" },
  { id: "red-star", apiId: null, officialName: "FK Crvena Zvezda", shortName: "Red Star", code: "RSB", country: "Servia", aliases: ["estrela-vermelha", "estrela vermelha", "red star"] },
  { id: "roma", apiId: 497, officialName: "AS Roma", shortName: "Roma", code: "ROM", country: "Italia" },
  { id: "sampdoria", apiId: 498, officialName: "Sampdoria", shortName: "Sampdoria", code: "SAM", country: "Italia" },
  { id: "sevilla", apiId: 536, officialName: "Sevilla", shortName: "Sevilla", code: "SEV", country: "Espanha" },
  { id: "steaua", apiId: null, officialName: "Steaua Bucuresti", shortName: "Steaua", code: "STE", country: "Romenia", aliases: ["steaua-bucareste", "steaua bucareste"] },
  { id: "tottenham", apiId: 47, officialName: "Tottenham", shortName: "Tottenham", code: "TOT", country: "Inglaterra", aliases: ["tottenham hotspur"] },
  { id: "valencia", apiId: 532, officialName: "Valencia", shortName: "Valencia", code: "VAL", country: "Espanha" }
];

const clubs = clubsJson as ClubJson[];
const mappingEntries: Array<readonly [string, ClubApiMapping]> = clubApiMappings.flatMap((mapping) => [
  [normalizeKey(mapping.id), mapping] as const,
  ...(mapping.aliases ?? []).map((alias) => [normalizeKey(alias), mapping] as const)
]);
const mappingById = new Map<string, ClubApiMapping>(mappingEntries);

export function getTeamLogo(apiId: number | null | undefined): string {
  return apiId ? `${API_LOGO_BASE_URL}/${apiId}.png` : TEAM_PLACEHOLDER_LOGO;
}

export function getLocalFootballTeams(): FootballTeam[] {
  const teams = new Map<string, FootballTeam>();
  for (const club of clubs) {
    const mapping = mappingById.get(normalizeKey(club.id)) ?? mappingById.get(normalizeKey(club.name));
    const id = mapping?.id ?? club.id;
    teams.set(id, toFootballTeam({
      id,
      apiId: mapping?.apiId ?? null,
      officialName: mapping?.officialName ?? club.name,
      shortName: mapping?.shortName ?? club.name,
      code: mapping?.code ?? club.shortName,
      country: mapping?.country ?? club.country
    }));
  }
  for (const mapping of clubApiMappings) {
    if (!teams.has(mapping.id)) teams.set(mapping.id, toFootballTeam(mapping));
  }
  return [...teams.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getFootballTeamByClubId(clubId?: string): FootballTeam | undefined {
  if (!clubId) return undefined;
  const mapping = mappingById.get(normalizeKey(clubId));
  return mapping ? toFootballTeam(mapping) : undefined;
}

export function getFootballTeamByApiId(apiId?: number | null): FootballTeam | undefined {
  if (!apiId) return undefined;
  const mapping = clubApiMappings.find((item) => item.apiId === apiId);
  return mapping ? toFootballTeam(mapping) : undefined;
}

export function getFootballTeamByName(name?: string): FootballTeam | undefined {
  if (!name) return undefined;
  const cleanName = stripSeasonSuffix(name);
  const exact = mappingById.get(normalizeKey(cleanName));
  if (exact) return toFootballTeam(exact);
  const normalized = normalizeKey(cleanName);
  const mapping = clubApiMappings.find((item) => {
    const names = [item.officialName, item.shortName, item.code, item.id, ...(item.aliases ?? [])];
    return names.some((candidate) => normalizeKey(candidate) === normalized);
  });
  return mapping ? toFootballTeam(mapping) : undefined;
}

export function searchLocalFootballTeams(term: string): FootballTeam[] {
  const normalized = normalizeKey(stripSeasonSuffix(term));
  if (normalized.length < 3) return [];
  return getLocalFootballTeams().filter((team) => {
    const aliases = clubApiMappings.find((item) => item.id === team.id)?.aliases ?? [];
    return [team.name, team.shortName, team.code, team.id, ...aliases].some((value) => normalizeKey(value).includes(normalized));
  });
}

export function stripSeasonSuffix(name: string): string {
  return name.replace(/\s+\d{2,4}\/\d{2}$/u, "").trim();
}

export function normalizeKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toFootballTeam(mapping: ClubApiMapping): FootballTeam {
  return {
    id: mapping.id,
    apiId: mapping.apiId,
    name: mapping.officialName,
    shortName: mapping.shortName,
    code: mapping.code,
    country: mapping.country,
    logo: getTeamLogo(mapping.apiId),
    fallbackLogo: TEAM_PLACEHOLDER_LOGO,
    source: "local"
  };
}
