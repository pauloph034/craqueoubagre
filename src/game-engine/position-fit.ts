import type { Player, Position, PositionFit } from "@/types/game";

const adaptations: Partial<Record<Position, Position[]>> = {
  RW: ["RM", "LW"],
  LW: ["LM", "RW"],
  ST: ["CF"],
  CF: ["ST", "MEI"],
  CM: ["DM", "MEI", "RM", "LM"],
  DM: ["CM", "CB"],
  MEI: ["CM", "CF"],
  RB: ["RWB", "RM"],
  LB: ["LWB", "LM"],
  RWB: ["RB", "RM"],
  LWB: ["LB", "LM"],
  RM: ["RW", "CM"],
  LM: ["LW", "CM"],
  CB: ["DM"]
};

const freeRoleSwitches: Partial<Record<Position, Position[]>> = {
  RW: ["RM"],
  RM: ["RW"],
  LW: ["LM"],
  LM: ["LW"],
  ST: ["CF"],
  CF: ["ST"],
  RB: ["RWB"],
  LB: ["LWB"],
  RWB: ["RB"],
  LWB: ["LB"]
};

const playerFreeRoles: Record<string, Position[]> = {
  neymar: ["LM", "MEI"],
  "cristiano-ronaldo": ["ST", "CF"],
  "lionel-messi": ["MEI", "ST", "CF", "RW", "RM"],
  "kevin-de-bruyne": ["CM", "MEI"],
  "kylian-mbappe": ["ST", "LW", "CF"]
};

export function calculatePositionFit(player: Player, slotPosition: Position): PositionFit {
  if (player.primaryPosition === slotPosition) {
    return { type: "primary", effectiveRating: player.overall, penalty: 0, reason: "Posicao principal", allowed: true };
  }
  if (player.primaryPosition === "GK" || slotPosition === "GK") {
    return { type: "incompatible", effectiveRating: 0, penalty: 99, reason: "Goleiro nao atua na linha e jogadores de linha nao atuam no gol", allowed: false };
  }
  if (playerFreeRoles[player.canonicalPlayerId]?.includes(slotPosition)) {
    return { type: "secondary", effectiveRating: player.overall, penalty: 0, reason: "Funcao dominada pelo jogador", allowed: true };
  }
  if (freeRoleSwitches[player.primaryPosition]?.includes(slotPosition)) {
    return { type: "adapted", effectiveRating: player.overall, penalty: 0, reason: "Funcao equivalente", allowed: true };
  }
  if (player.secondaryPositions.includes(slotPosition)) {
    return { type: "secondary", effectiveRating: player.overall - 2, penalty: 2, reason: "Posicao secundaria", allowed: true };
  }
  if (adaptations[player.primaryPosition]?.includes(slotPosition)) {
    const penalty = player.primaryPosition === "CB" || slotPosition === "CB" ? 7 : 5;
    return { type: "adapted", effectiveRating: Math.max(1, player.overall - penalty), penalty, reason: "Adaptacao permitida", allowed: true };
  }
  return { type: "incompatible", effectiveRating: 0, penalty: 99, reason: "Posicao incompatÃ­vel", allowed: false };
}

