import { listCampaignSummaries, listPublicUsers, listRankedRewards, listRankedSeasons, saveRankedReward } from "@/server/db";
import { buildProgression, buildRankings } from "@/server/progression";
import { getCurrentUser } from "@/server/session";
import type { RankedReward } from "@/types/seasons";
import { NextResponse } from "next/server";

export async function GET() {
  const [users, campaigns, currentUser, rankedSeasons, initialRewards] = await Promise.all([
    listPublicUsers(),
    listCampaignSummaries(),
    getCurrentUser(),
    listRankedSeasons(),
    listRankedRewards()
  ]);
  const rankedRewards = await ensureOnlineTrophyForSoCanela(users, initialRewards);
  const rankings = buildRankings(users, campaigns, rankedSeasons, rankedRewards);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklyCampaigns = campaigns.filter((campaign) => campaign.id.startsWith("online-") && Date.parse(campaign.date) >= weekStart.getTime());
  const weeklyRankings = buildRankings(users, weeklyCampaigns).filter((entry) => entry.progression.campaigns > 0);
  const progression = currentUser ? buildProgression(currentUser.username, campaigns, rankedSeasons, rankedRewards) : undefined;
  return NextResponse.json({ rankings, weeklyRankings, progression });
}

const soCanelaOnlineTrophyId = "admin-trophy-grant-online-so-canela-fc";

async function ensureOnlineTrophyForSoCanela(
  users: Awaited<ReturnType<typeof listPublicUsers>>,
  rewards: Awaited<ReturnType<typeof listRankedRewards>>
) {
  if (rewards.some((reward) => reward.id === soCanelaOnlineTrophyId)) return rewards;
  const user = users.find((item) => normalizeTeamName(item.teamName) === "so canela fc");
  if (!user) return rewards;

  const reward: RankedReward = {
    id: soCanelaOnlineTrophyId,
    username: user.username,
    rewardId: soCanelaOnlineTrophyId,
    division: 10,
    seasonNumber: 0,
    unlockedAt: new Date().toISOString()
  };
  await saveRankedReward(reward);
  return [reward, ...rewards];
}

function normalizeTeamName(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
