export type MatchDecisionType = "tempo" | "posture" | "formation";

export type MatchDecisionMoment = {
  minute: number;
  type: MatchDecisionType;
};

export type MatchDecisionOutcome = {
  detail: string;
  tone: "positive" | "neutral" | "negative";
  momentum: number;
};

function stableNumber(value: string) {
  return value.split("").reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) % 104729, 19);
}

export function matchDecisionMoments(seed: string, userGoals: number, opponentGoals: number, knockout = false): MatchDecisionMoment[] {
  const roll = stableNumber(seed) % 100;
  const count = roll < 18 ? 0 : roll < 76 ? 1 : 2;
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
      ? { detail: "Pressao encaixou: duas recuperacoes no campo ofensivo.", tone: "positive", momentum: 2 }
      : { detail: "Pressao quebrada: o rival encontrou um contra-ataque.", tone: "negative", momentum: -1 };
  }
  if (type === "tempo") {
    return success
      ? { detail: "Controle funcionou: mais posse e menos espaco cedido.", tone: "positive", momentum: 1 }
      : { detail: "A posse ficou esteril e o rival cresceu no jogo.", tone: "negative", momentum: -1 };
  }
  if (type === "posture" && value === "recuar") {
    return success
      ? { detail: "Bloco baixo protegeu uma chance clara do rival.", tone: "positive", momentum: 1 }
      : { detail: "O time recuou demais e passou a sofrer pressao.", tone: "negative", momentum: -2 };
  }
  if (type === "posture") {
    return success
      ? { detail: "Postura agressiva criou uma chance clara.", tone: "positive", momentum: 2 }
      : { detail: "A subida abriu espaco para um contra-ataque.", tone: "negative", momentum: -1 };
  }
  return success
    ? { detail: `O ${value} criou superioridade na reta final.`, tone: "positive", momentum: 2 }
    : { detail: `A equipe demorou a se ajustar ao ${value}.`, tone: "negative", momentum: -1 };
}
