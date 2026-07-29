import { describe, expect, it } from "vitest";
import { difficultyRules } from "@/config/game-balance";
import { formations } from "@/config/formations";
import { buildChemistryLinks } from "@/components/game/ChemistryLinks";
import { clubSeasons, players } from "@/data/loaders";
import { simulateCampaign } from "@/game-engine/campaign-engine";
import { calculateChemistry } from "@/game-engine/chemistry";
import { drawClubSeason } from "@/game-engine/draft-engine";
import { simulateMatch } from "@/game-engine/match-engine";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { createRng } from "@/game-engine/rng";
import { calculateScore } from "@/game-engine/scoring-engine";
import { seasonOutcome } from "@/game-engine/seasons/season-progress";
import { calculateTeamRating } from "@/game-engine/team-rating";
import type { DraftPick } from "@/types/game";

function sampleSquad(): DraftPick[] {
  for (const season of clubSeasons) {
    const used = new Set<string>();
    const squad: DraftPick[] = [];
    for (const slot of formations["4-3-3"]) {
      const player = players.find(
        (item) =>
          item.clubSeasonId === season.id &&
          calculatePositionFit(item, slot.position).allowed &&
          !used.has(item.canonicalPlayerId)
      );
      if (!player) break;
      used.add(player.canonicalPlayerId);
      const fit = calculatePositionFit(player, slot.position);
      squad.push({ slotId: slot.id, slotPosition: slot.position, player, clubSeason: season, effectiveRating: fit.effectiveRating, fitType: fit.type });
    }
    if (squad.length === 11) return squad;
  }
  throw new Error("Nenhum elenco da base cobre a formacao 4-3-3.");
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

  it("considera ATA e SA funcoes equivalentes sem penalidade", () => {
    const attacker = players.find((item) => item.primaryPosition === "ST")!;
    const secondAttacker = players.find((item) => item.primaryPosition === "CF")!;

    expect(calculatePositionFit(attacker, "CF")).toMatchObject({
      allowed: true,
      penalty: 0,
      effectiveRating: attacker.overall
    });
    expect(calculatePositionFit(secondAttacker, "ST")).toMatchObject({
      allowed: true,
      penalty: 0,
      effectiveRating: secondAttacker.overall
    });
  });

  it("aplica penalidade secundaria", () => {
    const player = players.find((item) => item.secondaryPositions.includes("CF"))!;
    expect(calculatePositionFit(player, "CF").penalty).toBe(2);
  });

  it("bloqueia posicao incompativel", () => {
    const gk = players.find((item) => item.primaryPosition === "GK")!;
    expect(calculatePositionFit(gk, "ST").allowed).toBe(false);
  });

  it("permite Maradona em MC e MEI sem perder overall", () => {
    const maradona = players.find((item) => item.canonicalPlayerId === "diego-maradona")!;
    expect(calculatePositionFit(maradona, "CM")).toMatchObject({
      allowed: true,
      penalty: 0,
      effectiveRating: maradona.overall
    });
    expect(calculatePositionFit(maradona, "MEI")).toMatchObject({
      allowed: true,
      penalty: 0,
      effectiveRating: maradona.overall
    });
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

  it("liga apenas vizinhos taticos com afinidade", () => {
    const slots = formations["4-3-3"];
    const links = buildChemistryLinks(
      slots,
      slots.map((slot) => ({
        slotId: slot.id,
        nationality: "Argentina",
        clubKey: "teste"
      }))
    );
    const pairs = links.map((link) => new Set([link.from.id, link.to.id]));
    const goalkeeperPairs = pairs.filter((pair) => pair.has("gk"));

    expect(goalkeeperPairs).toHaveLength(2);
    expect(goalkeeperPairs.every((pair) => pair.has("cb1") || pair.has("cb2"))).toBe(true);
    expect(pairs.some((pair) => pair.has("gk") && (pair.has("dm") || pair.has("cm1") || pair.has("cm2")))).toBe(false);
    expect(pairs.some((pair) => pair.has("rb") && (pair.has("dm") || pair.has("cm1") || pair.has("cm2")))).toBe(false);
  });
});

describe("temporadas ranqueadas", () => {
  it("classifica sem entregar taca antes da Divisao 1", () => {
    expect(seasonOutcome(10, 15)).toBe("promoted");
    expect(seasonOutcome(5, 18)).toBe("promoted");
    expect(seasonOutcome(1, 18)).toBe("champion");
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
