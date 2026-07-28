import { listCampaignSummaries, listPublicUsers } from "@/server/db";
import { buildProgression, buildRankings } from "@/server/progression";
import { getCurrentUser } from "@/server/session";
import { NextResponse } from "next/server";

export async function GET() {
  const [users, campaigns, currentUser] = await Promise.all([
    listPublicUsers(),
    listCampaignSummaries(),
    getCurrentUser()
  ]);
  const rankings = buildRankings(users, campaigns);
  const progression = currentUser ? buildProgression(currentUser.username, campaigns) : undefined;
  return NextResponse.json({ rankings, progression });
}
