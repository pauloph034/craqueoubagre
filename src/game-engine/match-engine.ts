import { tacticalStyles } from "@/config/game-balance";
import { players } from "@/data/loaders";
import { calculateChemistry } from "@/game-engine/chemistry";
import { calculateSectorRatings } from "@/game-engine/team-rating";
import { inferredOpponentStyle, tacticalMatchup } from "@/game-engine/tactics";
import type { Difficulty, DraftPick, MatchEvent, MatchResult, TacticalStyle } from "@/types/game";
import type { Rng } from "./rng";

const difficultyTuning: Record<Difficulty, { userXg: number; opponentXg: number; opponentStrength: number }> = {
  casual: { userXg: 1.08, opponentXg: 0.9, opponentStrength: -2 },
  classico: { userXg: 0.98, opponentXg: 1.08, opponentStrength: 1.5 },
  lenda: { userXg: 0.88, opponentXg: 1.22, opponentStrength: 4 }
};

function poisson(rng: Rng, lambda: number): number {
  const cap = Math.max(0.15, Math.min(4.5, lambda));
  const limit = Math.exp(-cap);
  let product = 1;
  let goals = 0;
  do {
    goals += 1;
    product *= rng.next();
  } while (product > limit);
  return goals - 1;
}

function scorer(rng: Rng, squad: DraftPick[]) {
  const weights = squad.map((pick) => {
    const pos = pick.slotPosition;
    const positionWeight = pos === "ST" ? 8 : pos === "CF" || pos === "LW" || pos === "RW" ? 6 : pos === "MEI" ? 5 : pos === "CM" ? 3 : pos === "DM" ? 1.5 : pos === "GK" ? 0.02 : 1;
    return { pick, weight: positionWeight + pick.player.shooting / 18 + pick.effectiveRating / 30 };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = rng.next() * total;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.pick.player.shortName;
  }
  return squad[0]?.player.shortName ?? "Jogador";
}

const opponentScorers: Record<string, string[]> = {
  benfica: ["Eusebio", "Aguas", "Coluna", "Simoes", "Torres"],
  "borussia-dortmund": ["Lewandowski", "Reus", "Haaland", "Aubameyang", "Gotze"],
  internazionale: ["Ronaldo", "Milito", "Lautaro", "Eto'o", "Sneijder"],
  arsenal: ["Henry", "Bergkamp", "Van Persie", "Pires", "Saka"],
  sevilla: ["Kanoute", "Luis Fabiano", "Rakitic", "Navas", "Bacca"],
  "paris-saint-germain": ["Mbappe", "Neymar", "Ibrahimovic", "Cavani", "Pauleta"],
  "bayern-munique": ["Lewandowski", "Muller", "Robben", "Ribery", "Kane"],
  "real-madrid": ["Cristiano Ronaldo", "Benzema", "Raul", "Vinicius Jr.", "Bellingham"],
  "manchester-city": ["Haaland", "De Bruyne", "Foden", "Bernardo Silva", "Gundogan"],
  liverpool: ["Salah", "Mane", "Firmino", "Origi", "Gerrard"],
  chelsea: ["Drogba", "Lampard", "Havertz", "Mount", "Werner"],
  milan: ["Kaka", "Inzaghi", "Shevchenko", "Seedorf", "Pirlo"],
  juventus: ["Del Piero", "Vialli", "Ravanelli", "Trezeguet", "Dybala"],
  napoli: ["Osimhen", "Kvaratskhelia", "Zielinski", "Raspadori", "Politano"],
  "atletico-madrid": ["Griezmann", "Torres", "Saul", "Carrasco", "Koke"],
  porto: ["Deco", "McCarthy", "Derlei", "Carlos Alberto", "Alenichev"],
  ajax: ["Litmanen", "Kluivert", "Overmars", "Kanu", "Seedorf"],
  monaco: ["Morientes", "Giuly", "Prso", "Adebayor", "Nonda"],
  celtic: ["Chalmers", "Lennox", "Johnstone", "Wallace", "Gemmell"],
  "nottingham-forest": ["Birtles", "Francis", "Robertson", "Woodcock", "Bowyer"],
  hamburg: ["Hrubesch", "Magath", "Bastrup", "Milewski", "Von Heesen"],
  "steaua-bucareste": ["Lacatus", "Piturca", "Balint", "Hagi", "Boloni"],
  psv: ["Koeman", "Kieft", "Vanenburg", "Gillhaus", "Lerby"],
  "estrela-vermelha": ["Pancev", "Savicevic", "Prosinecki", "Stojkovic", "Jugovic"],
  sampdoria: ["Vialli", "Mancini", "Lombardo", "Cerezo", "Buso"],
  panathinaikos: ["Antoniadis", "Domazos", "Veron", "Eleftherakis", "Filakouris"],
  "dynamo-kyiv": ["Shevchenko", "Rebrov", "Belkevich", "Husin", "Demetradze"]
};

function opponentScorer(rng: Rng, opponent: { id: string; name: string; clubSeasonId?: string }) {
  const seasonScorers = opponent.clubSeasonId
    ? players
        .filter((player) => player.clubSeasonId === opponent.clubSeasonId && player.isActive && player.primaryPosition !== "GK")
        .sort((a, b) => {
          const scoreA = a.shooting * 1.35 + a.overall + a.pace * 0.22 + a.dribbling * 0.18;
          const scoreB = b.shooting * 1.35 + b.overall + b.pace * 0.22 + b.dribbling * 0.18;
          return scoreB - scoreA;
        })
        .slice(0, 7)
        .map((player) => player.shortName)
    : [];
  if (seasonScorers.length > 0) return rng.pick(seasonScorers);
  const opponentId = opponent.id;
  const opponentName = opponent.name;
  return rng.pick(opponentScorers[opponentId] ?? [`Artilheiro do ${opponentName}`, `Camisa 10 do ${opponentName}`, `Capitao do ${opponentName}`]);
}

export function simulateMatch(args: {
  rng: Rng;
  squad: DraftPick[];
  tacticalStyle: TacticalStyle;
  difficulty?: Difficulty;
  opponent: { name: string; strength: number; id: string; clubSeasonId?: string };
  phase: string;
  knockout: boolean;
}): MatchResult {
  const sectors = calculateSectorRatings(args.squad);
  const chemistry = calculateChemistry(args.squad);
  const style = tacticalStyles[args.tacticalStyle];
  const difficulty = difficultyTuning[args.difficulty ?? "classico"];
  const knockoutPressure = args.knockout ? 1.08 : 1;
  const adjustedOpponentStrength = args.opponent.strength + difficulty.opponentStrength + (args.knockout ? 2 : 0);
  const opponentStyle = inferredOpponentStyle(`${args.opponent.id}-${args.opponent.clubSeasonId ?? ""}`);
  const tactical = tacticalMatchup(args.tacticalStyle, opponentStyle);
  const userStrength =
    sectors.attack * 0.31 +
    sectors.midfield * 0.27 +
    sectors.defense * 0.23 +
    sectors.goalkeeper * 0.13 +
    chemistry * 0.06;
  const qualityGap = userStrength + tactical.adjustment - adjustedOpponentStrength;
  const userXgBase = 1.32 + qualityGap / 12.5;
  const opponentXgBase = 1.24 - qualityGap / 13.5;
  const userXg = Math.min(4.1, Math.max(0.18, userXgBase * (0.72 + style.attack * 0.28) * (0.78 + style.tempo * 0.22) * difficulty.userXg));
  const opponentXg = Math.min(4.3, Math.max(0.18, opponentXgBase * (1.72 - style.defense * 0.72) * difficulty.opponentXg * knockoutPressure));
  let userGoals = poisson(args.rng, userXg);
  let opponentGoals = poisson(args.rng, opponentXg);
  ({ userGoals, opponentGoals } = protectClearFavorite(userGoals, opponentGoals, qualityGap));
  let resolvedByPenalties = false;
  let penaltyScore: string | undefined;

  if (args.knockout && userGoals === opponentGoals) {
    if (args.rng.next() < 0.34) {
      userGoals += 1;
    } else if (args.rng.next() < 0.52) {
      opponentGoals += 1;
    } else {
      resolvedByPenalties = true;
      const userPens = 3 + args.rng.int(0, 3);
      let oppPens = 3 + args.rng.int(0, 3);
      if (oppPens === userPens) oppPens = Math.max(0, oppPens - 1);
      penaltyScore = `${userPens}-${oppPens}`;
      if (userPens < oppPens) opponentGoals += 1;
      else userGoals += 1;
    }
  }

  const events: MatchEvent[] = [];
  for (let i = 0; i < userGoals; i++) {
    const minute = args.rng.int(4, 90);
    events.push({ minute, type: "goal", team: "user", playerName: scorer(args.rng, args.squad), text: "Gol" });
  }
  for (let i = 0; i < opponentGoals; i++) {
    events.push({ minute: args.rng.int(6, 90), type: "goal", team: "opponent", playerName: opponentScorer(args.rng, args.opponent), text: `Gol do ${args.opponent.name}` });
  }
  const regularUserGoals = events.filter((event) => event.type === "goal" && event.team === "user");
  if (!resolvedByPenalties && args.rng.next() < 0.12) {
    if (regularUserGoals.length > 0 && args.rng.next() < 0.76) {
      const penaltyGoal = args.rng.pick(regularUserGoals);
      penaltyGoal.type = "penalty_scored";
      penaltyGoal.text = "Penalti convertido";
      penaltyGoal.requiresTakerSelection = true;
    } else {
      events.push({
        minute: args.rng.int(18, 82),
        type: "penalty_missed",
        team: "user",
        text: "Penalti perdido",
        requiresTakerSelection: true
      });
    }
  }
  const flavor: MatchEvent["type"][] = ["yellow", "save", "woodwork", "miss"];
  for (let i = 0; i < args.rng.int(3, 6); i++) {
    const type = args.rng.pick(flavor);
    events.push({ minute: args.rng.int(10, 88), type, team: args.rng.next() > 0.45 ? "user" : "opponent", text: eventText(type) });
  }
  if (resolvedByPenalties) events.push({ minute: 120, type: "penalty_scored", team: userGoals > opponentGoals ? "user" : "opponent", text: `Disputa de penaltis encerrada: ${penaltyScore}` });
  events.sort((a, b) => a.minute - b.minute);

  const possession = Math.max(35, Math.min(65, Math.round(50 + (sectors.midfield - args.opponent.strength) / 2 + (args.tacticalStyle === "pressao" ? 3 : 0))));
  return {
    id: `${args.phase}-${args.opponent.id}`,
    phase: args.phase,
    opponentName: args.opponent.name,
    opponentBadge: args.opponent.id.slice(0, 2).toUpperCase(),
    userGoals,
    opponentGoals,
    resolvedByPenalties,
    penaltyScore,
    events,
    stats: {
      possession,
      opponentPossession: 100 - possession,
      shots: Math.max(userGoals, Math.round(userXg * 4 + args.rng.int(0, 5))),
      shotsOnTarget: Math.max(userGoals, Math.round(userXg * 2 + args.rng.int(0, 3))),
      corners: args.rng.int(1, 9),
      opponentShots: Math.max(opponentGoals, Math.round(opponentXg * 4 + args.rng.int(0, 5))),
      opponentShotsOnTarget: Math.max(opponentGoals, Math.round(opponentXg * 2 + args.rng.int(0, 3))),
      opponentCorners: args.rng.int(1, 8)
    },
    bestPlayer: scorer(args.rng, args.squad),
    tacticalContext: {
      userStyle: args.tacticalStyle,
      opponentStyle,
      userStrength: Math.round(userStrength * 10) / 10,
      opponentStrength: Math.round(adjustedOpponentStrength * 10) / 10,
      tacticalAdjustment: tactical.adjustment,
      summary: tactical.summary
    }
  };
}

function protectClearFavorite(userGoals: number, opponentGoals: number, qualityGap: number) {
  if (qualityGap >= 18 && userGoals <= opponentGoals) {
    return { userGoals: opponentGoals + 1, opponentGoals };
  }
  if (qualityGap >= 14 && userGoals < opponentGoals) {
    return { userGoals: opponentGoals, opponentGoals };
  }
  if (qualityGap <= -18 && opponentGoals <= userGoals) {
    return { userGoals, opponentGoals: userGoals + 1 };
  }
  if (qualityGap <= -14 && opponentGoals < userGoals) {
    return { userGoals, opponentGoals: userGoals };
  }
  return { userGoals, opponentGoals };
}

function eventText(type: MatchEvent["type"]) {
  const labels = {
    goal: "Gol",
    yellow: "Cartao amarelo",
    red: "Cartao vermelho",
    substitution: "Substituicao",
    save: "Grande defesa",
    woodwork: "Bola na trave",
    miss: "Chance perdida",
    extra_time: "Inicio da prorrogacao",
    penalty_scored: "Penalti convertido",
    penalty_missed: "Penalti perdido"
  };
  return labels[type];
}

