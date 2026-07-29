import { seasonXp } from "@/config/seasons-balance";
import type { RankedDivision, RankedSeasonOutcome } from "@/types/seasons";

export function matchXp(result: "win" | "draw" | "loss") {
  return seasonXp.participation + (result === "win" ? seasonXp.win : result === "draw" ? seasonXp.draw : 0);
}

export function completionXp(division: RankedDivision, outcome: RankedSeasonOutcome, wins: number) {
  let total = seasonXp.completion;
  if (outcome === "promoted") total += seasonXp.promotion;
  if (outcome === "champion") total += division === "lenda" ? seasonXp.legendTitle : seasonXp.title;
  if (outcome === "legend-perfect") total += seasonXp.legendTitle;
  if (wins === 8) total += seasonXp.perfect;
  return total;
}
