import { difficultyRules, scoringRules } from "@/config/game-balance";
import type { CampaignConfig, CampaignSummary, DraftPick, MatchResult } from "@/types/game";
import { calculateTeamRating } from "./team-rating";

export function calculateScore(args: {
  config: CampaignConfig;
  matches: MatchResult[];
  champion: boolean;
  rerollsUsed: number;
  swapsUsed: number;
  undoUsed: boolean;
}) {
  let score = 0;
  const wins = args.matches.filter((match) => match.userGoals > match.opponentGoals).length;
  const draws = args.matches.filter((match) => match.userGoals === match.opponentGoals).length;
  const goalsFor = args.matches.reduce((sum, match) => sum + match.userGoals, 0);
  const cleanSheets = args.matches.filter((match) => match.opponentGoals === 0).length;
  score += wins * scoringRules.win + draws * scoringRules.draw + goalsFor * scoringRules.goalFor + cleanSheets * scoringRules.cleanSheet;
  if (args.matches.length >= 3) score += scoringRules.leagueAdvance;
  if (args.matches.some((match) => match.phase === "Oitavas de final" && match.userGoals > match.opponentGoals)) score += scoringRules.round16;
  if (args.matches.some((match) => match.phase === "Quartas de final" && match.userGoals > match.opponentGoals)) score += scoringRules.quarter;
  if (args.matches.some((match) => match.phase === "Semifinal" && match.userGoals > match.opponentGoals)) score += scoringRules.semifinal;
  if (args.champion) score += scoringRules.title;
  if (args.matches.every((match) => match.userGoals >= match.opponentGoals)) score += scoringRules.unbeaten;
  if (wins === 7) score += scoringRules.sevenWins;
  if (args.champion && wins === 7 && args.matches.every((match) => match.opponentGoals === 0)) score += scoringRules.perfect;
  score -= args.rerollsUsed * scoringRules.rerollPenalty + args.swapsUsed * scoringRules.swapPenalty + (args.undoUsed ? scoringRules.undoPenalty : 0);
  return Math.max(0, Math.round(score * difficultyRules[args.config.difficulty].scoreMultiplier));
}

export function unlockedAchievements(summary: Omit<CampaignSummary, "achievements"> & { squad: DraftPick[] }) {
  const wins = summary.matches.filter((match) => match.userGoals > match.opponentGoals).length;
  const goalsFor = summary.matches.reduce((sum, match) => sum + match.userGoals, 0);
  const goalsAgainst = summary.matches.reduce((sum, match) => sum + match.opponentGoals, 0);
  const ids: string[] = [];
  if (summary.champion) ids.push("primeiro-titulo");
  if (summary.champion && summary.matches.every((match) => match.userGoals >= match.opponentGoals)) ids.push("campeao-invicto");
  if (wins === 7) ids.push("sete-vitorias");
  if (goalsAgainst <= 2) ids.push("defesa-de-ferro");
  if (goalsFor >= 20) ids.push("ataque-historico");
  if (summary.champion && calculateTeamRating(summary.squad) < 82) ids.push("zebra-europeia");
  if (summary.champion && summary.squad.every((pick) => !pick.player.isLegend)) ids.push("sem-lendas");
  if (summary.champion && Math.max(...Object.values(countBy(summary.squad.map((pick) => pick.clubSeason.clubId)))) >= 5) ids.push("clube-fiel");
  if (summary.champion && new Set(summary.squad.map((pick) => pick.player.nationality)).size >= 10) ids.push("torre-de-babel");
  if (summary.champion && summary.config.difficulty === "lenda") ids.push("modo-lenda");
  if (summary.champion && summary.rerollsUsed === 0 && summary.swapsUsed === 0) ids.push("sem-mudancas");
  if (summary.matches.filter((match) => match.resolvedByPenalties && match.userGoals > match.opponentGoals).length >= 2) ids.push("rei-dos-penaltis");
  if (summary.champion && wins === 7 && goalsAgainst === 0) ids.push("campanha-perfeita");
  if (summary.champion && finalGoalAfterMinute(summary.matches, 80)) ids.push("final-dramatica");
  if (topUserScorerGoals(summary.matches) >= 8) ids.push("artilheiro-lendario");
  if (summary.champion && goalsFor >= 25) ids.push("rolo-compressor");
  return ids;
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function finalGoalAfterMinute(matches: MatchResult[], minute: number) {
  const finalMatch = matches.find((match) => match.phase === "Final" && match.userGoals > match.opponentGoals);
  if (!finalMatch) return false;
  return finalMatch.events.some((event) => event.type === "goal" && event.team === "user" && event.minute >= minute);
}

function topUserScorerGoals(matches: MatchResult[]) {
  const scorers = matches.flatMap((match) =>
    match.events.filter((event) => event.type === "goal" && event.team === "user" && event.playerName).map((event) => event.playerName!)
  );
  return Math.max(0, ...Object.values(countBy(scorers)));
}
