import { chooseRoomLegend, normalizeFriendRoom, normalizeFriendRooms, progressRoomRound, resolveRoomPenaltyTimeout, resolveRoomSecretCardStage, shootRoomPenalty, startRoomCardStage, startRoomCoachStage, startRoomDraft, startRoomPenaltyChallenge, type FriendRoom, type RoomMatch, type RoomPlayer, type RoomStatus } from "@/lib/friend-rooms";
import { deleteSharedFriendRoom, hasSupabaseConfig, listSharedFriendRooms, saveSharedFriendRooms } from "@/server/db";
import { validatePublicName } from "@/server/name-policy";
import { getCurrentUser } from "@/server/session";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".local");
const roomsFile = path.join(dataDir, "friend-rooms.json");

async function readRooms() {
  if (hasSupabaseConfig()) {
    const sharedRooms = await listSharedFriendRooms();
    if (sharedRooms) {
      const normalized = normalizeFriendRooms(sharedRooms);
      const fresh = normalized.filter(isFreshRoom);
      const { rooms, duplicateIds } = dedupeRecentlyCreatedRooms(fresh);
      const staleIds = normalized.filter((room) => !isFreshRoom(room)).map((room) => room.id);
      const obsoleteIds = [...new Set([...staleIds, ...duplicateIds])];
      if (obsoleteIds.length) await Promise.all(obsoleteIds.map((roomId) => deleteSharedFriendRoom(roomId)));
      return rooms;
    }
  }
  try {
    const raw = await readFile(roomsFile, "utf8");
    const parsed = JSON.parse(raw) as { rooms?: FriendRoom[] } | FriendRoom[];
    const rooms = Array.isArray(parsed) ? parsed : parsed.rooms ?? [];
    return dedupeRecentlyCreatedRooms(normalizeFriendRooms(rooms)).rooms;
  } catch {
    return [];
  }
}

function normalizedRoomText(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR").replace(/\s+/g, " ");
}

function roomCreationKey(room: FriendRoom) {
  const host = room.players.find((player) => normalizedRoomText(player.userName) === normalizedRoomText(room.hostName));
  return [normalizedRoomText(room.hostName), normalizedRoomText(host?.teamName ?? ""), normalizedRoomText(room.name), room.visibility].join("|");
}

function dedupeRecentlyCreatedRooms(source: FriendRoom[]) {
  const kept: FriendRoom[] = [];
  const duplicateIds: string[] = [];
  const ordered = [...source].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  for (const room of ordered) {
    const duplicate = kept.find((item) =>
      item.status === "lobby" &&
      room.status === "lobby" &&
      roomCreationKey(item) === roomCreationKey(room) &&
      Math.abs(Date.parse(item.createdAt) - Date.parse(room.createdAt)) <= 15_000
    );
    if (duplicate) duplicateIds.push(room.id);
    else kept.push(room);
  }
  return {
    rooms: kept.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 40),
    duplicateIds
  };
}

async function writeRooms(rooms: FriendRoom[]) {
  if (hasSupabaseConfig()) {
    await saveSharedFriendRooms(normalizeFriendRooms(rooms));
    return;
  }
  await mkdir(dataDir, { recursive: true });
  await writeFile(roomsFile, JSON.stringify({ rooms: normalizeFriendRooms(rooms) }, null, 2), "utf8");
}

function mergeRooms(incoming: FriendRoom[], current: FriendRoom[]) {
  const byId = new Map<string, FriendRoom>();
  const currentById = new Map(current.map((room) => [room.id, room]));
  for (const room of normalizeFriendRooms(incoming)) {
    const currentRoom = currentById.get(room.id);
    byId.set(room.id, currentRoom ? mergeRoomState(room, currentRoom) : room);
  }
  for (const room of current) {
    if (!byId.has(room.id)) byId.set(room.id, room);
  }
  return Array.from(byId.values())
    .filter(isFreshRoom)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 40);
}

function mergeRoomState(incoming: FriendRoom, current: FriendRoom) {
  const incomingReset =
    incoming.status === "lobby" &&
    incoming.bracket.length === 0 &&
    incoming.players.every((player) => player.squad.length === 0) &&
    incoming.draftCycle > current.draftCycle;
  if (incomingReset) return normalizeFriendRoom({ ...incoming, revision: Math.max(incoming.revision ?? 0, current.revision ?? 0) + 1 });

  const incomingRank = statusRank(incoming.status);
  const currentRank = statusRank(current.status);
  const incomingRevision = incoming.revision ?? 0;
  const currentRevision = current.revision ?? 0;
  const incomingIsCurrent = incomingRevision >= currentRevision;
  const resumesFinalPick = current.status === "challenge" && incoming.status === "drafting" && Boolean(incoming.legendSelectedId);
  const base = resumesFinalPick || (incomingIsCurrent && incomingRank >= currentRank) ? incoming : current;
  const status = incoming.status === "finished" || current.status === "finished" ? "finished" : resumesFinalPick ? "drafting" : incomingRank >= currentRank ? incoming.status : current.status;
  const merged = normalizeFriendRoom({
    ...base,
    status,
    draftCycle: Math.max(incoming.draftCycle, current.draftCycle),
    processedActionIds: mergeActionIds(current.processedActionIds, incoming.processedActionIds),
    lastSeenAt: { ...(current.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) },
    players: mergePlayers(incoming.players, current.players),
    turnIndex: base.turnIndex ?? 0,
    turnOptions: base.turnOptions ?? [],
    currentDraw: base.currentDraw,
    currentDrawByPlayer: { ...(current.currentDrawByPlayer ?? {}), ...(incoming.currentDrawByPlayer ?? {}) },
    pendingPickId: base.pendingPickId,
    pendingPickByPlayer: { ...(current.pendingPickByPlayer ?? {}), ...(incoming.pendingPickByPlayer ?? {}) },
    rerollsByPlayer: base.rerollsByPlayer ?? {},
    picksInTurn: base.picksInTurn ?? 0,
    turnStartedAt: base.turnStartedAt,
    draftEndsAt: base.draftEndsAt,
    reviewEndsAt: base.reviewEndsAt,
    reviewSwapUsedByPlayer: mergeBooleanMap(current.reviewSwapUsedByPlayer, incoming.reviewSwapUsedByPlayer),
    penaltyStartedAt: base.penaltyStartedAt,
    penaltyEndsAt: base.penaltyEndsAt,
    penaltyRound: base.penaltyRound,
    penaltyEligiblePlayerIds: base.penaltyEligiblePlayerIds,
    penaltyShotsByPlayer: { ...(current.penaltyShotsByPlayer ?? {}), ...(incoming.penaltyShotsByPlayer ?? {}) },
    penaltyWinnerId: base.penaltyWinnerId,
    legendOptions: base.legendOptions,
    legendSelectedId: base.legendSelectedId,
    coachOptionsByPlayer: { ...(current.coachOptionsByPlayer ?? {}), ...(incoming.coachOptionsByPlayer ?? {}) },
    selectedCoachByPlayer: { ...(current.selectedCoachByPlayer ?? {}), ...(incoming.selectedCoachByPlayer ?? {}) },
    cardOptionsByPlayer: { ...(current.cardOptionsByPlayer ?? {}), ...(incoming.cardOptionsByPlayer ?? {}) },
    selectedCardByPlayer: { ...(current.selectedCardByPlayer ?? {}), ...(incoming.selectedCardByPlayer ?? {}) },
    cardActivationByPlayer: { ...(current.cardActivationByPlayer ?? {}), ...(incoming.cardActivationByPlayer ?? {}) },
    completedRoundByPlayer: mergeRoundCompletionMap(current.completedRoundByPlayer, incoming.completedRoundByPlayer),
    bracket: mergeMatches(incoming.bracket, current.bracket),
    bracketRound: Math.max(incoming.bracketRound ?? 0, current.bracketRound ?? 0),
    champion: incoming.champion ?? current.champion,
    revision: Math.max(incomingRevision, currentRevision) + 1,
    updatedAt: latestDate(incoming.updatedAt || incoming.createdAt, current.updatedAt || current.createdAt)
  });
  // O ultimo resultado humano pode chegar junto com outro resultado. Avancar
  // no servidor evita que todos os clientes fiquem esperando uma nova acao.
  const afterCoach = merged.status === "coach" ? startRoomCardStage(merged) : merged;
  const afterCards = afterCoach.status === "cards" ? resolveRoomSecretCardStage(afterCoach) : afterCoach;
  return afterCards.status === "bracket" ? progressRoomRound(afterCards) : afterCards;
}

function isFreshRoom(room: FriendRoom) {
  if (!room.players.some((player) => !player.isBot)) return false;
  const seenValues = Object.values(room.lastSeenAt ?? {});
  if (seenValues.length) return seenValues.some((value) => Date.now() - value < 45_000);
  const reference = Date.parse(room.updatedAt || room.createdAt);
  if (!Number.isFinite(reference)) return true;
  return Date.now() - reference < 45_000;
}

function latestDate(a?: string, b?: string) {
  const aTime = Date.parse(a ?? "");
  const bTime = Date.parse(b ?? "");
  return (Number.isFinite(aTime) && aTime >= bTime ? a : b) || new Date().toISOString();
}

function mergePlayers(incoming: RoomPlayer[], current: RoomPlayer[]) {
  const byId = new Map<string, RoomPlayer>();
  for (const player of current) byId.set(player.id, player);
  for (const player of incoming) {
    const saved = byId.get(player.id);
    byId.set(player.id, saved ? { ...saved, ...player, squad: player.squad.length >= saved.squad.length ? player.squad : saved.squad } : player);
  }
  return Array.from(byId.values());
}

function keepHeartbeat(incoming: FriendRoom, saved: FriendRoom) {
  return normalizeFriendRoom({
    ...saved,
    processedActionIds: mergeActionIds(saved.processedActionIds, incoming.processedActionIds),
    lastSeenAt: { ...(saved.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) }
  });
}

function mergeActionIds(current: string[] | undefined, incoming: string[] | undefined) {
  return Array.from(new Set([...(current ?? []), ...(incoming ?? [])])).slice(-80);
}

function markAction(room: FriendRoom, actionId?: string) {
  if (!actionId) return room;
  return normalizeFriendRoom({
    ...room,
    processedActionIds: mergeActionIds(room.processedActionIds, [actionId])
  });
}

function mergeBooleanMap(current: Record<string, boolean> | undefined, incoming: Record<string, boolean> | undefined) {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(incoming ?? {})]);
  return Object.fromEntries(Array.from(keys, (key) => [key, Boolean(current?.[key] || incoming?.[key])]));
}

function mergeRoundCompletionMap(current: Record<string, number> | undefined, incoming: Record<string, number> | undefined) {
  const keys = new Set([...Object.keys(current ?? {}), ...Object.keys(incoming ?? {})]);
  return Object.fromEntries(Array.from(keys, (key) => [key, Math.max(current?.[key] ?? -1, incoming?.[key] ?? -1)]));
}

function authorizeReviewMutation(incoming: FriendRoom, saved: FriendRoom, actorId: string) {
  const incomingActor = incoming.players.find((player) => player.id === actorId);
  const savedActor = saved.players.find((player) => player.id === actorId);
  if (!incomingActor || !savedActor || incomingActor.squad.length !== savedActor.squad.length) return keepHeartbeat(incoming, saved);

  const savedIds = new Set(savedActor.squad.map((pick) => pick.canonicalPlayerId));
  const incomingIds = new Set(incomingActor.squad.map((pick) => pick.canonicalPlayerId));
  const removed = Array.from(savedIds).filter((id) => !incomingIds.has(id));
  const added = Array.from(incomingIds).filter((id) => !savedIds.has(id));
  const changedPlayer = removed.length === 1 && added.length === 1;
  if (removed.length !== added.length || removed.length > 1) return keepHeartbeat(incoming, saved);

  const swapWasUsed = Boolean(saved.reviewSwapUsedByPlayer?.[actorId]);
  const swapIsUsed = Boolean(incoming.reviewSwapUsedByPlayer?.[actorId]);
  if ((swapWasUsed && changedPlayer) || (changedPlayer && !swapIsUsed) || (swapWasUsed && !swapIsUsed)) {
    return keepHeartbeat(incoming, saved);
  }
  if (!["reviewing", "coach"].includes(incoming.status)) return keepHeartbeat(incoming, saved);

  const reviewSwapUsedByPlayer = {
    ...(saved.reviewSwapUsedByPlayer ?? {}),
    [actorId]: swapWasUsed || changedPlayer || swapIsUsed
  };
  const allConfirmed = saved.players.length > 0 && saved.players.every((player) => Boolean(reviewSwapUsedByPlayer[player.id]));
  if (incoming.status === "coach" && !allConfirmed) return keepHeartbeat(incoming, saved);

  const merged = normalizeFriendRoom({
    ...incoming,
    players: saved.players.map((player) => (player.id === actorId ? incomingActor : player)),
    lastSeenAt: { ...(saved.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) },
    reviewSwapUsedByPlayer,
    revision: Math.max(saved.revision ?? 0, incoming.revision ?? 0) + 1,
    updatedAt: new Date().toISOString()
  });
  return allConfirmed ? startRoomCoachStage(merged) : merged;
}

function authorizeDraftMutation(incoming: FriendRoom, saved: FriendRoom, actorId: string) {
  if (saved.status === "lobby") return authorizeLobbyMutation(incoming, saved, actorId);
  if (saved.status === "challenge") return authorizePenaltyMutation(incoming, saved, actorId);
  if (saved.status === "reviewing") return authorizeReviewMutation(incoming, saved, actorId);
  if (saved.status !== "drafting") return incoming;
  const activePlayer = saved.players[saved.turnIndex];
  if (saved.draftMode === "turnos" && (!activePlayer || activePlayer.id !== actorId)) return keepHeartbeat(incoming, saved);

  const incomingActor = incoming.players.find((player) => player.id === actorId);
  const savedActor = saved.players.find((player) => player.id === actorId);
  if (!incomingActor || !savedActor) return keepHeartbeat(incoming, saved);
  const added = incomingActor.squad.length - savedActor.squad.length;
  if (added < 0 || added > 1) return keepHeartbeat(incoming, saved);
  if (!savedActor.squad.every((pick) => incomingActor.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId))) {
    return keepHeartbeat(incoming, saved);
  }

  const oldRerolls = saved.rerollsByPlayer?.[actorId] ?? 0;
  const newRerolls = incoming.rerollsByPlayer?.[actorId] ?? 0;
  if (newRerolls < oldRerolls || newRerolls > 3 || newRerolls - oldRerolls > 1) {
    return keepHeartbeat(incoming, saved);
  }

  const savedDrawId = (saved.draftMode === "todos" ? saved.currentDrawByPlayer?.[actorId] : saved.currentDraw)?.clubSeasonId;
  const incomingDrawId = (incoming.draftMode === "todos" ? incoming.currentDrawByPlayer?.[actorId] : incoming.currentDraw)?.clubSeasonId;
  const changedDraw = Boolean(savedDrawId && incomingDrawId && savedDrawId !== incomingDrawId);
  if (added === 0) {
    if (savedDrawId && !incomingDrawId) return keepHeartbeat(incoming, saved);
    if (!savedDrawId && incomingDrawId && newRerolls !== oldRerolls) return keepHeartbeat(incoming, saved);
    if (changedDraw && newRerolls !== oldRerolls + 1) return keepHeartbeat(incoming, saved);
  }

  if (added === 0 && saved.draftMode === "turnos" && (incoming.turnIndex !== saved.turnIndex || incoming.status !== "drafting")) {
    return keepHeartbeat(incoming, saved);
  }
  if (added === 1 && incomingActor.squad.length > 11) return keepHeartbeat(incoming, saved);
  if (incoming.status === "reviewing" && !incoming.players.every((player) => player.squad.length === 11)) {
    return keepHeartbeat(incoming, saved);
  }
  if (incoming.status === "challenge" && !incoming.players.every((player) => player.squad.length >= 10)) return keepHeartbeat(incoming, saved);
  if (!["drafting", "challenge", "reviewing"].includes(incoming.status)) return keepHeartbeat(incoming, saved);
  const players = saved.players.map((player) => (player.id === actorId ? incomingActor : player));
  const currentDrawByPlayer = { ...(saved.currentDrawByPlayer ?? {}) };
  const pendingPickByPlayer = { ...(saved.pendingPickByPlayer ?? {}) };
  if (saved.draftMode === "todos") {
    currentDrawByPlayer[actorId] = incoming.currentDrawByPlayer?.[actorId];
    pendingPickByPlayer[actorId] = incoming.pendingPickByPlayer?.[actorId];
  }
  const accepted = normalizeFriendRoom({
    ...incoming,
    players,
    lastSeenAt: { ...(saved.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) },
    currentDrawByPlayer,
    pendingPickByPlayer,
    rerollsByPlayer: { ...(saved.rerollsByPlayer ?? {}), [actorId]: newRerolls },
    revision: Math.max(saved.revision ?? 0, incoming.revision ?? 0) + 1,
    updatedAt: new Date().toISOString()
  });
  return accepted.players.every((player) => player.squad.length >= 10) && !accepted.penaltyWinnerId
    ? startRoomPenaltyChallenge(accepted)
    : accepted;
}

function authorizeLobbyMutation(incoming: FriendRoom, saved: FriendRoom, actorId: string) {
  const incomingActor = incoming.players.find((player) => player.id === actorId);
  const savedActor = saved.players.find((player) => player.id === actorId);
  if (!incomingActor || !savedActor) return keepHeartbeat(incoming, saved);

  const actorIsHost = saved.hostName.trim().toLowerCase() === savedActor.userName.trim().toLowerCase();
  const players = saved.players.map((player) => player.id === actorId
    ? { ...player, formation: incomingActor.formation, tacticalStyle: incomingActor.tacticalStyle, ready: incomingActor.ready }
    : player);
  const lobby = normalizeFriendRoom({
    ...saved,
    ...(actorIsHost ? {
      name: incoming.name,
      visibility: incoming.visibility,
      password: incoming.password,
      difficulty: incoming.difficulty,
      draftMode: incoming.draftMode,
      simultaneousMinutes: incoming.simultaneousMinutes,
      turnSeconds: incoming.turnSeconds
    } : {}),
    players,
    lastSeenAt: { ...(saved.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) },
    revision: Math.max(saved.revision ?? 0, incoming.revision ?? 0) + 1,
    updatedAt: new Date().toISOString()
  });

  if (incoming.status !== "drafting") return lobby;
  if (!actorIsHost || !players.length || !players.every((player) => player.ready)) return lobby;
  return startRoomDraft(lobby);
}

function authorizePenaltyMutation(incoming: FriendRoom, saved: FriendRoom, actorId: string) {
  let authoritative = saved;
  if ((saved.penaltyEndsAt ?? Infinity) <= Date.now()) authoritative = resolveRoomPenaltyTimeout(saved);

  if (authoritative.status === "challenge" && authoritative.penaltyWinnerId === actorId && incoming.legendSelectedId && !authoritative.legendSelectedId) {
    return chooseRoomLegend(authoritative, actorId, incoming.legendSelectedId);
  }

  if (authoritative.status !== "challenge" || authoritative.penaltyWinnerId) return keepHeartbeat(incoming, authoritative);
  const savedShots = authoritative.penaltyShotsByPlayer[actorId] ?? [];
  const incomingShots = incoming.penaltyShotsByPlayer[actorId] ?? [];
  if (incomingShots.length !== savedShots.length + 1) return keepHeartbeat(incoming, authoritative);
  const shot = incomingShots[incomingShots.length - 1];
  if (!shot) return keepHeartbeat(incoming, authoritative);
  return shootRoomPenalty(authoritative, actorId, shot.direction, shot.accuracy);
}

function mergeMatches(incoming: RoomMatch[], current: RoomMatch[]) {
  const byId = new Map<string, RoomMatch>();
  for (const match of current) byId.set(match.id, match);
  for (const match of incoming) {
    const saved = byId.get(match.id);
    if (!saved) {
      byId.set(match.id, match);
      continue;
    }
    byId.set(match.id, saved.status === "done" && match.status !== "done" ? saved : { ...saved, ...match });
  }
  return Array.from(byId.values());
}

function statusRank(status: RoomStatus) {
  return { lobby: 0, drafting: 1, challenge: 2, reviewing: 3, coach: 4, cards: 5, bracket: 6, finished: 7 }[status] ?? 0;
}

export async function GET() {
  const rooms = await readRooms();
  return Response.json(
    { rooms },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function PUT(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Nao autenticado." }, { status: 401 });
  const current = await readRooms();
  const payload = (await request.json().catch(() => ({}))) as { rooms?: FriendRoom[]; actionId?: string; actionRoomId?: string };
  const playerName = currentUser.playerName?.trim() || currentUser.username;
  const teamName = currentUser.teamName?.trim() || `${playerName} FC`;
  const incomingRooms = (Array.isArray(payload.rooms) ? payload.rooms : []).map((room) => {
    const participant = room.players.some((player) =>
      player.userName.trim().toLowerCase() === playerName.toLowerCase() &&
      player.teamName.trim().toLowerCase() === teamName.toLowerCase()
    );
    const saved = current.find((item) => item.id === room.id);
    const actionId = payload.actionRoomId === room.id ? payload.actionId : undefined;
    if (saved && actionId && saved.processedActionIds?.includes(actionId)) return saved;
    if (!participant) return saved;
    const namesAllowed = validatePublicName(room.name).allowed &&
      room.players.every((player) => validatePublicName(player.userName).allowed && validatePublicName(player.teamName).allowed);
    if (!namesAllowed) return saved;
    if (!saved) return markAction(room, actionId);
    const actor = saved.players.find((player) =>
      player.userName.trim().toLowerCase() === playerName.toLowerCase() &&
      player.teamName.trim().toLowerCase() === teamName.toLowerCase()
    );
    if (actor) return markAction(authorizeDraftMutation(room, saved, actor.id), actionId);
    if (saved.status === "lobby" && saved.players.length < 16) {
      return markAction(normalizeFriendRoom({
        ...room,
        revision: Math.max(saved.revision ?? 0, room.revision ?? 0) + 1,
        updatedAt: new Date().toISOString()
      }), actionId);
    }
    return saved;
  }).filter((room): room is FriendRoom => Boolean(room));
  const mergedRooms = mergeRooms(incomingRooms, current);
  const { rooms, duplicateIds } = dedupeRecentlyCreatedRooms(mergedRooms);
  if (duplicateIds.length) await Promise.all(duplicateIds.map((roomId) => deleteSharedFriendRoom(roomId)));
  await writeRooms(rooms);
  return Response.json({ rooms });
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Nao autenticado." }, { status: 401 });
  const payload = (await request.json().catch(() => ({}))) as { roomId?: string; playerId?: string; kickPlayerId?: string };
  if (!payload.roomId) return Response.json({ error: "Sala invalida." }, { status: 400 });

  const playerName = currentUser.playerName?.trim() || currentUser.username;
  const teamName = currentUser.teamName?.trim() || `${playerName} FC`;
  const current = await readRooms();
  let deleteRoomId: string | undefined;
  const rooms = current.flatMap((room) => {
    if (room.id !== payload.roomId) return [room];
    if (payload.kickPlayerId) {
      const actor = room.players.find((player) =>
        player.userName.trim().toLowerCase() === playerName.toLowerCase() &&
        player.teamName.trim().toLowerCase() === teamName.toLowerCase()
      );
      const target = room.players.find((player) => player.id === payload.kickPlayerId);
      const targetLastSeen = target ? room.lastSeenAt?.[target.id] ?? 0 : 0;
      const actorIsHost = Boolean(actor && room.hostName.trim().toLowerCase() === actor.userName.trim().toLowerCase());
      if (!actorIsHost || !target || target.id === actor?.id || Date.now() - targetLastSeen < 20_000) return [room];
      const players = room.players.filter((player) => player.id !== target.id);
      const lastSeenAt = { ...(room.lastSeenAt ?? {}) };
      delete lastSeenAt[target.id];
      return [normalizeFriendRoom({
        ...room,
        players,
        lastSeenAt,
        revision: (room.revision ?? 0) + 1,
        updatedAt: new Date().toISOString()
      })];
    }
    const leaving = room.players.find((player) =>
      (!payload.playerId || player.id === payload.playerId) &&
      player.userName.trim().toLowerCase() === playerName.toLowerCase() &&
      player.teamName.trim().toLowerCase() === teamName.toLowerCase()
    );
    if (!leaving) return [room];
    const players = room.players.filter((player) => player.id !== leaving.id);
    if (!players.length) {
      deleteRoomId = room.id;
      return [];
    }
    const lastSeenAt = { ...(room.lastSeenAt ?? {}) };
    delete lastSeenAt[leaving.id];
    return [normalizeFriendRoom({
      ...room,
      players,
      hostName: room.hostName === leaving.userName ? players[0]!.userName : room.hostName,
      lastSeenAt,
      revision: (room.revision ?? 0) + 1,
      updatedAt: new Date().toISOString()
    })];
  });
  if (deleteRoomId) await deleteSharedFriendRoom(deleteRoomId);
  await writeRooms(rooms);
  return Response.json({ rooms });
}
