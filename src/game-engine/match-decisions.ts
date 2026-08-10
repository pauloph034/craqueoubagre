export type MatchDecisionType = "tempo" | "posture" | "formation";

export type MatchDecisionMoment = {
  minute: number;
  type: MatchDecisionType;
};

export type MatchDecisionOutcome = {
  detail: string;
  tone: "positive" | "neutral" | "negative";
  momentum: number;
  impact: {
    attack: number;
    possession: number;
    defense: number;
  };
};

function stableNumber(value: string) {
  return value.split("").reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) % 104729, 19);
}

export function matchDecisionMoments(seed: string, userGoals: number, opponentGoals: number, knockout = false): MatchDecisionMoment[] {
  const roll = stableNumber(seed) % 100;
  const count = knockout
    ? roll < 35 ? 0 : roll < 88 ? 1 : 2
    : roll < 52 ? 0 : roll < 92 ? 1 : 2;
  if (!count) return [];
  const scoreDifference = userGoals - opponentGoals;
  const candidates: MatchDecisionMoment[] = [
    { minute: 30, type: "tempo" },
    { minute: 45, type: "posture" },
    ...(Math.abs(scoreDifference) <= 1 || knockout ? [{ minute: 70, type: "formation" as const }] : [])
  ];
  const start = stableNumber(`${seed}-moment`) % candidates.length;
  return Array.from({ length: Math.min(count, candidates.length) }, (_, index) => candidates[(start + index) % candidates.length]!)
    .sort((a, b) => a.minute - b.minute);
}

export function recommendedMatchDecision(type: MatchDecisionType, userGoals: number, opponentGoals: number, formation: string) {
  if (type === "tempo") return userGoals < opponentGoals ? "pressionar" : "controlar";
  if (type === "posture") return userGoals > opponentGoals ? "recuar" : "buscar";
  if (userGoals < opponentGoals) return formation === "4-2-3-1" ? "3-5-2" : "4-2-3-1";
  return formation;
}

export function resolveMatchDecision({
  seed,
  type,
  value,
  userGoals,
  opponentGoals,
  formation
}: {
  seed: string;
  type: MatchDecisionType;
  value: string;
  userGoals: number;
  opponentGoals: number;
  formation: string;
}): MatchDecisionOutcome {
  const recommended = recommendedMatchDecision(type, userGoals, opponentGoals, formation) === value;
  const success = stableNumber(`${seed}-${type}-${value}`) % 100 < (recommended ? 78 : 48);
  if (type === "tempo" && value === "pressionar") {
    return success
      ? { detail: "Ataque +10% | Posse +4% | Pressao gerou duas recuperacoes no campo ofensivo.", tone: "positive", momentum: 2, impact: { attack: 10, possession: 4, defense: -3 } }
      : { detail: "Ataque +3% | Defesa -8% | O rival encontrou o contra-ataque.", tone: "negative", momentum: -1, impact: { attack: 3, possession: -2, defense: -8 } };
  }
  if (type === "tempo") {
    return success
      ? { detail: "Posse +12% | Defesa +4% | O time reduziu os espacos.", tone: "positive", momentum: 1, impact: { attack: -2, possession: 12, defense: 4 } }
      : { detail: "Posse +4% | Ataque -7% | A circulacao ficou esteril.", tone: "negative", momentum: -1, impact: { attack: -7, possession: 4, defense: 0 } };
  }
  if (type === "posture" && value === "recuar") {
    return success
      ? { detail: "Defesa +12% | Ataque -5% | O bloco baixo protegeu uma chance clara.", tone: "positive", momentum: 1, impact: { attack: -5, possession: -5, defense: 12 } }
      : { detail: "Defesa -6% | Posse -8% | O time recuou demais.", tone: "negative", momentum: -2, impact: { attack: -4, possession: -8, defense: -6 } };
  }
  if (type === "posture") {
    return success
      ? { detail: "Ataque +12% | Posse +3% | A postura agressiva criou uma chance clara.", tone: "positive", momentum: 2, impact: { attack: 12, possession: 3, defense: -4 } }
      : { detail: "Ataque +4% | Defesa -9% | A subida abriu espaco nas costas.", tone: "negative", momentum: -1, impact: { attack: 4, possession: 0, defense: -9 } };
  }
  return success
    ? { detail: `Ataque +8% | Defesa +3% | O ${value} criou superioridade na reta final.`, tone: "positive", momentum: 2, impact: { attack: 8, possession: 3, defense: 3 } }
    : { detail: `Posse -5% | Defesa -4% | A equipe demorou a se ajustar ao ${value}.`, tone: "negative", momentum: -1, impact: { attack: -2, possession: -5, defense: -4 } };
}
