import type { ClubSeason, DraftPick, MatchResult, Player, TacticalStyle } from "./game";

export type RankedDivision = 10 | 9 | 8 | 7 | 6 | 5 | 4 | 3 | 2 | 1 | "lenda";
export type RankedSeasonStatus = "drafting" | "active" | "completed";
export type RankedSeasonOutcome = "relegated" | "held" | "promoted" | "champion" | "legend-perfect";

export type RankedSeason = {
  id: string;
  username: string;
  seasonNumber: number;
  division: RankedDivision;
  status: RankedSeasonStatus;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  matchesPlayed: number;
  swapsUsed: number;
  rerollsUsed: number;
  formation: string;
  tacticalStyle: TacticalStyle;
  squadSnapshot: DraftPick[];
  transferState?: {
    slotId: string;
    clubSeasonId: string;
    clubSeasonHistory: string[];
    createdAt: string;
  };
  requiresTransferWindow?: boolean;
  transferWindowCompletedAt?: string;
  outcome?: RankedSeasonOutcome;
  xpEarned: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type SeasonTransferOffer = {
  slotId: string;
  currentPick?: DraftPick;
  clubSeason: ClubSeason;
  players: Player[];
  swapsRemaining: number;
  rerollsRemaining: number;
};

export type RankedMatch = {
  id: string;
  idempotencyKey: string;
  rankedSeasonId: string;
  matchNumber: number;
  username: string;
  opponentUsername?: string;
  opponentType: "player" | "historical";
  opponentName: string;
  result: "win" | "draw" | "loss";
  xpGranted: number;
  match: MatchResult;
  createdAt: string;
  completedAt: string;
};

export type RankedReward = {
  id: string;
  username: string;
  rewardId: string;
  division: RankedDivision;
  seasonNumber: number;
  unlockedAt: string;
};

export type SeasonParticipant = {
  rank: number;
  username: string;
  playerName: string;
  teamName: string;
  emblemId?: string;
  country?: string;
  division: RankedDivision;
  seasonNumber: number;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  xp: number;
  trophies: number;
  elite: boolean;
  updatedAt: string;
  isCurrentUser: boolean;
};

export type DailyAllowance = {
  used: number;
  limit: number;
  remaining: number;
  dateKey: string;
  resetsAt: string;
};
