export type Rarity = "comum" | "rara" | "epica" | "lendaria";
export type Difficulty = "casual" | "classico" | "lenda";
export type TacticalStyle = "ofensivo" | "equilibrado" | "defensivo" | "pressao";
export type GamePhase = "setup" | "drafting" | "squadComplete" | "coachSelection" | "campaignReady" | "simulating" | "campaignFinished";
export type Position =
  | "GK"
  | "RB"
  | "CB"
  | "LB"
  | "RWB"
  | "LWB"
  | "DM"
  | "CM"
  | "MEI"
  | "RM"
  | "LM"
  | "RW"
  | "LW"
  | "CF"
  | "ST";

export type DataConfidence = "verified" | "estimated" | "demo";

export type Player = {
  id: string;
  canonicalPlayerId: string;
  name: string;
  shortName: string;
  nationality: string;
  birthYear?: number;
  preferredFoot?: "D" | "E" | "Ambos";
  primaryPosition: Position;
  secondaryPositions: Position[];
  shirtNumber?: number;
  overall: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  goalkeeping?: number;
  rarity: Rarity;
  description: string;
  clubSeasonId: string;
  isLegend: boolean;
  isActive: boolean;
  dataConfidence: DataConfidence;
  sources?: string[];
};

export type ClubSeason = {
  id: string;
  clubId: string;
  apiId?: number;
  clubName: string;
  shortName: string;
  country: string;
  season: string;
  primaryColor: string;
  secondaryColor: string;
  genericBadgeShape: "shield" | "round" | "diamond" | "crest";
  logo?: string;
  logoSource?: "api" | "cache" | "local";
  competitionStage: string;
  wasChampion: boolean;
  rarity: Rarity;
  description: string;
  players: string[];
  isActive: boolean;
  dataConfidence: DataConfidence;
};

export type FormationSlot = {
  id: string;
  label: string;
  position: Position;
  x: number;
  y: number;
};

export type DraftPick = {
  slotId: string;
  slotPosition: Position;
  player: Player;
  clubSeason: ClubSeason;
  effectiveRating: number;
  fitType: PositionFit["type"];
};

export type PositionFit = {
  type: "primary" | "secondary" | "adapted" | "incompatible";
  effectiveRating: number;
  penalty: number;
  reason: string;
  allowed: boolean;
};

export type CampaignConfig = {
  seed: string;
  userName: string;
  teamName: string;
  formation: string;
  tacticalStyle: TacticalStyle;
  difficulty: Difficulty;
};

export type Coach = {
  id: string;
  name: string;
  clubSeasonId: string;
  clubName: string;
  season: string;
  style: TacticalStyle;
  rating: number;
  description: string;
};

export type MatchEvent = {
  minute: number;
  type: "goal" | "yellow" | "red" | "substitution" | "save" | "woodwork" | "miss" | "extra_time" | "penalty_scored" | "penalty_missed";
  team: "user" | "opponent";
  text: string;
  playerName?: string;
};

export type MatchResult = {
  id: string;
  phase: string;
  opponentName: string;
  opponentBadge: string;
  opponentApiId?: number;
  opponentLogo?: string;
  userGoals: number;
  opponentGoals: number;
  resolvedByPenalties?: boolean;
  penaltyScore?: string;
  events: MatchEvent[];
  stats: {
    possession: number;
    shots: number;
    shotsOnTarget: number;
    corners: number;
    opponentPossession: number;
    opponentShots: number;
    opponentShotsOnTarget: number;
    opponentCorners: number;
  };
  bestPlayer: string;
};

export type BracketMatch = {
  id: string;
  phase: string;
  homeName: string;
  homeApiId?: number;
  homeLogo?: string;
  awayName: string;
  awayApiId?: number;
  awayLogo?: string;
  homeGoals: number;
  awayGoals: number;
  winnerName: string;
};

export type GroupStandingRow = {
  name: string;
  pts: number;
  gf: number;
  ga: number;
  qualified: boolean;
};

export type GroupStanding = {
  groupName: string;
  rows: GroupStandingRow[];
};

export type CampaignSummary = {
  id: string;
  date: string;
  config: CampaignConfig;
  squad: DraftPick[];
  coach?: Coach;
  matches: MatchResult[];
  stageReached: string;
  champion: boolean;
  tournamentChampion?: string;
  tournamentBracket?: BracketMatch[];
  score: number;
  achievements: string[];
  rerollsUsed: number;
  swapsUsed: number;
  undoUsed: boolean;
};

export type UserAccount = {
  username: string;
  playerName?: string;
  teamName?: string;
  password: string;
  role: "admin" | "player";
  createdAt: string;
};

export type SiteMetrics = {
  visits: number;
  firstVisitAt?: string;
  lastVisitAt?: string;
};

