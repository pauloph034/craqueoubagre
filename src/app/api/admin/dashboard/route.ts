import { clubSeasons, players } from "@/data/loaders";
import {
  getMetrics,
  listCampaignSummaries,
  listPublicUsers,
  listRankedMatches,
  listRankedRewards,
  listRankedSeasons
} from "@/server/db";
import { requireAdmin } from "@/server/session";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const [metrics, users, campaigns, rankedSeasons, rankedMatches, rankedRewards] = await Promise.all([
    getMetrics(),
    listPublicUsers(),
    listCampaignSummaries(),
    listRankedSeasons(),
    listRankedMatches(),
    listRankedRewards()
  ]);
  const soloMatches = campaigns.reduce((sum, campaign) => sum + campaign.matches.length, 0);
  const matches = soloMatches + rankedMatches.length;
  const rankedTrophies = rankedRewards.filter((reward) => reward.rewardId.startsWith("season-trophy")).length;
  return NextResponse.json({
    metrics: {
      visits: metrics.visits,
      users: users.length,
      campaigns: campaigns.length + rankedSeasons.length,
      matches,
      estimatedHours: matches * 5 / 60,
      trophies: campaigns.filter((campaign) => campaign.champion).length + rankedTrophies,
      players: players.length,
      teams: clubSeasons.filter((season) => season.isActive).length
    }
  });
}
