import { clubSeasons, players } from "@/data/loaders";
import { getMetrics, listCampaignSummaries, listPublicUsers } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { NextResponse } from "next/server";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const [metrics, users, campaigns] = await Promise.all([getMetrics(), listPublicUsers(), listCampaignSummaries()]);
  const matches = campaigns.reduce((sum, campaign) => sum + campaign.matches.length, 0);
  return NextResponse.json({
    metrics: {
      visits: metrics.visits,
      users: users.length,
      campaigns: campaigns.length,
      matches,
      estimatedHours: matches * 5 / 60,
      trophies: campaigns.filter((campaign) => campaign.champion).length,
      players: players.length,
      teams: clubSeasons.filter((season) => season.isActive).length
    }
  });
}
