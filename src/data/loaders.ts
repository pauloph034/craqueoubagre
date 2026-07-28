import achievementsJson from "@/data/achievements.json";
import clubSeasonsJson from "@/data/club-seasons.json";
import opponentsJson from "@/data/opponents.json";
import playersJson from "@/data/players.json";
import { dataSetSchema } from "@/data/schemas";
import type { ClubSeason, Player } from "@/types/game";

const eligibleChampionsCountries = new Set([
  "Alemanha",
  "Belgica",
  "Escocia",
  "Espanha",
  "Franca",
  "Holanda",
  "Inglaterra",
  "Italia",
  "Portugal",
  "Romenia",
  "Servia",
  "Turquia",
  "Ucrania"
]);

const parsed = dataSetSchema.parse({
  clubSeasons: clubSeasonsJson,
  players: playersJson,
  opponents: opponentsJson,
  achievements: achievementsJson
});

export const clubSeasons = (parsed.clubSeasons as ClubSeason[]).filter((season) => season.isActive && eligibleChampionsCountries.has(season.country));
const eligibleSeasonIds = new Set(clubSeasons.map((season) => season.id));
export const players = (parsed.players as Player[]).filter((player) => player.isActive && eligibleSeasonIds.has(player.clubSeasonId));
export const opponents = parsed.opponents;
export const achievements = parsed.achievements;

export function playersForSeason(clubSeasonId: string) {
  return players.filter((player) => player.clubSeasonId === clubSeasonId && player.isActive);
}

export function findClubSeason(id: string) {
  return clubSeasons.find((season) => season.id === id);
}
