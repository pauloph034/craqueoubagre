import type { DraftPick } from "@/types/game";

export function calculateChemistry(picks: DraftPick[]): number {
  if (picks.length === 0) return 0;
  const clubs = new Map<string, number>();
  const nations = new Map<string, number>();
  let fitScore = 0;
  for (const pick of picks) {
    clubs.set(pick.clubSeason.clubId, (clubs.get(pick.clubSeason.clubId) ?? 0) + 1);
    nations.set(pick.player.nationality, (nations.get(pick.player.nationality) ?? 0) + 1);
    fitScore += pick.fitType === "primary" ? 5 : pick.fitType === "secondary" ? 4 : 2;
  }
  const links = [...clubs.values(), ...nations.values()].reduce((sum, amount) => sum + Math.max(0, amount - 1) * 3, 0);
  const raw = 45 + (fitScore / (picks.length * 5)) * 30 + links;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
