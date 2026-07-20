import { campaignOpponents } from "@/game-engine/opponent-generator";
import { createRng } from "@/game-engine/rng";
import { simulateMatch } from "@/game-engine/match-engine";
import type { CampaignConfig, DraftPick } from "@/types/game";

export function simulateCampaign(seed: string, config: CampaignConfig, squad: DraftPick[]) {
  const rng = createRng(`${seed}-campaign`);
  const calendar = campaignOpponents(rng);
  const matches = [];
  for (const item of calendar) {
    const result = simulateMatch({
      rng,
      squad,
      tacticalStyle: config.tacticalStyle,
      difficulty: config.difficulty,
      opponent: item.opponent,
      phase: item.phase,
      knockout: item.knockout
    });
    matches.push(result);
    if (item.knockout && result.userGoals < result.opponentGoals) break;
  }
  const last = matches.at(-1);
  const champion = matches.length === 7 && last ? last.userGoals > last.opponentGoals : false;
  return { matches, champion, stageReached: champion ? "Campeao" : last?.phase ?? "Fase inicial" };
}
