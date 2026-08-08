import { countRewardTrophies } from "@/lib/trophies";
import { getStoredUser, listCampaignSummaries, listPublicUsers, listRankedRewards, saveRankedReward } from "@/server/db";
import { requireAdmin } from "@/server/session";
import { cleanUsername } from "@/server/validation";
import type { RankedReward } from "@/types/seasons";
import { NextResponse } from "next/server";

async function trophyCounts() {
  const [users, campaigns, rewards] = await Promise.all([listPublicUsers(), listCampaignSummaries(), listRankedRewards()]);
  return Object.fromEntries(
    users.map((user) => {
      const campaignTrophies = campaigns.filter(
        (campaign) => campaign.champion && campaign.config.userName.toLowerCase() === user.username.toLowerCase()
      ).length;
      return [user.username, Math.max(0, campaignTrophies + countRewardTrophies(rewards, user.username))];
    })
  );
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  return NextResponse.json({ trophies: await trophyCounts() });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { action?: "add" | "remove"; username?: string };
  const username = cleanUsername(body.username);
  const user = username ? await getStoredUser(username) : undefined;
  if (!user) return NextResponse.json({ error: "Usuario nao encontrado." }, { status: 404 });
  if (body.action !== "add" && body.action !== "remove") return NextResponse.json({ error: "Acao invalida." }, { status: 400 });

  const current = await trophyCounts();
  if (body.action === "remove" && (current[user.username] ?? 0) <= 0) {
    return NextResponse.json({ error: "O jogador nao possui tacas para retirar." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const reward: RankedReward = {
    id: `admin-${body.action}-${user.username}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username: user.username,
    rewardId: `admin-trophy-${body.action === "add" ? "grant" : "remove"}-${Date.now()}`,
    division: "lenda",
    seasonNumber: 0,
    unlockedAt: now
  };
  await saveRankedReward(reward);
  return NextResponse.json({ trophies: await trophyCounts() });
}
