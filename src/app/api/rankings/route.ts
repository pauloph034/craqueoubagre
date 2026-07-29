import { listCampaignSummaries, listPublicUsers, listRankedRewards, listRankedSeasons } from "@/server/db";
import { buildProgression, buildRankings } from "@/server/progression";
import { getCurrentUser } from "@/server/session";
import { NextResponse } from "next/server";

export async function GET() {
  const [users, campaigns, currentUser, rankedSeasons, rankedRewards] = await Promise.all([
    listPublicUsers(),
    listCampaignSummaries(),
    getCurrentUser(),
    listRankedSeasons(),
    listRankedRewards()
  ]);
  const rankings = buildRankings(users, campaigns, rankedSeasons, rankedRewards);
  const progression = currentUser ? buildProgression(currentUser.username, campaigns, rankedSeasons, rankedRewards) : undefined;
  return NextResponse.json({ rankings, progression });
}
