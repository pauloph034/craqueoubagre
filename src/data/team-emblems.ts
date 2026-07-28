export type TeamEmblemDefinition = {
  id: string;
  primary: string;
  secondary: string;
  accent: string;
  shape: "shield" | "round" | "diamond";
  pattern: "stripes" | "halves" | "sash" | "quarters" | "chevron";
  monogram: string;
  symbol: "star" | "crown" | "bolt" | "trophy" | "target" | "flame" | "shield" | "sparkles" | "medal" | "flag";
};

const palettes = [
  ["#1677ff", "#061b42", "#65e7ff"],
  ["#06b6d4", "#082f49", "#facc15"],
  ["#2563eb", "#172554", "#ffffff"],
  ["#0ea5e9", "#052e3f", "#34d399"],
  ["#4f46e5", "#111827", "#fbbf24"],
  ["#14b8a6", "#042f2e", "#93c5fd"],
  ["#1d4ed8", "#450a0a", "#f87171"],
  ["#0284c7", "#3f1d0b", "#fb923c"],
  ["#4338ca", "#1e1b4b", "#c4b5fd"],
  ["#0891b2", "#0f172a", "#e2e8f0"]
] as const;

const symbols: TeamEmblemDefinition["symbol"][] = ["star", "crown", "bolt", "trophy", "target", "flame", "shield", "sparkles", "medal", "flag"];
const shapes: TeamEmblemDefinition["shape"][] = ["shield", "round", "diamond"];
const patterns: TeamEmblemDefinition["pattern"][] = ["stripes", "halves", "sash", "quarters", "chevron"];
const monograms = [
  "AC", "BF", "CR", "DS", "EC", "FA", "GR", "HU", "IV", "JN",
  "KA", "LB", "MC", "ND", "OP", "PR", "QS", "RT", "SU", "VX",
  "AZ", "BC", "CF", "DR", "ES", "FT", "GA", "HL", "IR", "JV"
] as const;

export const teamEmblems: TeamEmblemDefinition[] = shapes.flatMap((shape, shapeIndex) =>
  palettes.map(([primary, secondary, accent], paletteIndex) => ({
    id: `emblem-${String(shapeIndex * 10 + paletteIndex + 1).padStart(2, "0")}`,
    primary,
    secondary,
    accent,
    shape,
    pattern: patterns[(paletteIndex + shapeIndex * 2) % patterns.length]!,
    monogram: monograms[shapeIndex * 10 + paletteIndex]!,
    symbol: symbols[(paletteIndex + shapeIndex * 3) % symbols.length]!
  }))
);

export function getTeamEmblem(id?: string) {
  return teamEmblems.find((emblem) => emblem.id === id) ?? teamEmblems[0]!;
}

export function emblemForTeamName(name: string) {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return teamEmblems[hash % teamEmblems.length]!;
}

export function isValidEmblemId(id?: string) {
  return Boolean(id && teamEmblems.some((emblem) => emblem.id === id));
}
