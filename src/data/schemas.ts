import { z } from "zod";

export const raritySchema = z.enum(["comum", "rara", "epica", "lendaria"]);
export const confidenceSchema = z.enum(["verified", "estimated", "demo"]);
export const positionSchema = z.enum(["GK", "RB", "CB", "LB", "RWB", "LWB", "DM", "CM", "MEI", "RM", "LM", "RW", "LW", "CF", "ST"]);

export const playerSchema = z.object({
  id: z.string().min(2),
  canonicalPlayerId: z.string().min(2),
  name: z.string().min(2),
  shortName: z.string().min(2),
  nationality: z.string().min(2),
  birthYear: z.number().int().min(1900).max(2010).optional(),
  preferredFoot: z.enum(["D", "E", "Ambos"]).optional(),
  primaryPosition: positionSchema,
  secondaryPositions: z.array(positionSchema),
  shirtNumber: z.number().int().min(1).max(99).optional(),
  overall: z.number().int().min(60).max(99),
  pace: z.number().int().min(30).max(99),
  shooting: z.number().int().min(20).max(99),
  passing: z.number().int().min(20).max(99),
  dribbling: z.number().int().min(20).max(99),
  defending: z.number().int().min(10).max(99),
  physical: z.number().int().min(30).max(99),
  goalkeeping: z.number().int().min(20).max(99).optional(),
  rarity: raritySchema,
  description: z.string().min(8),
  clubSeasonId: z.string().min(2),
  isLegend: z.boolean(),
  isActive: z.boolean(),
  dataConfidence: confidenceSchema,
  sources: z.array(z.string()).optional()
});

export const clubSeasonSchema = z.object({
  id: z.string().min(2),
  clubId: z.string().min(2),
  apiId: z.number().int().positive().optional(),
  clubName: z.string().min(2),
  shortName: z.string().min(2),
  country: z.string().min(2),
  season: z.string().regex(/^\d{4}\/\d{2}$/),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  genericBadgeShape: z.enum(["shield", "round", "diamond", "crest"]),
  badgeUrl: z.string().min(2).optional(),
  logo: z.string().min(2).optional(),
  logoSource: z.enum(["api", "cache", "local"]).optional(),
  competitionStage: z.string().min(2),
  wasChampion: z.boolean(),
  rarity: raritySchema,
  description: z.string().min(8),
  players: z.array(z.string()),
  isActive: z.boolean(),
  dataConfidence: confidenceSchema
});

export const opponentSchema = z.object({
  id: z.string(),
  name: z.string(),
  country: z.string(),
  strength: z.number().min(60).max(96),
  primaryColor: z.string(),
  secondaryColor: z.string()
});

export const achievementSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tier: z.enum(["bronze", "silver", "gold", "special"])
});

export const dataSetSchema = z.object({
  clubSeasons: z.array(clubSeasonSchema),
  players: z.array(playerSchema),
  opponents: z.array(opponentSchema),
  achievements: z.array(achievementSchema)
});

