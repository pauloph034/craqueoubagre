import { coaches } from "@/data/coaches";
import { clubSeasons, players } from "@/data/loaders";
import { getFormationSlots } from "@/config/formations";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { ratingWithCoachNationalityBonus } from "@/game-engine/coach-nationality";
import { createRng } from "@/game-engine/rng";
import { inferredOpponentStyle, tacticalMatchup } from "@/game-engine/tactics";
import { safeLoad, safeSave } from "@/lib/storage";
import type { Coach, Position, TacticalStyle } from "@/types/game";

export type RoomVisibility = "publica" | "privada";
export type RoomDraftMode = "todos" | "turnos";
export type RoomStatus = "lobby" | "drafting" | "challenge" | "reviewing" | "coach" | "cards" | "bracket" | "finished";
export type RoomMatchStatus = "pending" | "done";
export type PenaltyDirection = "left" | "center" | "right";

export type RoomSecretCardId =
  | "collective-boost"
  | "perfect-night"
  | "historic-swap"
  | "stored-penalty"
  | "inspired-captain"
  | "wall"
  | "loaned-star"
  | "luxury-bench";

export type RoomSecretCardRarity = "rara" | "epica" | "lendaria";

export type RoomSecretCardDefinition = {
  id: RoomSecretCardId;
  name: string;
  description: string;
  rarity: RoomSecretCardRarity;
  weight: number;
};

export type RoomCardActivation = {
  cardId: RoomSecretCardId;
  matchId: string;
  usedAt: number;
  targetPickId?: string;
  opponentPickId?: string;
  specialPick?: RoomPick;
  penaltyScored?: boolean;
};

export type RoomCardEvent = {
  id: string;
  playerId: string;
  cardId: RoomSecretCardId;
  minute: number;
  text: string;
  side?: "home" | "away";
  scored?: boolean;
};

export type ActivateRoomCardInput = {
  targetPickId?: string;
  opponentPickId?: string;
  specialPickId?: string;
};

export type RoomPenaltyShot = {
  id: string;
  round: number;
  direction: PenaltyDirection;
  keeperDirection: PenaltyDirection;
  scored: boolean;
  accuracy: number;
};

export type RoomPick = {
  id: string;
  canonicalPlayerId: string;
  name: string;
  nationality?: string;
  clubName: string;
  clubSeasonId: string;
  season: string;
  position: Position;
  overall: number;
  shirtNumber?: number;
  slotId?: string;
  slotLabel?: string;
  slotPosition?: Position;
  effectiveRating?: number;
};

export type RoomDraw = {
  clubSeasonId: string;
  clubId?: string;
  clubName: string;
  shortName: string;
  season: string;
  country: string;
  primaryColor: string;
  secondaryColor: string;
  genericBadgeShape: "shield" | "round" | "diamond" | "crest";
  rarity: string;
  roster: RoomPick[];
};

export type RoomCoach = Pick<Coach, "id" | "name" | "nationality" | "clubSeasonId" | "clubName" | "season" | "style" | "rating" | "description">;

export type RoomPlayer = {
  id: string;
  userName: string;
  teamName: string;
  emblemId?: string;
  isBot?: boolean;
  formation: string;
  tacticalStyle: TacticalStyle;
  squad: RoomPick[];
  ready: boolean;
};

export type RoomMatch = {
  id: string;
  phase: string;
  homeName: string;
  awayName: string;
  homePlayerId?: string;
  awayPlayerId?: string;
  homeStrength?: number;
  awayStrength?: number;
  homeStyle?: TacticalStyle;
  awayStyle?: TacticalStyle;
  homeGoals?: number;
  awayGoals?: number;
  homeBonusGoals?: number;
  awayBonusGoals?: number;
  cardEvents?: RoomCardEvent[];
  winnerName?: string;
  status: RoomMatchStatus;
};

export type FriendRoom = {
  id: string;
  name: string;
  hostName: string;
  visibility: RoomVisibility;
  password?: string;
  difficulty: "classico" | "almanaque";
  draftMode: RoomDraftMode;
  simultaneousMinutes: 2 | 4 | 6;
  turnSeconds: 20 | 30 | 45;
  status: RoomStatus;
  createdAt: string;
  updatedAt?: string;
  revision: number;
  draftCycle: number;
  processedActionIds?: string[];
  lastSeenAt?: Record<string, number>;
  players: RoomPlayer[];
  turnIndex: number;
  turnOptions: RoomPick[];
  currentDraw?: RoomDraw;
  currentDrawByPlayer?: Record<string, RoomDraw | undefined>;
  pendingPickId?: string;
  pendingPickByPlayer?: Record<string, string | undefined>;
  rerollsByPlayer: Record<string, number>;
  picksInTurn: number;
  turnStartedAt?: number;
  draftEndsAt?: number;
  reviewEndsAt?: number;
  reviewSwapUsedByPlayer: Record<string, boolean>;
  penaltyStartedAt?: number;
  penaltyEndsAt?: number;
  penaltyRound: number;
  penaltyEligiblePlayerIds: string[];
  penaltyShotsByPlayer: Record<string, RoomPenaltyShot[]>;
  penaltyWinnerId?: string;
  legendOptions: RoomPick[];
  legendSelectedId?: string;
  coachOptionsByPlayer: Record<string, RoomCoach[]>;
  selectedCoachByPlayer: Record<string, string>;
  cardOptionsByPlayer: Record<string, RoomSecretCardId[]>;
  selectedCardByPlayer: Record<string, RoomSecretCardId>;
  cardActivationByPlayer: Record<string, RoomCardActivation>;
  completedRoundByPlayer: Record<string, number>;
  bracket: RoomMatch[];
  bracketRound: number;
  champion?: string;
};

export type CreateRoomInput = {
  name: string;
  hostName: string;
  hostTeamName: string;
  hostEmblemId?: string;
  visibility: RoomVisibility;
  password?: string;
  difficulty: "classico" | "almanaque";
  draftMode: RoomDraftMode;
  simultaneousMinutes: 2 | 4 | 6;
  turnSeconds: 20 | 30 | 45;
};

const roomsKey = "craque-ou-bagre:friend-rooms:v2";
const phases = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
const defaultFormation = "4-3-3";
const defaultTacticalStyle: TacticalStyle = "equilibrado";
const maxEntrants = 16;
const roomRerollsPerDraft = 3;
export const penaltyChallengeSeconds = 45;
const penaltySuddenDeathSeconds = 15;
const penaltySuddenDeathRounds = 3;
const staleRoomMs = 60 * 60 * 1000;

export const roomSecretCards: RoomSecretCardDefinition[] = [
  { id: "collective-boost", name: "Impulso coletivo", description: "+2 de overall em todo o elenco ate o fim do torneio.", rarity: "rara", weight: 18 },
  { id: "perfect-night", name: "Noite perfeita", description: "+5 de overall em todo o elenco durante uma partida.", rarity: "lendaria", weight: 5 },
  { id: "historic-swap", name: "Troca historica", description: "Troque um jogador com o adversario, obrigatoriamente da mesma posicao.", rarity: "lendaria", weight: 4 },
  { id: "stored-penalty", name: "Penalti guardado", description: "Ganhe uma cobranca antes dos 75 minutos. O goleiro ainda pode defender.", rarity: "epica", weight: 16 },
  { id: "inspired-captain", name: "Capitao inspirado", description: "Escolha um jogador para receber +8 ate o fim do mata-mata.", rarity: "epica", weight: 16 },
  { id: "wall", name: "Muralha", description: "Goleiro recebe +7 e defensores +3 durante uma partida.", rarity: "rara", weight: 17 },
  { id: "loaned-star", name: "Craque emprestado", description: "Escolha um entre tres jogadores 99 para disputar a proxima partida.", rarity: "lendaria", weight: 5 },
  { id: "luxury-bench", name: "Banco de Luxo", description: "No intervalo, escolha um substituto aleatorio entre 93 e 97.", rarity: "epica", weight: 16 }
];

export function loadFriendRooms() {
  return normalizeFriendRooms(safeLoad<FriendRoom[]>(roomsKey, []));
}

export function saveFriendRooms(rooms: FriendRoom[]) {
  safeSave(roomsKey, normalizeFriendRooms(rooms));
}

export function normalizeFriendRooms(rooms: FriendRoom[]) {
  return rooms.map(normalizeFriendRoom).filter(isVisibleRoom).slice(0, 40);
}

export function createFriendRoom(input: CreateRoomInput): FriendRoom {
  const id = `sala-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const hostPlayer = createRoomPlayer(input.hostName, input.hostTeamName, false, input.hostEmblemId);
  return {
    id,
    name: input.name.trim() || "Final de Copa",
    hostName: input.hostName,
    visibility: input.visibility,
    password: input.visibility === "privada" ? input.password?.trim() : undefined,
    difficulty: input.difficulty,
    draftMode: input.draftMode,
    simultaneousMinutes: input.simultaneousMinutes,
    turnSeconds: input.turnSeconds,
    status: "lobby",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 0,
    draftCycle: 0,
    lastSeenAt: { [hostPlayer.id]: Date.now() },
    players: [hostPlayer],
    turnIndex: 0,
    turnOptions: [],
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    rerollsByPlayer: {},
    picksInTurn: 0,
    reviewEndsAt: undefined,
    reviewSwapUsedByPlayer: {},
    penaltyStartedAt: undefined,
    penaltyEndsAt: undefined,
    penaltyRound: 0,
    penaltyEligiblePlayerIds: [],
    penaltyShotsByPlayer: {},
    penaltyWinnerId: undefined,
    legendOptions: [],
    legendSelectedId: undefined,
    coachOptionsByPlayer: {},
    selectedCoachByPlayer: {},
    cardOptionsByPlayer: {},
    selectedCardByPlayer: {},
    cardActivationByPlayer: {},
    completedRoundByPlayer: {},
    bracket: [],
    bracketRound: 0
  };
}

export function createRoomPlayer(userName: string, teamName?: string, isBot = false, emblemId?: string): RoomPlayer {
  const cleanUser = userName.trim() || "Jogador";
  const cleanTeam = teamName?.trim() || `${cleanUser} FC`;
  return {
    id: `${isBot ? "bot" : "player"}-${cleanUser.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
    userName: cleanUser,
    teamName: cleanTeam,
    emblemId,
    isBot,
    formation: defaultFormation,
    tacticalStyle: defaultTacticalStyle,
    squad: [],
    ready: false
  };
}

export function startRoomDraft(room: FriendRoom) {
  const cleanPlayers = room.players.filter((player) => !player.isBot).slice(0, maxEntrants).map(normalizePlayer);
  if (!cleanPlayers.length || !cleanPlayers.every((player) => player.ready)) return normalizeRoom(room);
  const next: FriendRoom = {
    ...room,
    status: "drafting",
    players: cleanPlayers.map((player) => ({ ...player, squad: [], ready: false })),
    turnIndex: 0,
    draftMode: room.draftMode,
    turnOptions: [],
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    rerollsByPlayer: {},
    picksInTurn: 0,
    draftEndsAt: room.draftMode === "todos" ? Date.now() + room.simultaneousMinutes * 60_000 : undefined,
    turnStartedAt: room.draftMode === "turnos" ? Date.now() : undefined,
    reviewEndsAt: undefined,
    reviewSwapUsedByPlayer: {},
    penaltyStartedAt: undefined,
    penaltyEndsAt: undefined,
    penaltyRound: 0,
    penaltyEligiblePlayerIds: [],
    penaltyShotsByPlayer: {},
    penaltyWinnerId: undefined,
    legendOptions: [],
    legendSelectedId: undefined,
    coachOptionsByPlayer: {},
    selectedCoachByPlayer: {},
    cardOptionsByPlayer: {},
    selectedCardByPlayer: {},
    cardActivationByPlayer: {},
    completedRoundByPlayer: {},
    bracket: [],
    bracketRound: 0,
    champion: undefined
  };
  return normalizeRoom(next);
}

export function autoCompleteRoomDraft(room: FriendRoom) {
  const rng = createRng(`${room.id}-${room.draftCycle}-auto-draft-${room.players.length}`);
  const playersWithSquads = room.players.map((player, index) => ({
    ...player,
    squad: completeSquad(player.squad, `${room.id}-${player.id}-${index}`, rng),
    ready: true
  }));
  return startRoomCoachStage({ ...room, players: playersWithSquads, status: "reviewing" });
}

export function drawRoomTeam(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "drafting") return normalized;
  const player = draftPlayerFor(normalized, playerId);
  if (!player || player.squad.length >= draftSquadTarget(normalized)) return normalized;
  const currentDraw = playerDrawFor(normalized, playerId);
  const rerollsUsed = normalized.rerollsByPlayer[playerId] ?? 0;
  const isReroll = Boolean(currentDraw);
  if (isReroll && rerollsUsed >= roomRerollsPerDraft) return normalized;
  // A mesma acao concorrente precisa produzir o mesmo time. Isso impede que
  // respostas repetidas da rede parecam um novo sorteio sem consumir reroll.
  const drawNumber = isReroll ? rerollsUsed + 1 : rerollsUsed;
  const seed = `${normalized.id}-${normalized.draftCycle}-${player.id}-${player.squad.length}-${normalized.picksInTurn}-draw-${drawNumber}`;
  const draw = buildRoomDraw(seed, player);
  return normalizeRoom({
    ...normalized,
    currentDraw: normalized.draftMode === "turnos" ? draw : normalized.currentDraw,
    currentDrawByPlayer:
      normalized.draftMode === "todos"
        ? { ...(normalized.currentDrawByPlayer ?? {}), [playerId]: draw }
        : normalized.currentDrawByPlayer,
    pendingPickId: normalized.draftMode === "turnos" ? undefined : normalized.pendingPickId,
    pendingPickByPlayer:
      normalized.draftMode === "todos"
        ? { ...(normalized.pendingPickByPlayer ?? {}), [playerId]: undefined }
        : normalized.pendingPickByPlayer,
    rerollsByPlayer: isReroll
      ? {
          ...normalized.rerollsByPlayer,
          [playerId]: rerollsUsed + 1
        }
      : normalized.rerollsByPlayer
  });
}

export function selectRoomPlayer(room: FriendRoom, playerId: string, pickId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "drafting") return normalized;
  const player = draftPlayerFor(normalized, playerId);
  if (!player || player.squad.length >= draftSquadTarget(normalized)) return normalized;
  const pick = playerDrawFor(normalized, playerId)?.roster.find((item) => item.id === pickId);
  if (!pick || player.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId)) return normalized;
  if (!hasAvailableRoomSlot(player, pick)) return normalized;
  return normalizeRoom({
    ...normalized,
    pendingPickId: normalized.draftMode === "turnos" ? pick.id : normalized.pendingPickId,
    pendingPickByPlayer:
      normalized.draftMode === "todos"
        ? { ...(normalized.pendingPickByPlayer ?? {}), [playerId]: pick.id }
        : normalized.pendingPickByPlayer
  });
}

export function placeRoomPlayer(room: FriendRoom, playerId: string, slotId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "drafting") return normalized;
  const player = draftPlayerFor(normalized, playerId);
  const squadTarget = draftSquadTarget(normalized);
  if (!player || player.squad.length >= squadTarget) return normalized;
  const playerIndex = normalized.players.findIndex((item) => item.id === player.id);
  const pendingId = normalized.draftMode === "todos" ? normalized.pendingPickByPlayer?.[playerId] : normalized.pendingPickId;
  const pending = playerDrawFor(normalized, playerId)?.roster.find((item) => item.id === pendingId);
  if (!pending || player.squad.some((item) => item.slotId === slotId || item.canonicalPlayerId === pending.canonicalPlayerId)) return normalized;
  const placed = assignPickToSlot(pending, player, slotId);
  if (!placed) return normalized;

  const nextPicksInTurn = normalized.picksInTurn + 1;
  const playersNext = normalized.players.map((item, index) => {
    if (index !== playerIndex) return item;
    const squad = [...item.squad, placed].slice(0, 11);
    return { ...item, squad, ready: squad.length >= 11 };
  });
  const updatedPlayer = playersNext[playerIndex]!;
  if (!normalized.penaltyWinnerId && playersNext.every((item) => item.squad.length >= 10)) {
    return startRoomPenaltyChallenge({
      ...normalized,
      players: playersNext,
      currentDraw: undefined,
      currentDrawByPlayer: {},
      pendingPickId: undefined,
      pendingPickByPlayer: {},
      picksInTurn: 0,
      turnOptions: [],
      turnStartedAt: undefined
    });
  }

  if (playersNext.every((item) => item.squad.length >= 11)) {
    return normalizeRoom({
      ...normalized,
      status: "reviewing",
      players: playersNext,
      currentDraw: undefined,
      currentDrawByPlayer: {},
      pendingPickId: undefined,
      pendingPickByPlayer: {},
      picksInTurn: 0,
      turnOptions: [],
      turnStartedAt: undefined,
      reviewEndsAt: Date.now() + 30_000,
      reviewSwapUsedByPlayer: Object.fromEntries(playersNext.map((player) => [player.id, false]))
    });
  }

  if (normalized.draftMode === "todos") {
    return normalizeRoom({
      ...normalized,
      players: playersNext,
      currentDrawByPlayer: { ...(normalized.currentDrawByPlayer ?? {}), [playerId]: undefined },
      pendingPickByPlayer: { ...(normalized.pendingPickByPlayer ?? {}), [playerId]: undefined },
      rerollsByPlayer: normalized.rerollsByPlayer
    });
  }

  const batchStartSize = updatedPlayer.squad.length - nextPicksInTurn;
  const batchLimit = batchStartSize >= 9 ? 1 : 3;
  const shouldAdvance = updatedPlayer.squad.length >= squadTarget || nextPicksInTurn >= batchLimit;
  return normalizeRoom({
    ...normalized,
    players: playersNext,
    turnIndex: shouldAdvance ? nextDraftTurnIndex(playersNext, normalized.turnIndex) : normalized.turnIndex,
    currentDraw: undefined,
    pendingPickId: undefined,
    // Os 3 rerolls pertencem ao draft inteiro do jogador, nao a cada escolha.
    rerollsByPlayer: normalized.rerollsByPlayer,
    picksInTurn: shouldAdvance ? 0 : nextPicksInTurn,
    turnOptions: [],
    turnStartedAt: Date.now()
  });
}

export function autoPickRoomTurn(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "drafting") return normalized;
  const player = normalized.players[normalized.turnIndex];
  if (!player) return normalized;
  let next = normalized.currentDraw ? normalized : drawRoomTeam(normalized, player.id);
  const activePlayer = next.players[next.turnIndex];
  if (!activePlayer || !next.currentDraw) return next;
  const slots = getFormationSlots(activePlayer.formation, activePlayer.tacticalStyle);
  const openSlots = slots.filter((slot) => !activePlayer.squad.some((pick) => pick.slotId === slot.id));
  const picked = next.currentDraw.roster.find((pick) => openSlots.some((slot) => canPlaceRoomPick(pick, slot.position)) && !activePlayer.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId));
  const slot = picked ? openSlots.find((item) => canPlaceRoomPick(picked, item.position)) : undefined;
  if (!picked || !slot) return next;
  next = selectRoomPlayer(next, activePlayer.id, picked.id);
  return placeRoomPlayer(next, activePlayer.id, slot.id);
}

export function autoPickRoomPlayer(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  const player = draftPlayerFor(normalized, playerId);
  if (!player) return normalized;
  let next = playerDrawFor(normalized, playerId) ? normalized : drawRoomTeam(normalized, playerId);
  const activePlayer = draftPlayerFor(next, playerId);
  const draw = playerDrawFor(next, playerId);
  if (!activePlayer || !draw) return next;
  const slots = getFormationSlots(activePlayer.formation, activePlayer.tacticalStyle);
  const openSlots = slots.filter((slot) => !activePlayer.squad.some((pick) => pick.slotId === slot.id));
  const picked = draw.roster.find((pick) => openSlots.some((slot) => canPlaceRoomPick(pick, slot.position)) && !activePlayer.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId));
  const slot = picked ? openSlots.find((item) => canPlaceRoomPick(picked, item.position)) : undefined;
  if (!picked || !slot) return next;
  next = selectRoomPlayer(next, playerId, picked.id);
  return placeRoomPlayer(next, playerId, slot.id);
}

export function startRoomPenaltyChallenge(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.penaltyWinnerId || !normalized.players.length || !normalized.players.every((player) => player.squad.length >= 10)) return normalized;
  const now = Date.now();
  return normalizeRoom({
    ...normalized,
    status: "challenge",
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    picksInTurn: 0,
    turnStartedAt: undefined,
    draftEndsAt: undefined,
    penaltyStartedAt: now,
    penaltyEndsAt: now + penaltyChallengeSeconds * 1000,
    penaltyRound: 0,
    penaltyEligiblePlayerIds: normalized.players.map((player) => player.id),
    penaltyShotsByPlayer: Object.fromEntries(normalized.players.map((player) => [player.id, []])),
    penaltyWinnerId: undefined,
    legendOptions: [],
    legendSelectedId: undefined
  });
}

export function shootRoomPenalty(room: FriendRoom, playerId: string, direction: PenaltyDirection, accuracy: number) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "challenge" || normalized.penaltyWinnerId || !normalized.penaltyEligiblePlayerIds.includes(playerId)) return normalized;
  const round = normalized.penaltyRound;
  const roundShots = (normalized.penaltyShotsByPlayer[playerId] ?? []).filter((shot) => shot.round === round);
  const required = round === 0 ? 3 : 1;
  if (roundShots.length >= required) return normalized;
  const shotIndex = roundShots.length;
  const keeperRng = createRng(`${normalized.id}-${playerId}-penalty-${round}-${shotIndex}`);
  const directions: PenaltyDirection[] = ["left", "center", "right"];
  const keeperDirection = directions[keeperRng.int(0, directions.length - 1)]!;
  const cleanAccuracy = Math.max(0, Math.min(100, Math.round(accuracy)));
  const shot: RoomPenaltyShot = {
    id: `${playerId}-${round}-${shotIndex}`,
    round,
    direction,
    keeperDirection,
    scored: cleanAccuracy > 35 && (cleanAccuracy > 85 || direction !== keeperDirection),
    accuracy: cleanAccuracy
  };
  const next = normalizeRoom({
    ...normalized,
    penaltyShotsByPlayer: {
      ...normalized.penaltyShotsByPlayer,
      [playerId]: [...(normalized.penaltyShotsByPlayer[playerId] ?? []), shot]
    }
  });
  return resolveRoomPenaltyRound(next);
}

export function resolveRoomPenaltyTimeout(room: FriendRoom) {
  let next = normalizeRoom(room);
  if (next.status !== "challenge" || next.penaltyWinnerId || (next.penaltyEndsAt ?? Infinity) > Date.now()) return next;
  const round = next.penaltyRound;
  const required = round === 0 ? 3 : 1;
  for (const playerId of next.penaltyEligiblePlayerIds) {
    while ((next.penaltyShotsByPlayer[playerId] ?? []).filter((shot) => shot.round === round).length < required) {
      const shotIndex = (next.penaltyShotsByPlayer[playerId] ?? []).filter((shot) => shot.round === round).length;
      const rng = createRng(`${next.id}-${playerId}-penalty-auto-${round}-${shotIndex}`);
      const directions: PenaltyDirection[] = ["left", "center", "right"];
      next = shootRoomPenalty(next, playerId, directions[rng.int(0, 2)]!, 55 + rng.int(0, 35));
      if (next.status !== "challenge" || next.penaltyWinnerId) return next;
    }
  }
  return resolveRoomPenaltyRound(next, true);
}

export function chooseRoomLegend(room: FriendRoom, playerId: string, legendId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "challenge" || normalized.penaltyWinnerId !== playerId || normalized.legendSelectedId) return normalized;
  const player = normalized.players.find((item) => item.id === playerId);
  const legend = normalized.legendOptions.find((item) => item.id === legendId);
  if (!player || !legend || player.squad.length !== 10) return normalized;
  const openSlot = getFormationSlots(player.formation, player.tacticalStyle).find((slot) => !player.squad.some((pick) => pick.slotId === slot.id));
  if (!openSlot) return normalized;
  const assigned = assignPickToSlot(legend, player, openSlot.id);
  if (!assigned) return normalized;
  const legendaryPick = { ...assigned, overall: 99, effectiveRating: 99 };
  const nextPlayers = normalized.players.map((item) => item.id === playerId ? { ...item, squad: [...item.squad, legendaryPick], ready: true } : item);
  if (nextPlayers.every((item) => item.squad.length >= 11)) return beginRoomReview({ ...normalized, players: nextPlayers, legendSelectedId: legendId });
  const firstIncomplete = nextPlayers.findIndex((item) => item.squad.length < 11);
  return normalizeRoom({
    ...normalized,
    status: "drafting",
    players: nextPlayers,
    legendSelectedId: legendId,
    turnIndex: Math.max(0, firstIncomplete),
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    picksInTurn: 0,
    turnStartedAt: normalized.draftMode === "turnos" ? Date.now() : undefined,
    draftEndsAt: normalized.draftMode === "todos" ? Date.now() + 60_000 : undefined
  });
}

function resolveRoomPenaltyRound(room: FriendRoom, force = false) {
  const round = room.penaltyRound;
  const required = round === 0 ? 3 : 1;
  const complete = room.penaltyEligiblePlayerIds.every((playerId) => (room.penaltyShotsByPlayer[playerId] ?? []).filter((shot) => shot.round === round).length >= required);
  if (!complete && !force) return room;

  const scoreFor = (playerId: string) => (room.penaltyShotsByPlayer[playerId] ?? []).filter((shot) => shot.round === round && shot.scored).length;
  const best = Math.max(...room.penaltyEligiblePlayerIds.map(scoreFor));
  const leaders = room.penaltyEligiblePlayerIds.filter((playerId) => scoreFor(playerId) === best);
  if (leaders.length === 1) return finishRoomPenaltyChallenge(room, leaders[0]!);

  if (round < penaltySuddenDeathRounds) {
    return normalizeRoom({
      ...room,
      penaltyRound: round + 1,
      penaltyEligiblePlayerIds: leaders,
      penaltyEndsAt: Date.now() + penaltySuddenDeathSeconds * 1000
    });
  }

  const technicalWinner = [...leaders].sort((a, b) => penaltyTechnicalScore(room, b) - penaltyTechnicalScore(room, a) || a.localeCompare(b))[0]!;
  return finishRoomPenaltyChallenge(room, technicalWinner);
}

function finishRoomPenaltyChallenge(room: FriendRoom, winnerId: string) {
  const winner = room.players.find((player) => player.id === winnerId);
  return normalizeRoom({
    ...room,
    penaltyWinnerId: winnerId,
    penaltyEndsAt: undefined,
    legendOptions: winner ? buildRoomLegendOptions(room, winner) : []
  });
}

function penaltyTechnicalScore(room: FriendRoom, playerId: string) {
  const player = room.players.find((item) => item.id === playerId);
  const squadRating = player?.squad.reduce((sum, pick) => sum + (pick.effectiveRating ?? pick.overall), 0) ?? 0;
  const accuracy = (room.penaltyShotsByPlayer[playerId] ?? []).reduce((sum, shot) => sum + shot.accuracy, 0);
  const seeded = createRng(`${room.id}-${playerId}-technical-tiebreak`).int(0, 999) / 1000;
  return squadRating * 1000 + accuracy + seeded;
}

function buildRoomLegendOptions(room: FriendRoom, winner: RoomPlayer) {
  const used = new Set(winner.squad.map((pick) => pick.canonicalPlayerId));
  const openSlot = getFormationSlots(winner.formation, winner.tacticalStyle).find((slot) => !winner.squad.some((pick) => pick.slotId === slot.id));
  if (!openSlot) return [];
  const seenNames = new Set<string>();
  const pool = players
    .filter((player) => player.isActive && !used.has(player.canonicalPlayerId) && calculatePositionFit(player, openSlot.position).allowed)
    .sort((a, b) => b.overall - a.overall)
    .filter((player) => {
      const nameKey = player.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
      if (seenNames.has(nameKey)) return false;
      seenNames.add(nameKey);
      return true;
    })
    .slice(0, 40);
  return shuffle(pool, createRng(`${room.id}-${winner.id}-legend-99`)).slice(0, 5).map((player) => ({
    ...toRoomPick(player),
    id: `legend99-${player.id}`,
    overall: 99,
    effectiveRating: 99
  }));
}

export function moveRoomPick(room: FriendRoom, playerId: string, fromSlotId: string, toSlotId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "reviewing" || fromSlotId === toSlotId) return normalized;
  const player = normalized.players.find((item) => item.id === playerId);
  if (!player) return normalized;
  const fromPick = player.squad.find((pick) => pick.slotId === fromSlotId);
  if (!fromPick) return normalized;
  const toPick = player.squad.find((pick) => pick.slotId === toSlotId);
  const movedFrom = assignPickToSlot(fromPick, player, toSlotId);
  if (!movedFrom) return normalized;
  const movedTo = toPick ? assignPickToSlot(toPick, player, fromSlotId) : undefined;
  if (toPick && !movedTo) return normalized;
  return normalizeRoom({
    ...normalized,
    players: normalized.players.map((item) => {
      if (item.id !== playerId) return item;
      return {
        ...item,
        squad: item.squad.map((pick) => {
          if (pick.id === fromPick.id) return movedFrom;
          if (movedTo && pick.id === toPick?.id) return movedTo;
          return pick;
        })
      };
    })
  });
}

export function replaceRoomPick(room: FriendRoom, playerId: string, slotId: string, replacementId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "reviewing") return normalized;
  if (normalized.reviewSwapUsedByPlayer[playerId]) return normalized;
  const player = normalized.players.find((item) => item.id === playerId);
  if (!player || !player.squad.some((pick) => pick.slotId === slotId)) return normalized;
  const sourcePlayer = players.find((item) => item.id === replacementId);
  if (!sourcePlayer || player.squad.some((pick) => pick.canonicalPlayerId === sourcePlayer.canonicalPlayerId)) return normalized;
  const season = clubSeasons.find((item) => item.id === sourcePlayer.clubSeasonId);
  const placed = assignPickToSlot(toRoomPick(sourcePlayer, season), player, slotId);
  if (!placed) return normalized;
  const nextRoom = normalizeRoom({
    ...normalized,
    players: normalized.players.map((item) =>
      item.id === playerId
        ? {
            ...item,
            squad: item.squad.map((pick) => (pick.slotId === slotId ? placed : pick))
          }
        : item
    ),
    reviewSwapUsedByPlayer: {
      ...normalized.reviewSwapUsedByPlayer,
      [playerId]: true
    }
  });
  return allRoomReviewsComplete(nextRoom) ? startRoomCoachStage(nextRoom) : nextRoom;
}

export function confirmRoomReview(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "reviewing" || !normalized.players.some((player) => player.id === playerId)) return normalized;
  const nextRoom = normalizeRoom({
    ...normalized,
    reviewSwapUsedByPlayer: {
      ...normalized.reviewSwapUsedByPlayer,
      [playerId]: true
    }
  });
  return allRoomReviewsComplete(nextRoom) ? startRoomCoachStage(nextRoom) : nextRoom;
}

export function startRoomCoachStage(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (!["reviewing", "coach"].includes(normalized.status)) return normalized;
  if (!allSquadsComplete(normalized.players)) return normalizeRoom({ ...normalized, status: "drafting", bracket: [], bracketRound: 0, champion: undefined });
  return normalizeRoom({
    ...normalized,
    status: "coach",
    turnIndex: 0,
    turnOptions: [],
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    rerollsByPlayer: {},
    picksInTurn: 0,
    turnStartedAt: undefined,
    reviewEndsAt: undefined,
    players: normalized.players.map((player) => ({ ...player, ready: false }))
  });
}

export function drawRoomCoaches(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "coach" || !normalized.players.some((player) => player.id === playerId)) return normalized;
  if (normalized.selectedCoachByPlayer[playerId] || normalized.coachOptionsByPlayer[playerId]?.length) return normalized;
  const rng = createRng(`${normalized.id}-${playerId}-coach-${Date.now()}`);
  const pool = shuffle(coaches, rng).slice(0, 3).map(toRoomCoach);
  return normalizeRoom({
    ...normalized,
    coachOptionsByPlayer: {
      ...normalized.coachOptionsByPlayer,
      [playerId]: pool
    }
  });
}

export function chooseRoomCoach(room: FriendRoom, playerId: string, coachId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "coach") return normalized;
  const options = normalized.coachOptionsByPlayer[playerId] ?? [];
  const selectedCoach = options.find((coach) => coach.id === coachId);
  if (!selectedCoach) return normalized;
  const selectedCoachByPlayer = {
    ...normalized.selectedCoachByPlayer,
    [playerId]: coachId
  };
  const next = normalizeRoom({
    ...normalized,
    selectedCoachByPlayer,
    players: normalized.players.map((player) =>
      player.id === playerId
        ? { ...applyRoomCoachNationalityBonus(player, selectedCoach), ready: true }
        : player
    )
  });
  if (next.players.every((player) => selectedCoachByPlayer[player.id]) && allSquadsComplete(next.players)) return startRoomCardStage(next);
  return next;
}

export function startRoomCardStage(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "coach" || !allSquadsComplete(normalized.players)) return normalized;
  if (!normalized.players.every((player) => normalized.selectedCoachByPlayer[player.id])) return normalized;

  const cardOptionsByPlayer = Object.fromEntries(
    normalized.players.map((player) => [player.id, [drawSecretCardOptions(`${normalized.id}-${player.id}-secret-cards`)[0]!]])
  );
  const selectedCardByPlayer = Object.fromEntries(
    normalized.players.map((player) => [player.id, cardOptionsByPlayer[player.id]![0]!])
  );
  return normalizeRoom({
    ...normalized,
    status: "cards",
    cardOptionsByPlayer,
    selectedCardByPlayer,
    cardActivationByPlayer: {},
    players: normalized.players.map((player) => ({ ...player, ready: false }))
  });
}

export function chooseRoomSecretCard(room: FriendRoom, playerId: string, cardId: RoomSecretCardId) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "cards") return normalized;
  if (normalized.players.find((player) => player.id === playerId)?.ready) return normalized;
  if (normalized.selectedCardByPlayer[playerId] !== cardId) return normalized;

  const next = normalizeRoom({
    ...normalized,
    players: normalized.players.map((player) => (player.id === playerId ? { ...player, ready: true } : player))
  });
  return resolveRoomSecretCardStage(next);
}

export function resolveRoomSecretCardStage(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "cards") return normalized;
  return normalized.players.length > 0 && normalized.players.every((player) => player.ready && normalized.selectedCardByPlayer[player.id])
    ? createInitialRoomBracket(normalized)
    : normalized;
}

export function chooseSimultaneousPick(room: FriendRoom, playerId: string, pickId?: string) {
  if (pickId) return selectRoomPlayer(room, playerId, pickId);
  return autoPickRoomPlayer(room, playerId);
}

export function chooseTurnPick(room: FriendRoom, pickId?: string) {
  const player = room.players[room.turnIndex];
  if (!player) return room;
  if (pickId) return selectRoomPlayer(room, player.id, pickId);
  return autoPickRoomTurn(room);
}

export function chooseTurnPickForPlayer(room: FriendRoom, playerId: string, pickId?: string) {
  const player = room.players[room.turnIndex];
  if (!player || player.id !== playerId) return room;
  return chooseTurnPick(room, pickId);
}

export function setRoomPlayerReady(room: FriendRoom, playerId: string, ready: boolean) {
  if (room.status !== "lobby") return room;
  return {
    ...room,
    players: room.players.map((player) => (player.id === playerId ? { ...normalizePlayer(player), ready } : normalizePlayer(player)))
  };
}

export function updateRoomPlayerSetup(room: FriendRoom, playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) {
  if (room.status !== "lobby") return room;
  return {
    ...room,
    players: room.players.map((player) =>
      player.id === playerId
        ? (() => {
            const normalized = normalizePlayer(player);
            const formation = setup.formation ?? normalized.formation ?? defaultFormation;
            const tacticalStyle = setup.tacticalStyle ?? normalized.tacticalStyle ?? defaultTacticalStyle;
            const preparationChanged = formation !== normalized.formation || tacticalStyle !== normalized.tacticalStyle;
            return {
              ...normalized,
              formation,
              tacticalStyle,
              ready: preparationChanged ? false : normalized.ready
            };
          })()
        : normalizePlayer(player)
    )
  };
}

export function updateRoomSettings(room: FriendRoom, settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) {
  if (room.status !== "lobby") return room;
  const visibility = settings.visibility ?? room.visibility;
  return normalizeRoom({
    ...room,
    ...settings,
    name: settings.name?.trim() || room.name,
    visibility,
    password: visibility === "privada" ? settings.password?.trim() ?? room.password : undefined,
    players: room.players.map((player) => ({ ...player, ready: false }))
  });
}

export function resetRoomToLobby(room: FriendRoom) {
  return normalizeRoom({
    ...room,
    status: "lobby",
    draftCycle: room.draftCycle + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: room.players.filter((player) => !player.isBot).map((player) => ({ ...normalizePlayer(player), squad: [], ready: false })),
    turnIndex: 0,
    turnOptions: [],
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    rerollsByPlayer: {},
    picksInTurn: 0,
    turnStartedAt: undefined,
    draftEndsAt: undefined,
    reviewEndsAt: undefined,
    reviewSwapUsedByPlayer: {},
    penaltyStartedAt: undefined,
    penaltyEndsAt: undefined,
    penaltyRound: 0,
    penaltyEligiblePlayerIds: [],
    penaltyShotsByPlayer: {},
    penaltyWinnerId: undefined,
    legendOptions: [],
    legendSelectedId: undefined,
    coachOptionsByPlayer: {},
    selectedCoachByPlayer: {},
    cardOptionsByPlayer: {},
    selectedCardByPlayer: {},
    cardActivationByPlayer: {},
    completedRoundByPlayer: {},
    bracket: [],
    bracketRound: 0,
    champion: undefined
  });
}

export function addRoomBot(room: FriendRoom) {
  return normalizeRoom(room);
}

export function joinRoom(room: FriendRoom, userName: string, teamName: string, emblemId?: string) {
  if (room.status !== "lobby") return room;
  if (room.players.some((player) => player.userName.toLowerCase() === userName.trim().toLowerCase())) return room;
  const player = createRoomPlayer(userName, teamName, false, emblemId);
  return {
    ...room,
    updatedAt: new Date().toISOString(),
    lastSeenAt: { ...(room.lastSeenAt ?? {}), [player.id]: Date.now() },
    players: [...room.players.filter((item) => !item.isBot), player].slice(0, maxEntrants)
  };
}

export function touchRoomPlayer(room: FriendRoom, playerId: string) {
  if (!room.players.some((player) => player.id === playerId && !player.isBot)) return room;
  return normalizeRoom({
    ...room,
    updatedAt: new Date().toISOString(),
    lastSeenAt: {
      ...(room.lastSeenAt ?? {}),
      [playerId]: Date.now()
    }
  });
}

export function draftOptions(seed: string, existing: RoomPick[], count = 3) {
  const rng = createRng(seed);
  const used = new Set(existing.map((pick) => pick.canonicalPlayerId ?? pick.id));
  const pool = players.filter((player) => player.isActive && !used.has(player.id));
  const options: RoomPick[] = [];
  while (options.length < count && pool.length) {
    const player = pool.splice(rng.int(0, pool.length - 1), 1)[0]!;
    const season = clubSeasons.find((item) => item.id === player.clubSeasonId);
    if (season) options.push(toRoomPick(player, season));
  }
  return options;
}

function completeSquad(current: RoomPick[], seed: string, rng = createRng(seed)) {
  const seedPlayer = createRoomPlayer("Auto", "Auto FC");
  let squad = current.map(normalizePick).filter((pick) => pick.slotId);
  const player = { ...seedPlayer, squad };
  const slots = getFormationSlots(defaultFormation, defaultTacticalStyle);
  for (const slot of slots) {
    if (squad.some((pick) => pick.slotId === slot.id)) continue;
    const options = draftOptions(`${seed}-${slot.id}-${rng.int(0, 9999)}`, squad, Math.min(players.length, 120));
    const pick = options.find((option) => canPlaceRoomPick(option, slot.position));
    if (!pick) continue;
    const placed = assignPickToSlot(pick, { ...player, squad }, slot.id);
    if (placed) squad = [...squad, placed];
  }
  return squad.slice(0, 11);
}

function nextDraftTurnIndex(roomPlayers: RoomPlayer[], current: number) {
  const target = roomPlayers.some((player) => player.squad.length >= 11)
    ? 11
    : roomPlayers.some((player) => player.squad.length < 9)
      ? 9
      : 10;
  for (let step = 1; step <= roomPlayers.length; step++) {
    const index = (current + step) % roomPlayers.length;
    if (roomPlayers[index]!.squad.length < target) return index;
  }
  return current;
}

function draftSquadTarget(room: FriendRoom) {
  return room.penaltyWinnerId ? 11 : 10;
}

function draftPlayerFor(room: FriendRoom, playerId: string) {
  if (room.draftMode === "todos") return room.players.find((player) => player.id === playerId);
  const active = room.players[room.turnIndex];
  return active?.id === playerId ? active : undefined;
}

function playerDrawFor(room: FriendRoom, playerId: string) {
  return room.draftMode === "todos" ? room.currentDrawByPlayer?.[playerId] : room.currentDraw;
}

function buildRoomDraw(seed: string, targetPlayer: RoomPlayer): RoomDraw {
  const rng = createRng(seed);
  const usedPlayers = new Set(targetPlayer.squad.map((pick) => pick.canonicalPlayerId));
  const openSlots = getFormationSlots(targetPlayer.formation, targetPlayer.tacticalStyle).filter((slot) => !targetPlayer.squad.some((pick) => pick.slotId === slot.id));
  const hasEligiblePlayer = (seasonId: string) =>
    players.some(
      (player) =>
        player.clubSeasonId === seasonId &&
        player.isActive &&
        !usedPlayers.has(player.canonicalPlayerId) &&
        openSlots.some((slot) => canPlaceRoomPick(toRoomPick(player), slot.position))
    );
  const seasons = shuffle(
    clubSeasons.filter((season) => season.isActive && hasEligiblePlayer(season.id)),
    rng
  );
  const season = seasons[0] ?? clubSeasons[0]!;
  const roster = players
    .filter((player) => player.clubSeasonId === season.id && player.isActive)
    .sort((a, b) => positionOrder(a.primaryPosition) - positionOrder(b.primaryPosition) || (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99))
    .map((player) => toRoomPick(player, season));
  return {
    clubSeasonId: season.id,
    clubId: season.clubId,
    clubName: season.clubName,
    shortName: season.shortName,
    season: season.season,
    country: season.country,
    primaryColor: season.primaryColor,
    secondaryColor: season.secondaryColor,
    genericBadgeShape: season.genericBadgeShape,
    rarity: season.rarity,
    roster
  };
}

function toRoomPick(player: (typeof players)[number], season = clubSeasons.find((item) => item.id === player.clubSeasonId)): RoomPick {
  return {
    id: player.id,
    canonicalPlayerId: player.canonicalPlayerId,
    name: player.name,
    nationality: player.nationality,
    clubName: season?.clubName ?? "Clube historico",
    clubSeasonId: player.clubSeasonId,
    season: season?.season ?? "",
    position: player.primaryPosition,
    overall: player.overall,
    shirtNumber: player.shirtNumber
  };
}

function toRoomCoach(coach: Coach): RoomCoach {
  return {
    id: coach.id,
    name: coach.name,
    nationality: coach.nationality,
    clubSeasonId: coach.clubSeasonId,
    clubName: coach.clubName,
    season: coach.season,
    style: coach.style,
    rating: coach.rating,
    description: coach.description
  };
}

function assignPickToSlot(pick: RoomPick, player: RoomPlayer, slotId: string) {
  const slot = getFormationSlots(player.formation, player.tacticalStyle).find((item) => item.id === slotId);
  const sourcePlayer = findRoomSourcePlayer(pick);
  if (!slot || !sourcePlayer) return undefined;
  const fit = calculatePositionFit(sourcePlayer, slot.position);
  if (!fit.allowed) return undefined;
  return {
    ...pick,
    slotId: slot.id,
    slotLabel: slot.label,
    slotPosition: slot.position,
    effectiveRating: fit.effectiveRating
  };
}

function applyRoomCoachNationalityBonus(player: RoomPlayer, coach: Pick<Coach, "nationality">) {
  return {
    ...player,
    squad: player.squad.map((pick) => {
      const sourcePlayer = findRoomSourcePlayer(pick);
      const baseRating =
        sourcePlayer && pick.slotPosition
          ? calculatePositionFit(sourcePlayer, pick.slotPosition).effectiveRating
          : pick.effectiveRating ?? pick.overall;
      return {
        ...pick,
        effectiveRating: ratingWithCoachNationalityBonus(
          baseRating,
          pick.nationality ?? sourcePlayer?.nationality,
          coach.nationality
        )
      };
    })
  };
}

function findRoomSourcePlayer(pick: Pick<RoomPick, "id" | "canonicalPlayerId" | "clubSeasonId">) {
  return (
    players.find((item) => item.id === pick.id) ??
    players.find((item) => item.canonicalPlayerId === pick.canonicalPlayerId && item.clubSeasonId === pick.clubSeasonId) ??
    players.find((item) => item.canonicalPlayerId === pick.canonicalPlayerId)
  );
}

function hasAvailableRoomSlot(player: RoomPlayer, pick: RoomPick) {
  return getFormationSlots(player.formation, player.tacticalStyle).some((slot) => !player.squad.some((item) => item.slotId === slot.id) && canPlaceRoomPick(pick, slot.position));
}

function canPlaceRoomPick(pick: RoomPick, position: Position) {
  const sourcePlayer = findRoomSourcePlayer(pick);
  return sourcePlayer ? calculatePositionFit(sourcePlayer, position).allowed : positionGroup(pick.position) === positionGroup(position);
}

function positionOrder(position: Position) {
  const order: Position[] = ["GK", "RB", "RWB", "CB", "LB", "LWB", "DM", "CM", "MEI", "RM", "LM", "RW", "LW", "CF", "ST"];
  return order.indexOf(position);
}

function positionGroup(position: Position | string) {
  if (position === "GK") return "gk";
  if (["RB", "RWB", "CB", "LB", "LWB"].includes(position)) return "def";
  if (["DM", "CM", "MEI", "RM", "LM"].includes(position)) return "mid";
  return "atk";
}

function drawSecretCardOptions(seed: string) {
  const rng = createRng(seed);
  const pool = [...roomSecretCards];
  const selected: RoomSecretCardId[] = [];
  while (selected.length < 3 && pool.length) {
    const totalWeight = pool.reduce((sum, card) => sum + card.weight, 0);
    let cursor = rng.next() * totalWeight;
    let selectedIndex = 0;
    for (let index = 0; index < pool.length; index += 1) {
      cursor -= pool[index]!.weight;
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }
    selected.push(pool.splice(selectedIndex, 1)[0]!.id);
  }
  return selected;
}

export function roomSecretCard(cardId?: RoomSecretCardId) {
  return roomSecretCards.find((card) => card.id === cardId);
}

export function roomCardSpecialOptions(room: FriendRoom, playerId: string, cardId: RoomSecretCardId, targetPickId?: string) {
  const normalized = normalizeRoom(room);
  const player = normalized.players.find((item) => item.id === playerId);
  const target = player?.squad.find((pick) => pick.id === targetPickId || pick.slotId === targetPickId);
  if (!player || !target) return [];
  const targetPosition = target.slotPosition ?? target.position;

  if (cardId === "historic-swap") {
    const match = currentPlayerRoomMatch(normalized, playerId);
    if (!match) return [];
    const opponentId = match.homePlayerId === playerId ? match.awayPlayerId : match.homePlayerId;
    const opponent = opponentId ? normalized.players.find((item) => item.id === opponentId) : undefined;
    if (opponent) {
      return opponent.squad.filter((pick) => (pick.slotPosition ?? pick.position) === targetPosition);
    }
    const opponentName = match.homePlayerId === playerId ? match.awayName : match.homeName;
    const opponentSeason = clubSeasons.find((season) => teamSeasonLabel(season.clubName, season.season) === opponentName);
    return players
      .filter((candidate) => candidate.isActive && candidate.clubSeasonId === opponentSeason?.id && candidate.primaryPosition === targetPosition)
      .map((candidate) => toRoomPick(candidate, opponentSeason));
  }

  if (cardId !== "loaned-star" && cardId !== "luxury-bench") return [];
  const usedPlayers = new Set(normalized.players.flatMap((item) => item.squad.map((pick) => pick.canonicalPlayerId)));
  const rng = createRng(`${normalized.id}-${playerId}-${cardId}-${target.id}`);
  return shuffle(
    players.filter((candidate) => candidate.isActive && !usedPlayers.has(candidate.canonicalPlayerId) && canPlaceRoomPick(toRoomPick(candidate), targetPosition)),
    rng
  )
    .slice(0, 3)
    .map((candidate, index) => {
      const pick = toRoomPick(candidate);
      const boostedOverall = cardId === "loaned-star" ? 99 : 93 + ((stableCardNumber(`${normalized.id}-${candidate.id}-${index}`) + index) % 5);
      return { ...pick, overall: boostedOverall, effectiveRating: boostedOverall };
    });
}

export function activateRoomSecretCard(room: FriendRoom, playerId: string, input: ActivateRoomCardInput = {}) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket" || normalized.cardActivationByPlayer[playerId]) return normalized;
  const cardId = normalized.selectedCardByPlayer[playerId];
  const card = roomSecretCard(cardId);
  const player = normalized.players.find((item) => item.id === playerId);
  const match = currentPlayerRoomMatch(normalized, playerId);
  if (!cardId || !card || !player || !match || match.status !== "pending") return normalized;

  const isHome = match.homePlayerId === playerId;
  const target = player.squad.find((pick) => pick.id === input.targetPickId || pick.slotId === input.targetPickId);
  const activation: RoomCardActivation = { cardId, matchId: match.id, usedAt: Date.now(), targetPickId: target?.id };
  let playersAfter = normalized.players;
  let homeStrength = match.homeStrength ?? roomPlayerStrength(normalized, player);
  let awayStrength = match.awayStrength ?? roomPlayerStrength(normalized, player);
  let homeBonusGoals = match.homeBonusGoals ?? 0;
  let awayBonusGoals = match.awayBonusGoals ?? 0;
  let eventMinute = 1;
  let eventText = `${player.teamName} ativou ${card.name}.`;
  let eventScored = false;

  const addMatchStrength = (value: number) => {
    if (isHome) homeStrength += value;
    else awayStrength += value;
  };
  const updateOwnSquad = (mapPick: (pick: RoomPick) => RoomPick) => {
    playersAfter = playersAfter.map((item) => (item.id === playerId ? { ...item, squad: item.squad.map(mapPick) } : item));
  };

  if (cardId === "collective-boost") {
    updateOwnSquad((pick) => ({ ...pick, effectiveRating: (pick.effectiveRating ?? pick.overall) + 2 }));
  } else if (cardId === "perfect-night") {
    addMatchStrength(5);
  } else if (cardId === "inspired-captain") {
    if (!target) return normalized;
    updateOwnSquad((pick) => (pick.id === target.id ? { ...pick, effectiveRating: (pick.effectiveRating ?? pick.overall) + 8 } : pick));
    eventText = `${target.name} foi escolhido como Capitao inspirado.`;
  } else if (cardId === "wall") {
    const goalkeeperCount = player.squad.filter((pick) => (pick.slotPosition ?? pick.position) === "GK").length;
    const defenderCount = player.squad.filter((pick) => positionGroup(pick.slotPosition ?? pick.position) === "def").length;
    addMatchStrength((goalkeeperCount * 7 + defenderCount * 3) / Math.max(1, player.squad.length));
  } else if (cardId === "stored-penalty") {
    eventMinute = 68;
    const penaltyScored = createRng(`${normalized.id}-${match.id}-${playerId}-stored-penalty`).next() < 0.68;
    activation.penaltyScored = penaltyScored;
    eventScored = penaltyScored;
    eventText = penaltyScored ? `Penalti guardado convertido pelo ${player.teamName}.` : `Penalti guardado defendido contra o ${player.teamName}.`;
    if (penaltyScored) {
      if (isHome) homeBonusGoals += 1;
      else awayBonusGoals += 1;
    }
  } else if (cardId === "historic-swap") {
    if (!target || !input.opponentPickId) return normalized;
    const options = roomCardSpecialOptions(normalized, playerId, cardId, target.id);
    const opponentPick = options.find((pick) => pick.id === input.opponentPickId);
    if (!opponentPick || (opponentPick.slotPosition ?? opponentPick.position) !== (target.slotPosition ?? target.position)) return normalized;
    const incomingForPlayer = copyPickIntoSlot(opponentPick, target);
    const opponentId = isHome ? match.awayPlayerId : match.homePlayerId;
    const opponent = opponentId ? normalized.players.find((item) => item.id === opponentId) : undefined;
    playersAfter = playersAfter.map((item) => {
      if (item.id === playerId) return { ...item, squad: item.squad.map((pick) => (pick.id === target.id ? incomingForPlayer : pick)) };
      if (opponent && item.id === opponent.id) {
        const outgoing = opponent.squad.find((pick) => pick.id === opponentPick.id);
        return outgoing ? { ...item, squad: item.squad.map((pick) => (pick.id === outgoing.id ? copyPickIntoSlot(target, outgoing) : pick)) } : item;
      }
      return item;
    });
    activation.opponentPickId = opponentPick.id;
    activation.specialPick = opponentPick;
    eventText = `${player.teamName} trocou ${target.name} por ${opponentPick.name}.`;
  } else if (cardId === "loaned-star" || cardId === "luxury-bench") {
    if (!target || !input.specialPickId) return normalized;
    const specialPick = roomCardSpecialOptions(normalized, playerId, cardId, target.id).find((pick) => pick.id === input.specialPickId);
    if (!specialPick) return normalized;
    activation.specialPick = specialPick;
    eventMinute = cardId === "luxury-bench" ? 46 : 1;
    addMatchStrength(((specialPick.effectiveRating ?? specialPick.overall) - (target.effectiveRating ?? target.overall)) / Math.max(1, player.squad.length));
    eventText = `${specialPick.name} entrou no lugar de ${target.name} pelo ${player.teamName}.`;
  }

  const roomWithPlayers = { ...normalized, players: playersAfter };
  const updatedPlayer = playersAfter.find((item) => item.id === playerId)!;
  if (["collective-boost", "inspired-captain", "historic-swap"].includes(cardId)) {
    const recalculated = roomPlayerStrength(roomWithPlayers, updatedPlayer);
    if (isHome) homeStrength = recalculated;
    else awayStrength = recalculated;
    const opponentId = isHome ? match.awayPlayerId : match.homePlayerId;
    const updatedOpponent = playersAfter.find((item) => item.id === opponentId);
    if (updatedOpponent) {
      if (isHome) awayStrength = roomPlayerStrength(roomWithPlayers, updatedOpponent);
      else homeStrength = roomPlayerStrength(roomWithPlayers, updatedOpponent);
    }
  }

  const cardEvent: RoomCardEvent = {
    id: `card-${playerId}-${cardId}`,
    playerId,
    cardId,
    minute: eventMinute,
    text: eventText,
    side: eventScored ? (isHome ? "home" : "away") : undefined,
    scored: eventScored
  };
  return normalizeRoom({
    ...roomWithPlayers,
    cardActivationByPlayer: { ...normalized.cardActivationByPlayer, [playerId]: activation },
    bracket: normalized.bracket.map((item) =>
      item.id === match.id
        ? {
            ...item,
            homeStrength,
            awayStrength,
            homeBonusGoals,
            awayBonusGoals,
            cardEvents: [...(item.cardEvents ?? []), cardEvent]
          }
        : item
    )
  });
}

function copyPickIntoSlot(source: RoomPick, target: RoomPick): RoomPick {
  return {
    ...source,
    slotId: target.slotId,
    slotLabel: target.slotLabel,
    slotPosition: target.slotPosition,
    effectiveRating: source.effectiveRating ?? source.overall
  };
}

function stableCardNumber(value: string) {
  return value.split("").reduce((sum, char) => (sum * 33 + char.charCodeAt(0)) % 104729, 19);
}

type RoomEntrant = {
  name: string;
  playerId?: string;
  strength?: number;
  style?: TacticalStyle;
};

export function playPlayerRoomMatch(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return normalized;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  const match = normalized.bracket.find((item) => item.phase === phase && (item.homePlayerId === playerId || item.awayPlayerId === playerId));
  if (!match) return normalized;
  if (normalized.completedRoundByPlayer[playerId] === normalized.bracketRound) return normalized;
  const completedRoundByPlayer = { ...normalized.completedRoundByPlayer };
  completedRoundByPlayer[playerId] = normalized.bracketRound;
  const resolvedRoom = match.status === "done"
    ? { ...normalized, completedRoundByPlayer }
    : simulateRoomMatch({ ...normalized, completedRoundByPlayer }, match.id, roomHumanMatchSeed(normalized, match));
  return resolveRoomRoundIfReady(resolvedRoom, true);
}

export function previewPlayerRoomMatch(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return undefined;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  if (normalized.completedRoundByPlayer[playerId] === normalized.bracketRound) return undefined;
  const match = normalized.bracket.find((item) => item.phase === phase && (item.homePlayerId === playerId || item.awayPlayerId === playerId));
  if (!match) return undefined;
  return match.status === "done" ? match : simulateSingleRoomMatch(match, roomHumanMatchSeed(normalized, match));
}

export function progressRoomRound(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return normalized;
  return resolveRoomRoundIfReady(normalized, true);
}

export function currentPlayerRoomMatch(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return undefined;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  if (normalized.completedRoundByPlayer[playerId] === normalized.bracketRound) return undefined;
  return normalized.bracket.find((item) => item.phase === phase && (item.homePlayerId === playerId || item.awayPlayerId === playerId));
}

export function hasPendingHumanRoomMatches(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return false;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  return normalized.bracket.some((match) => match.phase === phase && [match.homePlayerId, match.awayPlayerId]
    .filter((id): id is string => Boolean(id))
    .some((id) => normalized.completedRoundByPlayer[id] !== normalized.bracketRound));
}

function createInitialRoomBracket(room: FriendRoom): FriendRoom {
  const realPlayers = room.players.filter((player) => !player.isBot).slice(0, maxEntrants).map(normalizePlayer);
  if (!allSquadsComplete(realPlayers)) {
    return normalizeRoom({
      ...room,
      status: "drafting",
      players: realPlayers,
      bracket: [],
      bracketRound: 0,
      champion: undefined
    });
  }
  const rng = createRng(`${room.id}-${room.draftCycle}-bracket-${realPlayers.map((player) => player.teamName).join("|")}`);
  const entrants: RoomEntrant[] = uniqueNames(realPlayers.map((player) => player.teamName)).map((teamName) => {
    const player = realPlayers.find((item) => sameName(item.teamName, teamName));
    return { name: teamName, playerId: player?.id, strength: player ? roomPlayerStrength(room, player) : undefined, style: player?.tacticalStyle };
  });
  for (const historicTeam of randomHistoricTeams(`${room.id}-${room.draftCycle}`)) {
    if (entrants.length >= maxEntrants) break;
    if (!entrants.some((entrant) => sameName(entrant.name, historicTeam.name))) entrants.push(historicTeam);
  }
  while (entrants.length < maxEntrants) entrants.push({ name: `Convidado ${entrants.length + 1}`, strength: 76 });
  const shuffledEntrants = shuffle(entrants, rng);

  return {
    ...room,
    status: "bracket",
    players: realPlayers,
    bracket: createRoundMatches(phases[0]!, shuffledEntrants, 0),
    bracketRound: 0,
    champion: undefined
  };
}

function resolveRoomRoundIfReady(room: FriendRoom, forceBotRound = false): FriendRoom {
  const phase = phases[room.bracketRound] ?? phases[0]!;
  const currentMatches = room.bracket.filter((match) => match.phase === phase);
  if (!currentMatches.length) return room;
  const completedRoundByPlayer = { ...room.completedRoundByPlayer };
  const pendingHumanMatch = currentMatches.some((match) => {
    const participantIds = [match.homePlayerId, match.awayPlayerId].filter((id): id is string => Boolean(id));
    return participantIds.some((id) => completedRoundByPlayer[id] !== room.bracketRound);
  });
  if (pendingHumanMatch) return room;
  if (!forceBotRound && currentMatches.some((match) => match.status === "pending")) return room;

  let nextRoom = { ...room, completedRoundByPlayer };
  for (const match of currentMatches) {
    if (match.status === "pending") {
      const seed = match.homePlayerId || match.awayPlayerId
        ? roomHumanMatchSeed(room, match)
        : `${room.id}-${match.id}-bot`;
      nextRoom = simulateRoomMatch(nextRoom, match.id, seed);
    }
  }

  const resolvedMatches = nextRoom.bracket.filter((match) => match.phase === phase);
  if (!resolvedMatches.every((match) => match.status === "done" && match.winnerName)) return nextRoom;

  if (phase === phases.at(-1)) {
    return {
      ...nextRoom,
      status: "finished",
      champion: resolvedMatches[0]?.winnerName
    };
  }

  const nextPhaseIndex = Math.min(nextRoom.bracketRound + 1, phases.length - 1);
  const nextPhase = phases[nextPhaseIndex]!;
  const winners = resolvedMatches.map((match) => winnerEntrant(match, nextRoom));
  return {
    ...nextRoom,
    bracketRound: nextPhaseIndex,
    bracket: [...nextRoom.bracket, ...createRoundMatches(nextPhase, winners, nextPhaseIndex)]
  };
}

function roomHumanMatchSeed(room: FriendRoom, match: RoomMatch) {
  return `${room.id}-${room.draftCycle}-${match.id}-human`;
}

function createRoundMatches(phase: string, entrants: RoomEntrant[], roundIndex: number) {
  const matches: RoomMatch[] = [];
  for (let index = 0; index < entrants.length; index += 2) {
    const home = entrants[index]!;
    const away = entrants[index + 1]!;
    matches.push({
      id: `${roundIndex}-${index / 2}-${home.name}-${away.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      phase,
      homeName: home.name,
      awayName: away.name,
      homePlayerId: home.playerId,
      awayPlayerId: away.playerId,
      homeStrength: home.strength,
      awayStrength: away.strength,
      homeStyle: home.style ?? inferredOpponentStyle(home.name),
      awayStyle: away.style ?? inferredOpponentStyle(away.name),
      status: "pending"
    });
  }
  return matches;
}

function simulateRoomMatch(room: FriendRoom, matchId: string, seed: string) {
  return {
    ...room,
    bracket: room.bracket.map((match) => {
      if (match.id !== matchId || match.status === "done") return match;
      return simulateSingleRoomMatch(match, seed);
    })
  };
}

function simulateSingleRoomMatch(match: RoomMatch, seed: string): RoomMatch {
  const rng = createRng(seed);
  const homeStrength = match.homeStrength ?? (match.homePlayerId ? 84 : 80);
  const awayStrength = match.awayStrength ?? (match.awayPlayerId ? 84 : 80);
  const homeStyle = match.homeStyle ?? inferredOpponentStyle(match.homeName);
  const awayStyle = match.awayStyle ?? inferredOpponentStyle(match.awayName);
  const tactical = tacticalMatchup(homeStyle, awayStyle);
  const homeAdvantage = 1.5;
  const effectiveHomeStrength = homeStrength + homeAdvantage + tactical.adjustment;
  const effectiveAwayStrength = awayStrength;
  const strengthGap = effectiveHomeStrength - effectiveAwayStrength;
  const homeExpected = expectedGoals(effectiveHomeStrength, effectiveAwayStrength);
  const awayExpected = expectedGoals(effectiveAwayStrength, effectiveHomeStrength);
  let homeGoals = roomPoisson(rng, homeExpected);
  let awayGoals = roomPoisson(rng, awayExpected);
  homeGoals += match.homeBonusGoals ?? 0;
  awayGoals += match.awayBonusGoals ?? 0;
  ({ homeGoals, awayGoals } = protectRoomFavorite(homeGoals, awayGoals, strengthGap));
  if (homeGoals === awayGoals) {
    const homeTieBreakChance = Math.max(0.18, Math.min(0.82, 0.5 + ((homeStrength + homeAdvantage) - awayStrength) / 55));
    if (rng.next() < homeTieBreakChance) homeGoals += 1;
    else awayGoals += 1;
  }
  return {
    ...match,
    homeStrength: Math.round(homeStrength * 10) / 10,
    awayStrength: Math.round(awayStrength * 10) / 10,
    homeStyle,
    awayStyle,
    homeGoals,
    awayGoals,
    winnerName: homeGoals > awayGoals ? match.homeName : match.awayName,
    status: "done" as const
  };
}

function winnerEntrant(match: RoomMatch, room: FriendRoom): RoomEntrant {
  if (match.winnerName === match.homeName) {
    const player = room.players.find((item) => item.id === match.homePlayerId);
    return { name: match.homeName, playerId: match.homePlayerId, strength: player ? roomPlayerStrength(room, player) : match.homeStrength, style: match.homeStyle };
  }
  const player = room.players.find((item) => item.id === match.awayPlayerId);
  return { name: match.awayName, playerId: match.awayPlayerId, strength: player ? roomPlayerStrength(room, player) : match.awayStrength, style: match.awayStyle };
}

function randomHistoricTeams(seed: string) {
  const seen = new Set<string>();
  const entrants = clubSeasons
    .map((season) => ({
      name: teamSeasonLabel(season.clubName, season.season),
      strength: historicSeasonStrength(season.id),
      style: inferredOpponentStyle(season.id)
    }))
    .filter((entrant) => {
      if (seen.has(entrant.name)) return false;
      seen.add(entrant.name);
      return true;
    });
  return shuffle(entrants, createRng(`${seed}-historic-teams`));
}

function expectedGoals(attackStrength: number, defenseStrength: number) {
  const gap = attackStrength - defenseStrength;
  return Math.max(0.35, Math.min(3.25, 1.35 + gap / 22));
}

function protectRoomFavorite(homeGoals: number, awayGoals: number, strengthGap: number) {
  if (strengthGap >= 18 && homeGoals <= awayGoals) return { homeGoals: awayGoals + 1, awayGoals };
  if (strengthGap >= 14 && homeGoals < awayGoals) return { homeGoals: awayGoals, awayGoals };
  if (strengthGap <= -18 && awayGoals <= homeGoals) return { homeGoals, awayGoals: homeGoals + 1 };
  if (strengthGap <= -14 && awayGoals < homeGoals) return { homeGoals, awayGoals: homeGoals };
  return { homeGoals, awayGoals };
}

function roomPoisson(rng: ReturnType<typeof createRng>, lambda: number) {
  const cap = Math.max(0.25, Math.min(3.4, lambda));
  const limit = Math.exp(-cap);
  let product = 1;
  let goals = 0;
  do {
    goals += 1;
    product *= rng.next();
  } while (product > limit);
  return goals - 1;
}

function roomPlayerStrength(room: FriendRoom, player: RoomPlayer) {
  const squadRating = player.squad.length
    ? player.squad.reduce((sum, pick) => sum + (pick.effectiveRating ?? pick.overall), 0) / player.squad.length
    : 78;
  const coachId = room.selectedCoachByPlayer[player.id];
  const coach = coachId ? coaches.find((item) => item.id === coachId) : undefined;
  const coachBonus = coach ? (coach.rating - 82) * 0.16 : 0;
  return Math.max(65, Math.min(110, squadRating + coachBonus));
}

function historicSeasonStrength(clubSeasonId: string) {
  const season = clubSeasons.find((item) => item.id === clubSeasonId);
  const roster = players.filter((player) => player.clubSeasonId === clubSeasonId && player.isActive);
  const rosterRating = roster.length ? roster.reduce((sum, player) => sum + player.overall, 0) / roster.length : 78;
  const stageBonus = season?.wasChampion ? 2.2 : season?.competitionStage.toLowerCase().includes("final") ? 1.3 : 0;
  const rarityBonus = season?.rarity === "lendaria" ? 1.2 : season?.rarity === "epica" ? 0.6 : 0;
  return Math.max(65, Math.min(99, rosterRating + stageBonus + rarityBonus));
}

function teamSeasonLabel(name: string, season: string) {
  const years = season.match(/^(\d{4})\/(\d{2})$/);
  return years ? `${name} ${years[1].slice(2)}/${years[2]}` : name;
}

function shuffle<T>(items: T[], rng = createRng("shuffle")) {
  return [...items].sort(() => rng.next() - 0.5);
}

function normalizeRoom(room: FriendRoom): FriendRoom {
  return normalizeFriendRoom(room);
}

export function normalizeFriendRoom(room: FriendRoom): FriendRoom {
  const players = (Array.isArray(room.players) ? room.players : []).filter((player) => !player.isBot).slice(0, maxEntrants).map(normalizePlayer);
  const rawStatus = ["lobby", "drafting", "challenge", "reviewing", "coach", "cards", "bracket", "finished"].includes(room.status) ? room.status : "lobby";
  const invalidChallenge = rawStatus === "challenge" && !players.every((player) => player.squad.length >= 10);
  const invalidPostDraft = ["reviewing", "coach", "cards", "bracket", "finished"].includes(rawStatus) && !allSquadsComplete(players);
  const status = invalidChallenge || invalidPostDraft ? "drafting" : rawStatus;
  const bracket = invalidPostDraft ? [] : (Array.isArray(room.bracket) ? room.bracket : []).map(normalizeMatch);
  const maxRound = Math.max(0, phases.length - 1);
  return {
    ...room,
    id: room.id || `sala-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: room.name?.trim() || "Final de Copa",
    hostName: room.hostName?.trim() || players[0]?.userName || "Jogador",
    visibility: room.visibility === "privada" ? "privada" : "publica",
    difficulty: room.difficulty === "almanaque" ? "almanaque" : "classico",
    draftMode: room.draftMode === "todos" ? "todos" : "turnos",
    simultaneousMinutes: room.simultaneousMinutes === 4 || room.simultaneousMinutes === 6 ? room.simultaneousMinutes : 2,
    turnSeconds: room.turnSeconds === 20 || room.turnSeconds === 45 ? room.turnSeconds : 30,
    status,
    createdAt: room.createdAt || new Date().toISOString(),
    updatedAt: room.updatedAt || room.createdAt || new Date().toISOString(),
    revision: Math.max(0, Number.isFinite(room.revision) ? room.revision : 0),
    draftCycle: Math.max(0, Number.isFinite(room.draftCycle) ? room.draftCycle : 0),
    processedActionIds: Array.from(new Set((room.processedActionIds ?? []).filter((value) => typeof value === "string" && value.length > 0))).slice(-80),
    lastSeenAt: normalizePresenceMap(room.lastSeenAt, players),
    players,
    turnIndex: Math.min(room.turnIndex ?? 0, Math.max(0, players.length - 1)),
    turnOptions: (room.turnOptions ?? []).map(normalizePick),
    currentDraw: normalizeDraw(room.currentDraw),
    currentDrawByPlayer: normalizeDrawMap(room.currentDrawByPlayer, players),
    pendingPickId: room.pendingPickId,
    pendingPickByPlayer: normalizePendingPickMap(room.pendingPickByPlayer, players),
    rerollsByPlayer: normalizeRerollMap(room.rerollsByPlayer, players),
    picksInTurn: Math.max(0, room.picksInTurn ?? 0),
    turnStartedAt: room.turnStartedAt,
    draftEndsAt: room.draftEndsAt,
    reviewEndsAt: room.reviewEndsAt,
    reviewSwapUsedByPlayer: normalizeReviewSwapMap(room.reviewSwapUsedByPlayer, players),
    penaltyStartedAt: room.penaltyStartedAt,
    penaltyEndsAt: room.penaltyEndsAt,
    penaltyRound: Math.max(0, Math.min(penaltySuddenDeathRounds, room.penaltyRound ?? 0)),
    penaltyEligiblePlayerIds: (room.penaltyEligiblePlayerIds ?? []).filter((playerId) => players.some((player) => player.id === playerId)),
    penaltyShotsByPlayer: normalizePenaltyShotsMap(room.penaltyShotsByPlayer, players),
    penaltyWinnerId: players.some((player) => player.id === room.penaltyWinnerId) ? room.penaltyWinnerId : undefined,
    legendOptions: (room.legendOptions ?? []).map(normalizePick).slice(0, 5),
    legendSelectedId: room.legendSelectedId,
    coachOptionsByPlayer: normalizeCoachMap(room.coachOptionsByPlayer),
    selectedCoachByPlayer: room.selectedCoachByPlayer ?? {},
    cardOptionsByPlayer: normalizeCardOptionsMap(room.cardOptionsByPlayer, players),
    selectedCardByPlayer: normalizeSelectedCardMap(room.selectedCardByPlayer, players),
    cardActivationByPlayer: normalizeCardActivationMap(room.cardActivationByPlayer, players),
    completedRoundByPlayer: normalizeCompletedRoundMap(room.completedRoundByPlayer, players),
    bracket,
    bracketRound: invalidPostDraft ? 0 : Math.min(Math.max(room.bracketRound ?? inferredBracketRound(bracket), 0), maxRound),
    champion: invalidPostDraft ? undefined : room.champion
  };
}

function normalizeCompletedRoundMap(map: Record<string, number> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  return Object.fromEntries(
    Object.entries(map ?? {})
      .filter(([playerId, round]) => playerIds.has(playerId) && Number.isInteger(round) && round >= 0)
      .map(([playerId, round]) => [playerId, round])
  );
}

function normalizePlayer(player: RoomPlayer): RoomPlayer {
  const cleanUser = player.userName?.trim() || "Jogador";
  const cleanTeam = player.teamName?.trim() || `${cleanUser} FC`;
  return {
    ...player,
    id: player.id || createRoomPlayer(cleanUser, cleanTeam).id,
    userName: cleanUser,
    teamName: cleanTeam,
    emblemId: player.emblemId,
    formation: player.formation || defaultFormation,
    tacticalStyle: player.tacticalStyle || defaultTacticalStyle,
    squad: (player.squad ?? []).map(normalizePick),
    ready: Boolean(player.ready)
  };
}

function normalizePick(pick: RoomPick): RoomPick {
  const sourcePlayer = players.find((player) => player.id === pick.id || player.canonicalPlayerId === pick.canonicalPlayerId);
  const season = clubSeasons.find((item) => item.id === (pick.clubSeasonId || sourcePlayer?.clubSeasonId));
  return {
    id: pick.id || sourcePlayer?.id || `pick-${Math.random().toString(36).slice(2, 8)}`,
    canonicalPlayerId: pick.canonicalPlayerId || sourcePlayer?.canonicalPlayerId || pick.id,
    name: pick.name || sourcePlayer?.name || "Jogador",
    nationality: pick.nationality || sourcePlayer?.nationality,
    clubName: pick.clubName || season?.clubName || "Clube historico",
    clubSeasonId: pick.clubSeasonId || sourcePlayer?.clubSeasonId || season?.id || "",
    season: pick.season || season?.season || "",
    position: pick.position || sourcePlayer?.primaryPosition || "CM",
    overall: pick.overall || sourcePlayer?.overall || 70,
    shirtNumber: pick.shirtNumber ?? sourcePlayer?.shirtNumber,
    slotId: pick.slotId,
    slotLabel: pick.slotLabel,
    slotPosition: pick.slotPosition,
    effectiveRating: pick.effectiveRating ?? pick.overall ?? sourcePlayer?.overall
  };
}

function normalizeDraw(draw?: RoomDraw) {
  if (!draw) return undefined;
  const season = clubSeasons.find((item) => item.id === draw.clubSeasonId);
  return {
    clubSeasonId: draw.clubSeasonId || season?.id || "",
    clubId: draw.clubId || season?.clubId,
    clubName: draw.clubName || season?.clubName || "Clube historico",
    shortName: draw.shortName || season?.shortName || draw.clubName || "FC",
    season: draw.season || season?.season || "",
    country: draw.country || season?.country || "",
    primaryColor: draw.primaryColor || season?.primaryColor || "#082f49",
    secondaryColor: draw.secondaryColor || season?.secondaryColor || "#22d3ee",
    genericBadgeShape: draw.genericBadgeShape || season?.genericBadgeShape || "shield",
    rarity: draw.rarity || season?.rarity || "comum",
    roster: (draw.roster ?? []).map(normalizePick)
  };
}

function normalizeDrawMap(map: Record<string, RoomDraw | undefined> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  const clean: Record<string, RoomDraw | undefined> = {};
  for (const [playerId, draw] of Object.entries(map ?? {})) {
    if (playerIds.has(playerId)) clean[playerId] = normalizeDraw(draw);
  }
  return clean;
}

function normalizePendingPickMap(map: Record<string, string | undefined> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  return Object.fromEntries(Object.entries(map ?? {}).filter(([playerId]) => playerIds.has(playerId)));
}

function normalizeCoachMap(map?: Record<string, RoomCoach[]>) {
  const clean: Record<string, RoomCoach[]> = {};
  for (const [playerId, options] of Object.entries(map ?? {})) {
    clean[playerId] = options.map((coach) => {
      const source =
        coaches.find((item) => item.id === coach.id) ??
        coaches.find((item) => sameName(item.clubName, coach.clubName) && item.season === coach.season);
      return {
        ...coach,
        nationality: coach.nationality || source?.nationality || "",
        clubSeasonId: coach.clubSeasonId || source?.clubSeasonId || ""
      };
    });
  }
  return clean;
}

function normalizeCardOptionsMap(map: Record<string, RoomSecretCardId[]> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  const validCards = new Set(roomSecretCards.map((card) => card.id));
  return Object.fromEntries(
    Object.entries(map ?? {})
      .filter(([playerId]) => playerIds.has(playerId))
      .map(([playerId, options]) => [playerId, Array.from(new Set(options.filter((cardId) => validCards.has(cardId)))).slice(0, 3)])
  );
}

function normalizeSelectedCardMap(map: Record<string, RoomSecretCardId> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  const validCards = new Set(roomSecretCards.map((card) => card.id));
  return Object.fromEntries(Object.entries(map ?? {}).filter(([playerId, cardId]) => playerIds.has(playerId) && validCards.has(cardId)));
}

function normalizeCardActivationMap(map: Record<string, RoomCardActivation> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  const validCards = new Set(roomSecretCards.map((card) => card.id));
  return Object.fromEntries(
    Object.entries(map ?? {}).filter(
      ([playerId, activation]) => playerIds.has(playerId) && Boolean(activation?.matchId) && validCards.has(activation.cardId)
    )
  );
}

function normalizeRerollMap(map: Record<string, number> | undefined, roomPlayers: RoomPlayer[]) {
  const clean: Record<string, number> = {};
  for (const player of roomPlayers) clean[player.id] = Math.min(roomRerollsPerDraft, Math.max(0, map?.[player.id] ?? 0));
  return clean;
}

function normalizeReviewSwapMap(map: Record<string, boolean> | undefined, roomPlayers: RoomPlayer[]) {
  return Object.fromEntries(roomPlayers.map((player) => [player.id, Boolean(map?.[player.id])]));
}

function normalizePenaltyShotsMap(map: Record<string, RoomPenaltyShot[]> | undefined, roomPlayers: RoomPlayer[]) {
  const clean: Record<string, RoomPenaltyShot[]> = {};
  for (const player of roomPlayers) {
    clean[player.id] = (map?.[player.id] ?? []).filter((shot) =>
      Boolean(shot?.id) &&
      Number.isFinite(shot.round) &&
      ["left", "center", "right"].includes(shot.direction) &&
      ["left", "center", "right"].includes(shot.keeperDirection)
    ).slice(0, 6).map((shot) => ({
      ...shot,
      round: Math.max(0, Math.min(penaltySuddenDeathRounds, shot.round)),
      accuracy: Math.max(0, Math.min(100, Math.round(shot.accuracy ?? 0))),
      scored: Boolean(shot.scored)
    }));
  }
  return clean;
}

function normalizePresenceMap(map: Record<string, number> | undefined, roomPlayers: RoomPlayer[]) {
  const playerIds = new Set(roomPlayers.map((player) => player.id));
  return Object.fromEntries(Object.entries(map ?? {}).filter(([playerId, value]) => playerIds.has(playerId) && Number.isFinite(value)));
}

function normalizeMatch(match: RoomMatch): RoomMatch {
  const done = match.status === "done" || (typeof match.homeGoals === "number" && typeof match.awayGoals === "number" && Boolean(match.winnerName));
  return {
    ...match,
    homeBonusGoals: Math.max(0, Math.round(match.homeBonusGoals ?? 0)),
    awayBonusGoals: Math.max(0, Math.round(match.awayBonusGoals ?? 0)),
    cardEvents: (match.cardEvents ?? []).filter((event) => Boolean(event?.id && event.text)),
    status: done ? "done" : "pending",
    winnerName: done ? match.winnerName ?? (Number(match.homeGoals) > Number(match.awayGoals) ? match.homeName : match.awayName) : undefined,
    homeGoals: done ? match.homeGoals ?? 0 : undefined,
    awayGoals: done ? match.awayGoals ?? 0 : undefined
  };
}

function inferredBracketRound(matches: RoomMatch[]) {
  for (let index = 0; index < phases.length; index++) {
    const phaseMatches = matches.filter((match) => match.phase === phases[index]);
    if (phaseMatches.some((match) => match.status === "pending")) return index;
  }
  const latestPhase = [...matches]
    .reverse()
    .map((match) => phases.indexOf(match.phase))
    .find((index) => index >= 0);
  return latestPhase ?? 0;
}

function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const name of names) {
    const clean = name.trim();
    if (!clean || seen.has(clean.toLowerCase())) continue;
    seen.add(clean.toLowerCase());
    values.push(clean);
  }
  return values;
}

function sameName(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function allSquadsComplete(roomPlayers: RoomPlayer[]) {
  return roomPlayers.length > 0 && roomPlayers.every((player) => player.squad.length >= 11);
}

function allRoomReviewsComplete(room: FriendRoom) {
  return room.players.length > 0 && room.players.every((player) => Boolean(room.reviewSwapUsedByPlayer[player.id]));
}

function beginRoomReview(room: FriendRoom) {
  return normalizeRoom({
    ...room,
    status: "reviewing",
    currentDraw: undefined,
    currentDrawByPlayer: {},
    pendingPickId: undefined,
    pendingPickByPlayer: {},
    picksInTurn: 0,
    turnOptions: [],
    turnStartedAt: undefined,
    draftEndsAt: undefined,
    reviewEndsAt: Date.now() + 30_000,
    reviewSwapUsedByPlayer: Object.fromEntries(room.players.map((player) => [player.id, false]))
  });
}

function hasHumanPlayers(room: FriendRoom) {
  return room.players.some((player) => !player.isBot);
}

function isVisibleRoom(room: FriendRoom) {
  if (!hasHumanPlayers(room)) return false;
  const seenValues = Object.values(room.lastSeenAt ?? {});
  if (seenValues.length) return seenValues.some((value) => Date.now() - value < 5 * 60_000);
  const reference = Date.parse(room.updatedAt || room.createdAt);
  if (!Number.isFinite(reference)) return true;
  return Date.now() - reference < Math.min(staleRoomMs, 5 * 60_000);
}
