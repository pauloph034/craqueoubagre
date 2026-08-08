import type { RankedReward } from "@/types/seasons";

export function trophyRewardDelta(reward: RankedReward) {
  if (reward.rewardId.startsWith("admin-trophy-remove")) return -1;
  if (reward.rewardId.startsWith("season-trophy") || reward.rewardId.startsWith("admin-trophy-grant")) return 1;
  return 0;
}

export function countRewardTrophies(rewards: RankedReward[], username?: string) {
  const normalized = username?.toLowerCase();
  return rewards.reduce(
    (total, reward) => total + (!normalized || reward.username.toLowerCase() === normalized ? trophyRewardDelta(reward) : 0),
    0
  );
}

export function isVisibleTrophyReward(reward: RankedReward) {
  return trophyRewardDelta(reward) > 0;
}
