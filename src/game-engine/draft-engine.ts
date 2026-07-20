import { rarityWeights } from "@/config/game-balance";
import { calculatePositionFit } from "@/game-engine/position-fit";
import type { ClubSeason, Difficulty, Player, Position, Rarity } from "@/types/game";
import type { Rng } from "./rng";

export type DraftContext = {
  difficulty: Difficulty;
  selectedCanonicalIds: string[];
  appearanceCounts: Record<string, number>;
  recentClubSeasonIds: string[];
};

export function eligiblePlayers(players: Player[], clubSeasonId: string, slot: Position | "ANY", selectedCanonicalIds: string[]) {
  return players.filter((player) => {
    if (!player.isActive || player.clubSeasonId !== clubSeasonId) return false;
    if (selectedCanonicalIds.includes(player.canonicalPlayerId)) return false;
    if (slot === "ANY") return true;
    return calculatePositionFit(player, slot).allowed;
  });
}

export function drawClubSeason(rng: Rng, clubSeasons: ClubSeason[], players: Player[], slot: Position | "ANY", context: DraftContext): ClubSeason {
  const eligibleByRarity = new Map<Rarity, ClubSeason[]>();
  for (const season of clubSeasons) {
    if (!season.isActive) continue;
    if ((context.appearanceCounts[season.id] ?? 0) >= 2) continue;
    if (context.recentClubSeasonIds.slice(-3).includes(season.id)) continue;
    if (eligiblePlayers(players, season.id, slot, context.selectedCanonicalIds).length === 0) continue;
    const bucket = eligibleByRarity.get(season.rarity) ?? [];
    bucket.push(season);
    eligibleByRarity.set(season.rarity, bucket);
  }
  const weights = { ...rarityWeights[context.difficulty] };
  for (const rarity of Object.keys(weights) as Rarity[]) {
    if (!eligibleByRarity.get(rarity)?.length) weights[rarity] = 0;
  }
  if ([...eligibleByRarity.values()].every((bucket) => bucket.length === 0)) {
    throw new Error("Nenhum elenco elegivel para o sorteio.");
  }
  const rarity = rng.weighted(weights);
  return rng.pick(eligibleByRarity.get(rarity)!);
}
