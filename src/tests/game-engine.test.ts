import { describe, expect, it } from "vitest";
import { difficultyRules } from "@/config/game-balance";
import { formations } from "@/config/formations";
import { clubSeasons, players } from "@/data/loaders";
import { simulateCampaign } from "@/game-engine/campaign-engine";
import { calculateChemistry } from "@/game-engine/chemistry";
import { drawClubSeason } from "@/game-engine/draft-engine";
import { simulateMatch } from "@/game-engine/match-engine";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { createRng } from "@/game-engine/rng";
import { calculateScore } from "@/game-engine/scoring-engine";
import { calculateTeamRating } from "@/game-engine/team-rating";
import type { DraftPick } from "@/types/game";

function sampleSquad(): DraftPick[] {
  const season = clubSeasons[0]!;
  const used = new Set<string>();
  return formations["4-3-3"].map((slot) => {
    const player = players.find((item) => item.clubSeasonId === season.id && calculatePositionFit(item, slot.position).allowed && !used.has(item.canonicalPlayerId)) ?? players.find((item) => item.clubSeasonId === season.id)!;
    used.add(player.canonicalPlayerId);
    const fit = calculatePositionFit(player, slot.position);
    return { slotId: slot.id, slotPosition: slot.position, player, clubSeason: season, effectiveRating: fit.effectiveRating, fitType: fit.type };
  });
}

describe("sorteio", () => {
  it("produz o mesmo resultado com a mesma seed", () => {
    const context = { difficulty: "classico" as const, selectedCanonicalIds: [], appearanceCounts: {}, recentClubSeasonIds: [] };
    const a = drawClubSeason(createRng("abc"), clubSeasons, players, "ST", context);
    const b = drawClubSeason(createRng("abc"), clubSeasons, players, "ST", context);
    expect(a.id).toBe(b.id);
  });

  it("nunca retorna elenco sem jogador compativel", () => {
    const season = drawClubSeason(createRng("compat"), clubSeasons, players, "GK", { difficulty: "classico", selectedCanonicalIds: [], appearanceCounts: {}, recentClubSeasonIds: [] });
    expect(players.some((player) => player.clubSeasonId === season.id && calculatePositionFit(player, "GK").allowed)).toBe(true);
  });

  it("respeita bloqueio recente e limite de aparicao", () => {
    const blocked = clubSeasons[0]!;
    const season = drawClubSeason(createRng("blocked"), clubSeasons, players, "ST", {
      difficulty: "classico",
      selectedCanonicalIds: [],
      appearanceCounts: { [blocked.id]: 2 },
      recentClubSeasonIds: [blocked.id]
    });
    expect(season.id).not.toBe(blocked.id);
  });
});

describe("jogadores e posicoes", () => {
  it("permite posicao principal", () => {
    const player = players.find((item) => item.primaryPosition === "ST")!;
    expect(calculatePositionFit(player, "ST")).toMatchObject({ allowed: true, penalty: 0 });
  });

  it("aplica penalidade secundaria", () => {
    const player = players.find((item) => item.secondaryPositions.includes("CF"))!;
    expect(calculatePositionFit(player, "CF").penalty).toBe(2);
  });

  it("bloqueia posicao incompativel", () => {
    const gk = players.find((item) => item.primaryPosition === "GK")!;
    expect(calculatePositionFit(gk, "ST").allowed).toBe(false);
  });
});

describe("contadores", () => {
  it("inicia dificuldades com contadores corretos", () => {
    expect(difficultyRules.casual.rerolls).toBe(5);
    expect(difficultyRules.casual.swaps).toBe(3);
    expect(difficultyRules.classico.rerolls).toBe(3);
    expect(difficultyRules.classico.swaps).toBe(1);
    expect(difficultyRules.lenda.rerolls).toBe(1);
    expect(difficultyRules.lenda.swaps).toBe(0);
  });
});

describe("elenco", () => {
  it("calcula rating e entrosamento", () => {
    const squad = sampleSquad();
    expect(squad).toHaveLength(11);
    expect(calculateTeamRating(squad)).toBeGreaterThan(70);
    expect(calculateChemistry(squad)).toBeGreaterThan(50);
  });
});

describe("simulacao", () => {
  it("mesma seed produz mesma partida", () => {
    const squad = sampleSquad();
    const args = { squad, tacticalStyle: "equilibrado" as const, opponent: { id: "x", name: "Teste", strength: 82 }, phase: "Final", knockout: true };
    const a = simulateMatch({ ...args, rng: createRng("match") });
    const b = simulateMatch({ ...args, rng: createRng("match") });
    expect(a.userGoals).toBe(b.userGoals);
    expect(a.events.map((event) => event.minute)).toEqual([...a.events.map((event) => event.minute)].sort((x, y) => x - y));
    expect(a.userGoals === a.opponentGoals).toBe(false);
  });

  it("campanha encerra ate a final", () => {
    const result = simulateCampaign("campaign", { seed: "campaign", userName: "Teste", teamName: "Teste XI", formation: "4-3-3", difficulty: "classico", tacticalStyle: "equilibrado" }, sampleSquad());
    expect(result.matches.length).toBeGreaterThanOrEqual(4);
    expect(result.matches.length).toBeLessThanOrEqual(7);
  });
});

describe("pontuacao", () => {
  it("nunca fica negativa", () => {
    const score = calculateScore({ config: { seed: "s", userName: "Teste", teamName: "Teste XI", formation: "4-3-3", difficulty: "casual", tacticalStyle: "equilibrado" }, matches: [], champion: false, rerollsUsed: 99, swapsUsed: 99, undoUsed: true });
    expect(score).toBe(0);
  });
});
