import type { DraftPick } from "@/types/game";

export function calculateTeamRating(picks: DraftPick[]): number {
  if (picks.length === 0) return 0;
  const weighted = picks.reduce((sum, pick) => sum + pick.effectiveRating, 0) / picks.length;
  const fitPenalty = picks.filter((pick) => pick.fitType === "adapted").length * 0.4;
  return Math.round((weighted - fitPenalty) * 10) / 10;
}

export function calculateSectorRatings(picks: DraftPick[]) {
  const by = (positions: string[]) => picks.filter((pick) => positions.includes(pick.slotPosition));
  const avg = (items: DraftPick[]) => (items.length ? items.reduce((sum, pick) => sum + pick.effectiveRating, 0) / items.length : 72);
  return {
    goalkeeper: avg(by(["GK"])),
    defense: avg(by(["RB", "CB", "LB", "RWB", "LWB"])),
    midfield: avg(by(["DM", "CM", "MEI", "RM", "LM"])),
    attack: avg(by(["RW", "LW", "CF", "ST"]))
  };
}

