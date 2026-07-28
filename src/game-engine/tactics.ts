import type { TacticalStyle } from "@/types/game";

const matchup: Record<TacticalStyle, Record<TacticalStyle, number>> = {
  ofensivo: { ofensivo: 0, equilibrado: 1, defensivo: -1.5, pressao: -2.25 },
  equilibrado: { ofensivo: -1, equilibrado: 0, defensivo: 0.75, pressao: 1 },
  defensivo: { ofensivo: 1.5, equilibrado: -0.75, defensivo: 0, pressao: 2 },
  pressao: { ofensivo: 2.25, equilibrado: -1, defensivo: -2, pressao: 0 }
};

const styleLabels: Record<TacticalStyle, string> = {
  ofensivo: "Ofensivo",
  equilibrado: "Equilibrado",
  defensivo: "Defensivo",
  pressao: "Pressao alta"
};

export function tacticalMatchup(userStyle: TacticalStyle, opponentStyle: TacticalStyle) {
  const adjustment = matchup[userStyle][opponentStyle];
  const summary =
    adjustment >= 1.5
      ? `${styleLabels[userStyle]} encontrou uma vantagem clara contra ${styleLabels[opponentStyle]}.`
      : adjustment <= -1.5
        ? `${styleLabels[opponentStyle]} neutralizou o plano ${styleLabels[userStyle]}.`
        : "Os planos taticos ficaram equilibrados.";
  return { adjustment, summary };
}

export function inferredOpponentStyle(id: string): TacticalStyle {
  const defensive = ["atletico", "chelsea", "inter", "juventus", "nottingham", "steaua", "valencia"];
  const pressing = ["liverpool", "dortmund", "bayern", "city", "ajax"];
  const offensive = ["barcelona", "real", "psg", "milan", "arsenal", "benfica"];
  const key = id.toLowerCase();
  if (defensive.some((term) => key.includes(term))) return "defensivo";
  if (pressing.some((term) => key.includes(term))) return "pressao";
  if (offensive.some((term) => key.includes(term))) return "ofensivo";
  return "equilibrado";
}
