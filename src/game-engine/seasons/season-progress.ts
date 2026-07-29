import { SEASON_MATCH_LIMIT, thresholdsFor } from "@/config/seasons-balance";
import type { RankedDivision, RankedSeasonOutcome } from "@/types/seasons";

export function pointsForResult(result: "win" | "draw" | "loss") {
  return result === "win" ? 3 : result === "draw" ? 1 : 0;
}

export function seasonOutcome(division: RankedDivision, points: number): RankedSeasonOutcome {
  const rules = thresholdsFor(division);
  if (division === "lenda" && points === 24) return "legend-perfect";
  if (division === "lenda" && points >= rules.titleMin) return "champion";
  if (division === 1 && points >= rules.titleMin) return "champion";
  if (division !== 1 && division !== "lenda" && points >= rules.titleMin) return "promoted";
  if (rules.promotionMin !== undefined && points >= rules.promotionMin) return "promoted";
  if (rules.relegationMax !== undefined && points <= rules.relegationMax) return "relegated";
  return "held";
}

export function nextDivision(division: RankedDivision, outcome: RankedSeasonOutcome): RankedDivision {
  if (outcome === "legend-perfect" || (division === "lenda" && outcome === "champion")) return "lenda";
  if (outcome === "relegated") {
    if (division === "lenda") return 1;
    return Math.min(10, Number(division) + 1) as RankedDivision;
  }
  if (outcome === "promoted" || outcome === "champion") {
    if (division === 1) return "lenda";
    if (division === 10) return 9;
    return Math.max(1, Number(division) - 1) as RankedDivision;
  }
  return division;
}

export function isSeasonComplete(matchesPlayed: number) {
  return matchesPlayed >= SEASON_MATCH_LIMIT;
}

export function goalMessage(division: RankedDivision, points: number, matchesPlayed: number) {
  const rules = thresholdsFor(division);
  const possible = points + Math.max(0, SEASON_MATCH_LIMIT - matchesPlayed) * 3;
  const promotionTarget = rules.promotionMin;
  if (division === 1 && points >= rules.titleMin) return "Título garantido. Vaga na Divisão Elite conquistada.";
  if (division === "lenda" && points >= rules.titleMin) return "Título da Divisão Elite garantido.";
  if (promotionTarget !== undefined && points >= promotionTarget) return "Qualificado para a próxima Divisão.";
  if (possible < rules.titleMin && rules.promotionMin !== undefined && possible < rules.promotionMin) {
    return rules.relegationMax !== undefined && points <= rules.relegationMax ? "Cada ponto agora vale a permanência." : "Permanência encaminhada.";
  }
  const target = promotionTarget ?? rules.titleMin;
  return `Faltam ${Math.max(0, target - points)} ponto(s) para ${promotionTarget ? "a próxima Divisão" : "o título"}.`;
}
