import type { Difficulty } from "@/types/game";
import type { RankedDivision } from "@/types/seasons";

export const SEASON_MATCH_LIMIT = 8;
export const DAILY_RANKED_MATCH_LIMIT = 8;
export const SEASON_SWAP_LIMIT = 3;
export const SEASON_REROLL_LIMIT = 2;

export type DivisionThresholds = {
  relegationMax?: number;
  stayMin: number;
  promotionMin?: number;
  titleMin: number;
};

export const divisionThresholds: Record<string, DivisionThresholds> = {
  "10": { stayMin: 0, promotionMin: 9, titleMin: 15 },
  "9": { relegationMax: 5, stayMin: 6, promotionMin: 11, titleMin: 17 },
  "8": { relegationMax: 5, stayMin: 6, promotionMin: 11, titleMin: 17 },
  "7": { relegationMax: 5, stayMin: 6, promotionMin: 11, titleMin: 17 },
  "6": { relegationMax: 7, stayMin: 8, promotionMin: 13, titleMin: 18 },
  "5": { relegationMax: 7, stayMin: 8, promotionMin: 13, titleMin: 18 },
  "4": { relegationMax: 7, stayMin: 8, promotionMin: 13, titleMin: 18 },
  "3": { relegationMax: 9, stayMin: 10, promotionMin: 15, titleMin: 20 },
  "2": { relegationMax: 9, stayMin: 10, promotionMin: 15, titleMin: 20 },
  "1": { relegationMax: 10, stayMin: 11, titleMin: 18 },
  lenda: { relegationMax: 11, stayMin: 12, titleMin: 18 }
};

export const seasonXp = {
  participation: 25,
  win: 50,
  draw: 20,
  completion: 100,
  promotion: 250,
  title: 400,
  legendTitle: 800,
  perfect: 400
} as const;

export function thresholdsFor(division: RankedDivision) {
  return divisionThresholds[String(division)]!;
}

const opponentAdjustment: Record<string, number> = {
  "10": -5,
  "9": -4,
  "8": -3,
  "7": -2,
  "6": -1,
  "5": 0,
  "4": 1,
  "3": 0,
  "2": 2,
  "1": 4,
  lenda: 6
};

export function seasonOpponentAdjustment(division: RankedDivision) {
  return opponentAdjustment[String(division)] ?? 0;
}

export function seasonDifficulty(division: RankedDivision): Difficulty {
  return division === "lenda" || (typeof division === "number" && division <= 3) ? "lenda" : "classico";
}
