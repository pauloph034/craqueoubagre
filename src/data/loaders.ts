import achievementsJson from "@/data/achievements.json";
import clubSeasonsJson from "@/data/club-seasons.json";
import opponentsJson from "@/data/opponents.json";
import playersJson from "@/data/players.json";
import { dataSetSchema } from "@/data/schemas";
import type { ClubSeason, Player } from "@/types/game";

const parsed = dataSetSchema.parse({
  clubSeasons: clubSeasonsJson,
  players: playersJson,
  opponents: opponentsJson,
  achievements: achievementsJson
});

export const clubSeasons = parsed.clubSeasons as ClubSeason[];
export const players = parsed.players as Player[];
export const opponents = parsed.opponents;
export const achievements = parsed.achievements;

export function playersForSeason(clubSeasonId: string) {
  return players.filter((player) => player.clubSeasonId === clubSeasonId && player.isActive);
}

export function findClubSeason(id: string) {
  return clubSeasons.find((season) => season.id === id);
}
