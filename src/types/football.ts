export type FootballTeamSource = "api" | "cache" | "local";

export interface FootballTeam {
  id: string;
  apiId: number | null;
  name: string;
  shortName: string;
  code: string;
  country: string;
  logo: string;
  fallbackLogo: string;
  source: FootballTeamSource;
}

export interface ApiFootballTeam {
  id: number;
  name: string;
  code?: string | null;
  country?: string | null;
  logo?: string | null;
}

export interface ApiFootballTeamResponse {
  team: ApiFootballTeam;
}

export interface FootballTeamsResult {
  teams: FootballTeam[];
  source: FootballTeamSource;
  cache: "hit" | "miss" | "local";
  warning?: "missing-api-key" | "api-unavailable" | "not-found";
}
