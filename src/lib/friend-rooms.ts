import { coaches } from "@/data/coaches";
import { clubSeasons, players } from "@/data/loaders";
import { getFormationSlots } from "@/config/formations";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { createRng } from "@/game-engine/rng";
import { safeLoad, safeSave } from "@/lib/storage";
import type { Coach, Position, TacticalStyle } from "@/types/game";

export type RoomVisibility = "publica" | "privada";
export type RoomDraftMode = "todos" | "turnos";
export type RoomStatus = "lobby" | "drafting" | "reviewing" | "coach" | "bracket" | "finished";
export type RoomMatchStatus = "pending" | "done";

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
  badgeUrl?: string;
  rarity: string;
  roster: RoomPick[];
};

export type RoomCoach = Pick<Coach, "id" | "name" | "clubSeasonId" | "clubName" | "season" | "style" | "rating" | "description">;

export type RoomPlayer = {
  id: string;
  userName: string;
  teamName: string;
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
  homeGoals?: number;
  awayGoals?: number;
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
  simultaneousMinutes: 2 | 3;
  turnSeconds: 20 | 30 | 45;
  status: RoomStatus;
  createdAt: string;
  updatedAt?: string;
  lastSeenAt?: Record<string, number>;
  players: RoomPlayer[];
  turnIndex: number;
  turnOptions: RoomPick[];
  currentDraw?: RoomDraw;
  pendingPickId?: string;
  rerollsByPlayer: Record<string, number>;
  picksInTurn: number;
  turnStartedAt?: number;
  draftEndsAt?: number;
  reviewEndsAt?: number;
  coachOptionsByPlayer: Record<string, RoomCoach[]>;
  selectedCoachByPlayer: Record<string, string>;
  bracket: RoomMatch[];
  bracketRound: number;
  champion?: string;
};

export type CreateRoomInput = {
  name: string;
  hostName: string;
  hostTeamName: string;
  visibility: RoomVisibility;
  password?: string;
  difficulty: "classico" | "almanaque";
  draftMode: RoomDraftMode;
  simultaneousMinutes: 2 | 3;
  turnSeconds: 20 | 30 | 45;
};

const roomsKey = "craque-ou-bagre:friend-rooms:v2";
const phases = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
const defaultFormation = "4-3-3";
const defaultTacticalStyle: TacticalStyle = "equilibrado";
const maxEntrants = 16;
const roomRerollsPerPick = 3;
const staleRoomMs = 60 * 60 * 1000;

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
  const hostPlayer = createRoomPlayer(input.hostName, input.hostTeamName);
  return {
    id,
    name: input.name.trim() || "Final de Copa",
    hostName: input.hostName,
    visibility: input.visibility,
    password: input.visibility === "privada" ? input.password?.trim() : undefined,
    difficulty: input.difficulty,
    draftMode: "turnos",
    simultaneousMinutes: input.simultaneousMinutes,
    turnSeconds: input.turnSeconds,
    status: "lobby",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastSeenAt: { [hostPlayer.id]: Date.now() },
    players: [hostPlayer],
    turnIndex: 0,
    turnOptions: [],
    currentDraw: undefined,
    pendingPickId: undefined,
    rerollsByPlayer: {},
    picksInTurn: 0,
    reviewEndsAt: undefined,
    coachOptionsByPlayer: {},
    selectedCoachByPlayer: {},
    bracket: [],
    bracketRound: 0
  };
}

export function createRoomPlayer(userName: string, teamName?: string, isBot = false): RoomPlayer {
  const cleanUser = userName.trim() || "Jogador";
  const cleanTeam = teamName?.trim() || `${cleanUser} FC`;
  return {
    id: `${isBot ? "bot" : "player"}-${cleanUser.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).slice(2, 6)}`,
    userName: cleanUser,
    teamName: cleanTeam,
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
    draftMode: "turnos",
    turnOptions: [],
    currentDraw: undefined,
    pendingPickId: undefined,
    rerollsByPlayer: {},
    picksInTurn: 0,
    draftEndsAt: undefined,
    turnStartedAt: Date.now(),
    reviewEndsAt: undefined,
    coachOptionsByPlayer: {},
    selectedCoachByPlayer: {},
    bracket: [],
    bracketRound: 0,
    champion: undefined
  };
  return normalizeRoom(next);
}

export function autoCompleteRoomDraft(room: FriendRoom) {
  const rng = createRng(`${room.id}-auto-draft-${room.players.length}`);
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
  const player = normalized.players[normalized.turnIndex];
  if (!player || player.id !== playerId || player.squad.length >= 11) return normalized;
  const rerollsUsed = normalized.rerollsByPlayer[playerId] ?? 0;
  const isReroll = Boolean(normalized.currentDraw);
  if (isReroll && rerollsUsed >= roomRerollsPerPick) return normalized;
  const seed = `${normalized.id}-${player.id}-${player.squad.length}-${normalized.picksInTurn}-${Date.now()}`;
  return normalizeRoom({
    ...normalized,
    currentDraw: buildRoomDraw(seed, player),
    pendingPickId: undefined,
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
  const player = normalized.players[normalized.turnIndex];
  if (!player || player.id !== playerId || player.squad.length >= 11) return normalized;
  const pick = normalized.currentDraw?.roster.find((item) => item.id === pickId);
  if (!pick || player.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId)) return normalized;
  if (!hasAvailableRoomSlot(player, pick)) return normalized;
  return {
    ...normalized,
    pendingPickId: pick.id
  };
}

export function placeRoomPlayer(room: FriendRoom, playerId: string, slotId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "drafting") return normalized;
  const player = normalized.players[normalized.turnIndex];
  if (!player || player.id !== playerId || player.squad.length >= 11) return normalized;
  const pending = normalized.currentDraw?.roster.find((item) => item.id === normalized.pendingPickId);
  if (!pending || player.squad.some((item) => item.slotId === slotId || item.canonicalPlayerId === pending.canonicalPlayerId)) return normalized;
  const placed = assignPickToSlot(pending, player, slotId);
  if (!placed) return normalized;

  const nextPicksInTurn = normalized.picksInTurn + 1;
  const playersNext = normalized.players.map((item, index) => {
    if (index !== normalized.turnIndex) return item;
    const squad = [...item.squad, placed].slice(0, 11);
    return { ...item, squad, ready: squad.length >= 11 };
  });
  const updatedPlayer = playersNext[normalized.turnIndex]!;
  if (playersNext.every((item) => item.squad.length >= 11)) {
    return normalizeRoom({
      ...normalized,
      status: "reviewing",
      players: playersNext,
      currentDraw: undefined,
      pendingPickId: undefined,
      picksInTurn: 0,
      turnOptions: [],
      turnStartedAt: undefined,
      reviewEndsAt: Date.now() + 30_000
    });
  }

  const batchStartSize = updatedPlayer.squad.length - nextPicksInTurn;
  const batchLimit = batchStartSize >= 9 ? 2 : 3;
  const shouldAdvance = updatedPlayer.squad.length >= 11 || nextPicksInTurn >= batchLimit;
  return normalizeRoom({
    ...normalized,
    players: playersNext,
    turnIndex: shouldAdvance ? nextDraftTurnIndex(playersNext, normalized.turnIndex) : normalized.turnIndex,
    currentDraw: undefined,
    pendingPickId: undefined,
    rerollsByPlayer: {
      ...normalized.rerollsByPlayer,
      [playerId]: 0
    },
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
  const player = normalized.players.find((item) => item.id === playerId);
  if (!player || !player.squad.some((pick) => pick.slotId === slotId)) return normalized;
  const sourcePlayer = players.find((item) => item.id === replacementId);
  if (!sourcePlayer || player.squad.some((pick) => pick.canonicalPlayerId === sourcePlayer.canonicalPlayerId)) return normalized;
  const season = clubSeasons.find((item) => item.id === sourcePlayer.clubSeasonId);
  const placed = assignPickToSlot(toRoomPick(sourcePlayer, season), player, slotId);
  if (!placed) return normalized;
  return normalizeRoom({
    ...normalized,
    players: normalized.players.map((item) =>
      item.id === playerId
        ? {
            ...item,
            squad: item.squad.map((pick) => (pick.slotId === slotId ? placed : pick))
          }
        : item
    )
  });
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
    pendingPickId: undefined,
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
  if (!options.some((coach) => coach.id === coachId)) return normalized;
  const selectedCoachByPlayer = {
    ...normalized.selectedCoachByPlayer,
    [playerId]: coachId
  };
  const next = normalizeRoom({
    ...normalized,
    selectedCoachByPlayer,
    players: normalized.players.map((player) => (player.id === playerId ? { ...player, ready: true } : player))
  });
  if (next.players.every((player) => selectedCoachByPlayer[player.id]) && allSquadsComplete(next.players)) return createInitialRoomBracket(next);
  return next;
}

export function chooseSimultaneousPick(room: FriendRoom, playerId: string, pickId?: string) {
  if (pickId) return selectRoomPlayer(room, playerId, pickId);
  return autoPickRoomTurn(room);
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
        ? {
            ...normalizePlayer(player),
            formation: setup.formation ?? player.formation ?? defaultFormation,
            tacticalStyle: setup.tacticalStyle ?? player.tacticalStyle ?? defaultTacticalStyle,
            ready: false
          }
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    players: room.players.filter((player) => !player.isBot).map((player) => ({ ...normalizePlayer(player), squad: [], ready: false })),
    turnIndex: 0,
    turnOptions: [],
    currentDraw: undefined,
    pendingPickId: undefined,
    rerollsByPlayer: {},
    picksInTurn: 0,
    turnStartedAt: undefined,
    draftEndsAt: undefined,
    reviewEndsAt: undefined,
    coachOptionsByPlayer: {},
    selectedCoachByPlayer: {},
    bracket: [],
    bracketRound: 0,
    champion: undefined
  });
}

export function addRoomBot(room: FriendRoom) {
  return normalizeRoom(room);
}

export function joinRoom(room: FriendRoom, userName: string, teamName: string) {
  if (room.status !== "lobby") return room;
  if (room.players.some((player) => player.userName.toLowerCase() === userName.trim().toLowerCase())) return room;
  const player = createRoomPlayer(userName, teamName);
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
  const target = roomPlayers.some((player) => player.squad.length < 9) ? 9 : 11;
  for (let step = 1; step <= roomPlayers.length; step++) {
    const index = (current + step) % roomPlayers.length;
    if (roomPlayers[index]!.squad.length < target) return index;
  }
  return current;
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
    badgeUrl: season.badgeUrl,
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

type RoomEntrant = {
  name: string;
  playerId?: string;
};

export function playPlayerRoomMatch(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return normalized;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  const match = normalized.bracket.find((item) => item.phase === phase && item.status === "pending" && (item.homePlayerId === playerId || item.awayPlayerId === playerId));
  if (!match) return normalized;
  return resolveRoomRoundIfReady(simulateRoomMatch(normalized, match.id, `${normalized.id}-${playerId}-${match.id}`), true);
}

export function previewPlayerRoomMatch(room: FriendRoom, playerId: string) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return undefined;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  const match = normalized.bracket.find((item) => item.phase === phase && item.status === "pending" && (item.homePlayerId === playerId || item.awayPlayerId === playerId));
  if (!match) return undefined;
  return simulateSingleRoomMatch(match, `${normalized.id}-${playerId}-${match.id}`);
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
  return normalized.bracket.find((item) => item.phase === phase && item.status === "pending" && (item.homePlayerId === playerId || item.awayPlayerId === playerId));
}

export function hasPendingHumanRoomMatches(room: FriendRoom) {
  const normalized = normalizeRoom(room);
  if (normalized.status !== "bracket") return false;
  const phase = phases[normalized.bracketRound] ?? phases[0]!;
  return normalized.bracket.some((match) => match.phase === phase && match.status === "pending" && (match.homePlayerId || match.awayPlayerId));
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
  const rng = createRng(`${room.id}-bracket-${realPlayers.map((player) => player.teamName).join("|")}`);
  const entrants: RoomEntrant[] = uniqueNames(realPlayers.map((player) => player.teamName)).map((teamName) => {
    const player = realPlayers.find((item) => sameName(item.teamName, teamName));
    return { name: teamName, playerId: player?.id };
  });
  for (const historicTeam of randomHistoricTeams(room.id)) {
    if (entrants.length >= maxEntrants) break;
    if (!entrants.some((entrant) => sameName(entrant.name, historicTeam))) entrants.push({ name: historicTeam });
  }
  while (entrants.length < maxEntrants) entrants.push({ name: `Convidado ${entrants.length + 1}` });
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
  const pendingHumanMatch = currentMatches.some((match) => match.status === "pending" && (match.homePlayerId || match.awayPlayerId));
  if (pendingHumanMatch) return room;
  if (!forceBotRound && currentMatches.some((match) => match.status === "pending")) return room;

  let nextRoom = room;
  for (const match of currentMatches) {
    if (match.status === "pending") nextRoom = simulateRoomMatch(nextRoom, match.id, `${room.id}-${match.id}-bot`);
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
  const winners = resolvedMatches.map((match) => winnerEntrant(match));
  return {
    ...nextRoom,
    bracketRound: nextPhaseIndex,
    bracket: [...nextRoom.bracket, ...createRoundMatches(nextPhase, winners, nextPhaseIndex)]
  };
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
  let homeGoals = rng.int(0, 4);
  let awayGoals = rng.int(0, 4);
  if (match.homePlayerId && !match.awayPlayerId) homeGoals += rng.next() > 0.38 ? 1 : 0;
  if (match.awayPlayerId && !match.homePlayerId) awayGoals += rng.next() > 0.38 ? 1 : 0;
  if (homeGoals === awayGoals) {
    if (rng.next() > 0.5) homeGoals += 1;
    else awayGoals += 1;
  }
  return {
    ...match,
    homeGoals,
    awayGoals,
    winnerName: homeGoals > awayGoals ? match.homeName : match.awayName,
    status: "done" as const
  };
}

function winnerEntrant(match: RoomMatch): RoomEntrant {
  if (match.winnerName === match.homeName) return { name: match.homeName, playerId: match.homePlayerId };
  return { name: match.awayName, playerId: match.awayPlayerId };
}

function randomHistoricTeams(seed: string) {
  const seen = new Set<string>();
  const labels = clubSeasons
    .map((season) => teamSeasonLabel(season.clubName, season.season))
    .filter((label) => {
      if (seen.has(label)) return false;
      seen.add(label);
      return true;
    });
  return shuffle(labels, createRng(`${seed}-historic-teams`));
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
  const rawStatus = ["lobby", "drafting", "reviewing", "coach", "bracket", "finished"].includes(room.status) ? room.status : "lobby";
  const invalidPostDraft = ["reviewing", "coach", "bracket", "finished"].includes(rawStatus) && !allSquadsComplete(players);
  const status = invalidPostDraft ? "drafting" : rawStatus;
  const bracket = invalidPostDraft ? [] : (Array.isArray(room.bracket) ? room.bracket : []).map(normalizeMatch);
  const maxRound = Math.max(0, phases.length - 1);
  return {
    ...room,
    id: room.id || `sala-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: room.name?.trim() || "Final de Copa",
    hostName: room.hostName?.trim() || players[0]?.userName || "Jogador",
    visibility: room.visibility === "privada" ? "privada" : "publica",
    difficulty: room.difficulty === "almanaque" ? "almanaque" : "classico",
    draftMode: "turnos",
    simultaneousMinutes: room.simultaneousMinutes === 3 ? 3 : 2,
    turnSeconds: room.turnSeconds === 20 || room.turnSeconds === 45 ? room.turnSeconds : 30,
    status,
    createdAt: room.createdAt || new Date().toISOString(),
    updatedAt: room.updatedAt || room.createdAt || new Date().toISOString(),
    lastSeenAt: normalizePresenceMap(room.lastSeenAt, players),
    players,
    turnIndex: Math.min(room.turnIndex ?? 0, Math.max(0, players.length - 1)),
    turnOptions: (room.turnOptions ?? []).map(normalizePick),
    currentDraw: normalizeDraw(room.currentDraw),
    pendingPickId: room.pendingPickId,
    rerollsByPlayer: normalizeRerollMap(room.rerollsByPlayer, players),
    picksInTurn: Math.max(0, room.picksInTurn ?? 0),
    turnStartedAt: room.turnStartedAt,
    draftEndsAt: room.draftEndsAt,
    reviewEndsAt: room.reviewEndsAt,
    coachOptionsByPlayer: normalizeCoachMap(room.coachOptionsByPlayer),
    selectedCoachByPlayer: room.selectedCoachByPlayer ?? {},
    bracket,
    bracketRound: invalidPostDraft ? 0 : Math.min(Math.max(room.bracketRound ?? inferredBracketRound(bracket), 0), maxRound),
    champion: invalidPostDraft ? undefined : room.champion
  };
}

function normalizePlayer(player: RoomPlayer): RoomPlayer {
  const cleanUser = player.userName?.trim() || "Jogador";
  const cleanTeam = player.teamName?.trim() || `${cleanUser} FC`;
  return {
    ...player,
    id: player.id || createRoomPlayer(cleanUser, cleanTeam).id,
    userName: cleanUser,
    teamName: cleanTeam,
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
    badgeUrl: draw.badgeUrl || season?.badgeUrl,
    rarity: draw.rarity || season?.rarity || "comum",
    roster: (draw.roster ?? []).map(normalizePick)
  };
}

function normalizeCoachMap(map?: Record<string, RoomCoach[]>) {
  const clean: Record<string, RoomCoach[]> = {};
  for (const [playerId, options] of Object.entries(map ?? {})) {
    clean[playerId] = options.map((coach) => {
      const source =
        coaches.find((item) => item.id === coach.id) ??
        coaches.find((item) => sameName(item.clubName, coach.clubName) && item.season === coach.season);
      return { ...coach, clubSeasonId: coach.clubSeasonId || source?.clubSeasonId || "" };
    });
  }
  return clean;
}

function normalizeRerollMap(map: Record<string, number> | undefined, roomPlayers: RoomPlayer[]) {
  const clean: Record<string, number> = {};
  for (const player of roomPlayers) clean[player.id] = Math.min(roomRerollsPerPick, Math.max(0, map?.[player.id] ?? 0));
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

function hasHumanPlayers(room: FriendRoom) {
  return room.players.some((player) => !player.isBot);
}

function isVisibleRoom(room: FriendRoom) {
  if (!hasHumanPlayers(room)) return false;
  const seenValues = Object.values(room.lastSeenAt ?? {});
  if (seenValues.length) return seenValues.some((value) => Date.now() - value < 45_000);
  const reference = Date.parse(room.updatedAt || room.createdAt);
  if (!Number.isFinite(reference)) return true;
  return Date.now() - reference < Math.min(staleRoomMs, 45_000);
}
