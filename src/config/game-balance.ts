import type { Difficulty, Rarity, TacticalStyle } from "@/types/game";

export const rarityWeights: Record<Difficulty, Record<Rarity, number>> = {
  casual: { comum: 35, rara: 32, epica: 23, lendaria: 10 },
  classico: { comum: 45, rara: 30, epica: 18, lendaria: 7 },
  lenda: { comum: 45, rara: 30, epica: 18, lendaria: 7 }
};

export const difficultyRules = {
  casual: { rerolls: 5, swaps: 3, undo: true, scoreMultiplier: 0.8, hideRatings: false },
  classico: { rerolls: 3, swaps: 1, undo: false, scoreMultiplier: 1, hideRatings: false },
  lenda: { rerolls: 1, swaps: 0, undo: false, scoreMultiplier: 1.35, hideRatings: true }
} satisfies Record<Difficulty, { rerolls: number; swaps: number; undo: boolean; scoreMultiplier: number; hideRatings: boolean }>;

export const tacticalStyles: Record<TacticalStyle, { label: string; description: string; attack: number; defense: number; tempo: number }> = {
  ofensivo: {
    label: "Ofensivo",
    description: "Mais volume e risco defensivo.",
    attack: 1.14,
    defense: 0.93,
    tempo: 1.12
  },
  equilibrado: {
    label: "Equilibrado",
    description: "Plano estavel, sem grandes extremos.",
    attack: 1,
    defense: 1,
    tempo: 1
  },
  defensivo: {
    label: "Defensivo",
    description: "Menos espacos e menor producao ofensiva.",
    attack: 0.9,
    defense: 1.15,
    tempo: 0.9
  },
  pressao: {
    label: "Pressao alta",
    description: "Recupera a bola rapido, mas cansa no fim.",
    attack: 1.1,
    defense: 0.98,
    tempo: 1.18
  }
};

export const scoringRules = {
  win: 100,
  draw: 30,
  goalFor: 10,
  cleanSheet: 30,
  leagueAdvance: 150,
  round16: 200,
  quarter: 300,
  semifinal: 450,
  title: 1000,
  unbeaten: 300,
  sevenWins: 500,
  perfect: 1500,
  rerollPenalty: 25,
  swapPenalty: 75,
  undoPenalty: 25
};
