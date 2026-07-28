import assert from "node:assert/strict";
import { difficultyRules } from "../src/config/game-balance";
import { formations } from "../src/config/formations";
import { clubSeasons, players } from "../src/data/loaders";
import { emblemForTeamName, teamEmblems } from "../src/data/team-emblems";
import { simulateCampaign } from "../src/game-engine/campaign-engine";
import { calculateChemistry } from "../src/game-engine/chemistry";
import { drawClubSeason } from "../src/game-engine/draft-engine";
import { simulateMatch } from "../src/game-engine/match-engine";
import { calculatePositionFit } from "../src/game-engine/position-fit";
import { createRng } from "../src/game-engine/rng";
import { calculateScore } from "../src/game-engine/scoring-engine";
import { calculateTeamRating } from "../src/game-engine/team-rating";
import { tacticalMatchup } from "../src/game-engine/tactics";
import { isPublicNameAllowed } from "../src/server/name-policy";
import { buildProgression, buildRankings, levelForXp, maskUsername } from "../src/server/progression";
import type { CampaignSummary, DraftPick, Player, Position } from "../src/types/game";

function sampleSquad(): DraftPick[] {
  const season = clubSeasons[0]!;
  const used = new Set<string>();
  return formations["4-3-3"].map((slot) => {
    const player = players.find((item) => item.clubSeasonId === season.id && calculatePositionFit(item, slot.position).allowed && !used.has(item.canonicalPlayerId))!;
    used.add(player.canonicalPlayerId);
    const fit = calculatePositionFit(player, slot.position);
    return { slotId: slot.id, slotPosition: slot.position, player, clubSeason: season, effectiveRating: fit.effectiveRating, fitType: fit.type };
  });
}

function samplePlayerAt(position: Position): Player {
  return {
    ...players.find((item) => item.primaryPosition !== "GK")!,
    id: `test-${position}`,
    canonicalPlayerId: `test-${position}`,
    primaryPosition: position,
    secondaryPositions: []
  };
}

function sampleGoalkeeperWithSecondary(position: Position): Player {
  const goalkeeper = players.find((item) => item.primaryPosition === "GK")!;
  return {
    ...goalkeeper,
    id: `test-gk-${position}`,
    canonicalPlayerId: `test-gk-${position}`,
    secondaryPositions: [position]
  };
}

function test(name: string, fn: () => void) {
  fn();
  console.log(`ok - ${name}`);
}

test("dataset possui volume minimo e goleiros", () => {
  assert.ok(clubSeasons.length >= 32);
  assert.ok(players.length >= 480);
  for (const season of clubSeasons) {
    assert.ok(season.players.length >= 15);
    assert.ok(players.some((player) => player.clubSeasonId === season.id && player.primaryPosition === "GK"));
  }
});

test("galeria possui 30 escudos e fallback estavel por time", () => {
  assert.equal(teamEmblems.length, 30);
  assert.equal(new Set(teamEmblems.map((emblem) => emblem.id)).size, 30);
  assert.equal(emblemForTeamName("Meu Clube").id, emblemForTeamName("Meu Clube").id);
  assert.notEqual(emblemForTeamName("Meu Clube").id, emblemForTeamName("Outro Clube").id);
});

test("sorteio com seed e elegibilidade", () => {
  const context = { difficulty: "classico" as const, selectedCanonicalIds: [], appearanceCounts: {}, recentClubSeasonIds: [] };
  const a = drawClubSeason(createRng("abc"), clubSeasons, players, "ST", context);
  const b = drawClubSeason(createRng("abc"), clubSeasons, players, "ST", context);
  assert.equal(a.id, b.id);
  assert.ok(players.some((player) => player.clubSeasonId === a.id && calculatePositionFit(player, "ST").allowed));
});

test("regras de posicao", () => {
  const st = players.find((item) => item.primaryPosition === "ST")!;
  const secondary = players.find((item) => item.secondaryPositions.includes("CF"))!;
  const gk = players.find((item) => item.primaryPosition === "GK")!;
  assert.equal(calculatePositionFit(st, "ST").penalty, 0);
  assert.equal(calculatePositionFit(secondary, "CF").penalty, 2);
  assert.equal(calculatePositionFit(gk, "ST").allowed, false);
  assert.equal(calculatePositionFit(sampleGoalkeeperWithSecondary("CB"), "CB").allowed, false);
  assert.equal(calculatePositionFit(samplePlayerAt("RW"), "RM").penalty, 0);
  assert.equal(calculatePositionFit(samplePlayerAt("RB"), "RWB").penalty, 0);
  assert.equal(calculatePositionFit(samplePlayerAt("LB"), "LWB").penalty, 0);
  assert.equal(calculatePositionFit(samplePlayerAt("RWB"), "RB").penalty, 0);
  assert.equal(calculatePositionFit(samplePlayerAt("LWB"), "LB").penalty, 0);
});

test("Messi 2010/11 aparece como atacante de direita", () => {
  const messi = players.find((item) => item.name === "Lionel Messi" && item.clubSeasonId === "barcelona-2010-11")!;
  assert.equal(messi.primaryPosition, "RW");
  assert.deepEqual(messi.secondaryPositions, ["CF", "ST", "MEI"]);
  assert.equal(messi.overall, 98);
  assert.equal(calculatePositionFit(messi, "RW").allowed, true);
  assert.equal(calculatePositionFit(messi, "ST").allowed, true);
});

test("contadores por dificuldade", () => {
  assert.equal(difficultyRules.casual.rerolls, 5);
  assert.equal(difficultyRules.casual.swaps, 3);
  assert.equal(difficultyRules.classico.rerolls, 3);
  assert.equal(difficultyRules.classico.swaps, 1);
  assert.equal(difficultyRules.lenda.rerolls, 1);
  assert.equal(difficultyRules.lenda.swaps, 0);
});

test("rating e entrosamento do elenco", () => {
  const squad = sampleSquad();
  assert.equal(squad.length, 11);
  assert.ok(calculateTeamRating(squad) > 70);
  assert.ok(calculateChemistry(squad) > 50);
});

test("simulacao deterministica e mata-mata resolvido", () => {
  const squad = sampleSquad();
  const args = { squad, tacticalStyle: "equilibrado" as const, opponent: { id: "x", name: "Teste", strength: 82 }, phase: "Final", knockout: true };
  const a = simulateMatch({ ...args, rng: createRng("match") });
  const b = simulateMatch({ ...args, rng: createRng("match") });
  assert.equal(a.userGoals, b.userGoals);
  assert.equal(a.opponentGoals, b.opponentGoals);
  assert.notEqual(a.userGoals, a.opponentGoals);
  assert.deepEqual(a.events.map((event) => event.minute), [...a.events.map((event) => event.minute)].sort((x, y) => x - y));
});

test("vantagem tecnica grande nao vira derrota absurda", () => {
  const eliteSquad = sampleSquad().map((pick) => ({
    ...pick,
    effectiveRating: 98,
    player: { ...pick.player, overall: 98, pace: 96, shooting: 96, passing: 96, dribbling: 96, defending: 96, physical: 96, goalkeeping: pick.player.primaryPosition === "GK" ? 98 : pick.player.goalkeeping }
  }));
  for (let index = 0; index < 80; index++) {
    const match = simulateMatch({
      rng: createRng(`elite-${index}`),
      squad: eliteSquad,
      tacticalStyle: "equilibrado",
      difficulty: "classico",
      opponent: { id: "fraco", name: "Time fraco", strength: 65 },
      phase: "Fase de grupos 1",
      knockout: false
    });
    assert.ok(match.userGoals > match.opponentGoals);
  }
});

test("confrontos taticos possuem vantagens reciprocas", () => {
  assert.ok(tacticalMatchup("pressao", "ofensivo").adjustment > 0);
  assert.ok(tacticalMatchup("defensivo", "pressao").adjustment > 0);
  assert.equal(tacticalMatchup("equilibrado", "equilibrado").adjustment, 0);
});

test("goleadores do adversario respeitam o elenco da temporada", () => {
  const squad = sampleSquad();
  const scorers = new Set<string>();
  for (let index = 0; index < 60; index++) {
    const match = simulateMatch({
      rng: createRng(`real-25-26-${index}`),
      squad,
      tacticalStyle: "ofensivo",
      difficulty: "lenda",
      opponent: { id: "real-madrid", name: "Real Madrid 25/26", strength: 93, clubSeasonId: "real-madrid-2025-26" },
      phase: "Fase de grupos 1",
      knockout: false
    });
    match.events
      .filter((event) => event.type === "goal" && event.team === "opponent" && event.playerName)
      .forEach((event) => scorers.add(event.playerName!));
  }
  assert.ok(scorers.size > 0);
  assert.equal(scorers.has("Benzema"), false);
});

test("campanha encerra entre eliminacao e final", () => {
  const result = simulateCampaign("campaign", { seed: "campaign", userName: "Teste", teamName: "Teste XI", formation: "4-3-3", difficulty: "classico", tacticalStyle: "equilibrado" }, sampleSquad());
  assert.ok(result.matches.length >= 4);
  assert.ok(result.matches.length <= 7);
});

test("pontuacao nunca negativa", () => {
  const score = calculateScore({ config: { seed: "s", userName: "Teste", teamName: "Teste XI", formation: "4-3-3", difficulty: "casual", tacticalStyle: "equilibrado" }, matches: [], champion: false, rerollsUsed: 99, swapsUsed: 99, undoUsed: true });
  assert.equal(score, 0);
});

test("nomes ofensivos sao bloqueados mesmo com disfarce", () => {
  assert.equal(isPublicNameAllowed("Clube dos Craques"), true);
  assert.equal(isPublicNameAllowed("F1lh0 da Put4 FC"), false);
  assert.equal(isPublicNameAllowed("Time FDP"), false);
  assert.equal(isPublicNameAllowed("Puuuta Clube"), false);
  assert.equal(isPublicNameAllowed("Time escrot0"), false);
  assert.equal(isPublicNameAllowed("Vagabund0s FC"), false);
  assert.equal(isPublicNameAllowed("Familia de Craques"), true);
});

test("progressao soma XP, nivel e tacas pelas campanhas", () => {
  const campaign = {
    id: "progressao-1",
    date: new Date(0).toISOString(),
    config: { seed: "s", userName: "paulo", teamName: "Paulo FC", formation: "4-3-3", difficulty: "classico", tacticalStyle: "equilibrado" },
    squad: sampleSquad(),
    matches: [{
      id: "final",
      phase: "Final",
      opponentName: "Rival",
      opponentBadge: "RI",
      userGoals: 2,
      opponentGoals: 0,
      events: [],
      stats: { possession: 50, shots: 8, shotsOnTarget: 4, corners: 3, opponentPossession: 50, opponentShots: 4, opponentShotsOnTarget: 1, opponentCorners: 2 },
      bestPlayer: "Craque"
    }],
    stageReached: "Campeao",
    champion: true,
    score: 1000,
    achievements: [],
    rerollsUsed: 0,
    swapsUsed: 0,
    undoUsed: false
  } satisfies CampaignSummary;
  const progression = buildProgression("paulo", [campaign, campaign]);
  assert.equal(progression.campaigns, 1);
  assert.equal(progression.trophies, 1);
  assert.ok(progression.xp > 0);
  assert.equal(progression.level, levelForXp(progression.xp));
});

test("ranking mascara usuario e ordena tacas", () => {
  const campaign = {
    id: "ranking-1",
    date: new Date(0).toISOString(),
    config: { seed: "s", userName: "paulorocha", teamName: "Rocha FC", formation: "4-3-3", difficulty: "classico", tacticalStyle: "equilibrado" },
    squad: sampleSquad(),
    matches: [{
      id: "final",
      phase: "Final",
      opponentName: "Rival",
      opponentBadge: "RI",
      userGoals: 2,
      opponentGoals: 0,
      events: [],
      stats: { possession: 50, shots: 8, shotsOnTarget: 4, corners: 3, opponentPossession: 50, opponentShots: 4, opponentShotsOnTarget: 1, opponentCorners: 2 },
      bestPlayer: "Craque"
    }],
    stageReached: "Campeao",
    champion: true,
    score: 1000,
    achievements: [],
    rerollsUsed: 0,
    swapsUsed: 0,
    undoUsed: false
  } satisfies CampaignSummary;
  const rankings = buildRankings([{ username: "paulorocha", playerName: "Paulo", teamName: "Rocha FC", password: "", role: "player", createdAt: "" }], [campaign]);
  assert.equal(maskUsername("paulorocha"), "pau*******");
  assert.equal(rankings[0]?.username, "pau*******");
  assert.equal(rankings[0]?.teamName, "Rocha FC");
  assert.equal(rankings[0]?.progression.trophies, 1);
});

