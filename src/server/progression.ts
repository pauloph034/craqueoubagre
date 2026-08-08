import type { CampaignSummary, PlayerProgression, RankingEntry, UserAccount } from "@/types/game";
import type { RankedReward, RankedSeason } from "@/types/seasons";
import { countRewardTrophies } from "@/lib/trophies";

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

export function buildProgression(
  username: string,
  campaigns: CampaignSummary[],
  rankedSeasons: RankedSeason[] = [],
  rankedRewards: RankedReward[] = []
): PlayerProgression {
  const ownCampaigns = uniqueCampaigns(campaigns).filter((campaign) => campaign.config.userName.toLowerCase() === username.toLowerCase());
  const ownRankedSeasons = Array.from(
    new Map(
      rankedSeasons
        .filter((season) => season.username.toLowerCase() === username.toLowerCase())
        .map((season) => [season.id, season])
    ).values()
  );
  const soloMatches = ownCampaigns.flatMap((campaign) => campaign.matches);
  const rankedMatches = ownRankedSeasons.reduce((sum, season) => sum + season.matchesPlayed, 0);
  const wins = soloMatches.filter((match) => match.userGoals > match.opponentGoals).length + ownRankedSeasons.reduce((sum, season) => sum + season.wins, 0);
  const trophies = Math.max(0, ownCampaigns.filter((campaign) => campaign.champion).length + countRewardTrophies(rankedRewards, username));
  const goalsFor = soloMatches.reduce((sum, match) => sum + match.userGoals, 0) + ownRankedSeasons.reduce((sum, season) => sum + season.goalsFor, 0);
  const xp = ownCampaigns.reduce((sum, campaign) => sum + xpForCampaign(campaign), 0) + ownRankedSeasons.reduce((sum, season) => sum + season.xpEarned, 0);
  const totalMatches = soloMatches.length + rankedMatches;
  const completedRankedSeasons = ownRankedSeasons.filter((season) => season.status === "completed").length;
  const level = levelForXp(xp);
  const levelName = levelNames.find((tier) => level >= tier.min)?.name ?? "Base";
  const competitiveRating = Math.max(800, Math.round(1000 + wins * 14 + trophies * 125 + (ownCampaigns.length + completedRankedSeasons) * 4 - (totalMatches - wins) * 3));
  return {
    xp,
    level,
    levelName,
    nextLevelXp: xpRequiredForLevel(level + 1),
    trophies,
    campaigns: ownCampaigns.length + completedRankedSeasons,
    matches: totalMatches,
    wins,
    goalsFor,
    winRate: totalMatches ? Math.round((wins / totalMatches) * 100) : 0,
    competitiveRating
  };
}

export function buildRankings(
  users: UserAccount[],
  campaigns: CampaignSummary[],
  rankedSeasons: RankedSeason[] = [],
  rankedRewards: RankedReward[] = []
): RankingEntry[] {
  return users
    .filter((user) => user.teamName?.trim() || user.playerName?.trim() || user.username.trim())
    .map((user) => ({
      username: maskUsername(user.username),
      playerName: user.playerName?.trim() || user.username,
      teamName: user.teamName?.trim() || `${user.username} FC`,
      emblemId: user.emblemId,
      country: user.country,
      progression: buildProgression(user.username, campaigns, rankedSeasons, rankedRewards)
    }))
    .sort((a, b) =>
      b.progression.trophies - a.progression.trophies ||
      b.progression.competitiveRating - a.progression.competitiveRating ||
      b.progression.xp - a.progression.xp
    );
}

export function maskUsername(username: string) {
  const clean = username.trim();
  if (clean.length <= 3) return `${clean}***`;
  return `${clean.slice(0, 3)}${"*".repeat(Math.max(3, clean.length - 3))}`;
}
