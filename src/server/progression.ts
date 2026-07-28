import type { CampaignSummary, PlayerProgression, RankingEntry, UserAccount } from "@/types/game";

const levelNames = [
  { min: 30, name: "Imortal" },
  { min: 20, name: "Lenda" },
  { min: 12, name: "Craque" },
  { min: 7, name: "Titular" },
  { min: 3, name: "Revelacao" },
  { min: 1, name: "Base" }
];

function uniqueCampaigns(campaigns: CampaignSummary[]) {
  return Array.from(new Map(campaigns.map((campaign) => [campaign.id, campaign])).values());
}

export function xpForCampaign(campaign: CampaignSummary) {
  const wins = campaign.matches.filter((match) => match.userGoals > match.opponentGoals).length;
  const goals = campaign.matches.reduce((sum, match) => sum + match.userGoals, 0);
  const stageBonus =
    campaign.champion ? 700 :
    campaign.stageReached.toLowerCase().includes("final") ? 420 :
    campaign.stageReached.toLowerCase().includes("semi") ? 280 :
    campaign.stageReached.toLowerCase().includes("quartas") ? 180 :
    campaign.stageReached.toLowerCase().includes("oitavas") ? 100 : 40;
  const difficulty = campaign.config.difficulty === "lenda" ? 1.25 : campaign.config.difficulty === "casual" ? 0.85 : 1;
  return Math.round((50 + campaign.matches.length * 20 + wins * 55 + goals * 6 + stageBonus) * difficulty);
}

export function xpRequiredForLevel(level: number) {
  return Math.max(0, (level - 1) * level * 175);
}

export function levelForXp(xp: number) {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) level += 1;
  return level;
}

export function buildProgression(username: string, campaigns: CampaignSummary[]): PlayerProgression {
  const ownCampaigns = uniqueCampaigns(campaigns).filter((campaign) => campaign.config.userName.toLowerCase() === username.toLowerCase());
  const matches = ownCampaigns.flatMap((campaign) => campaign.matches);
  const wins = matches.filter((match) => match.userGoals > match.opponentGoals).length;
  const trophies = ownCampaigns.filter((campaign) => campaign.champion).length;
  const goalsFor = matches.reduce((sum, match) => sum + match.userGoals, 0);
  const xp = ownCampaigns.reduce((sum, campaign) => sum + xpForCampaign(campaign), 0);
  const level = levelForXp(xp);
  const levelName = levelNames.find((tier) => level >= tier.min)?.name ?? "Base";
  const competitiveRating = Math.max(800, Math.round(1000 + wins * 14 + trophies * 125 + ownCampaigns.length * 4 - (matches.length - wins) * 3));
  return {
    xp,
    level,
    levelName,
    nextLevelXp: xpRequiredForLevel(level + 1),
    trophies,
    campaigns: ownCampaigns.length,
    matches: matches.length,
    wins,
    goalsFor,
    winRate: matches.length ? Math.round((wins / matches.length) * 100) : 0,
    competitiveRating
  };
}

export function buildRankings(users: UserAccount[], campaigns: CampaignSummary[]): RankingEntry[] {
  return users
    .filter((user) => user.role === "player")
    .map((user) => ({
      username: maskUsername(user.username),
      playerName: user.playerName?.trim() || user.username,
      teamName: user.teamName?.trim() || `${user.username} FC`,
      emblemId: user.emblemId,
      progression: buildProgression(user.username, campaigns)
    }))
    .sort((a, b) =>
      b.progression.competitiveRating - a.progression.competitiveRating ||
      b.progression.trophies - a.progression.trophies ||
      b.progression.xp - a.progression.xp
    );
}

export function maskUsername(username: string) {
  const clean = username.trim();
  if (clean.length <= 3) return `${clean}***`;
  return `${clean.slice(0, 3)}${"*".repeat(Math.max(3, clean.length - 3))}`;
}
