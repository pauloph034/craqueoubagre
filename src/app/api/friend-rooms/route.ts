import { normalizeFriendRoom, normalizeFriendRooms, progressRoomRound, type FriendRoom, type RoomMatch, type RoomPlayer, type RoomStatus } from "@/lib/friend-rooms";
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
      const staleIds = normalized.filter((room) => !isFreshRoom(room)).map((room) => room.id);
      if (staleIds.length) await Promise.all(staleIds.map((roomId) => deleteSharedFriendRoom(roomId)));
      return fresh;
    }
  }
  try {
    const raw = await readFile(roomsFile, "utf8");
    const parsed = JSON.parse(raw) as { rooms?: FriendRoom[] } | FriendRoom[];
    const rooms = Array.isArray(parsed) ? parsed : parsed.rooms ?? [];
    return normalizeFriendRooms(rooms);
  } catch {
    return [];
  }
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
    Date.parse(incoming.createdAt) >= Date.parse(current.createdAt);
  if (incomingReset) return normalizeFriendRoom({ ...incoming, revision: Math.max(incoming.revision ?? 0, current.revision ?? 0) + 1 });

  const incomingRank = statusRank(incoming.status);
  const currentRank = statusRank(current.status);
  const incomingRevision = incoming.revision ?? 0;
  const currentRevision = current.revision ?? 0;
  const incomingIsCurrent = incomingRevision >= currentRevision;
  const base = incomingIsCurrent && incomingRank >= currentRank ? incoming : current;
  const status = incoming.status === "finished" || current.status === "finished" ? "finished" : incomingRank >= currentRank ? incoming.status : current.status;
  const merged = normalizeFriendRoom({
    ...base,
    status,
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
    coachOptionsByPlayer: { ...(current.coachOptionsByPlayer ?? {}), ...(incoming.coachOptionsByPlayer ?? {}) },
    selectedCoachByPlayer: { ...(current.selectedCoachByPlayer ?? {}), ...(incoming.selectedCoachByPlayer ?? {}) },
    bracket: mergeMatches(incoming.bracket, current.bracket),
    bracketRound: Math.max(incoming.bracketRound ?? 0, current.bracketRound ?? 0),
    champion: incoming.champion ?? current.champion,
    revision: Math.max(incomingRevision, currentRevision) + 1,
    updatedAt: latestDate(incoming.updatedAt || incoming.createdAt, current.updatedAt || current.createdAt)
  });
  // O ultimo resultado humano pode chegar junto com outro resultado. Avancar
  // no servidor evita que todos os clientes fiquem esperando uma nova acao.
  return merged.status === "bracket" ? progressRoomRound(merged) : merged;
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
    lastSeenAt: { ...(saved.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) }
  });
}

function authorizeDraftMutation(incoming: FriendRoom, saved: FriendRoom, actorId: string) {
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
  if (!["drafting", "reviewing"].includes(incoming.status)) return keepHeartbeat(incoming, saved);
  const players = saved.players.map((player) => (player.id === actorId ? incomingActor : player));
  const currentDrawByPlayer = { ...(saved.currentDrawByPlayer ?? {}) };
  const pendingPickByPlayer = { ...(saved.pendingPickByPlayer ?? {}) };
  if (saved.draftMode === "todos") {
    currentDrawByPlayer[actorId] = incoming.currentDrawByPlayer?.[actorId];
    pendingPickByPlayer[actorId] = incoming.pendingPickByPlayer?.[actorId];
  }
  return normalizeFriendRoom({
    ...incoming,
    players,
    lastSeenAt: { ...(saved.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) },
    currentDrawByPlayer,
    pendingPickByPlayer,
    rerollsByPlayer: { ...(saved.rerollsByPlayer ?? {}), [actorId]: newRerolls },
    revision: Math.max(saved.revision ?? 0, incoming.revision ?? 0) + 1,
    updatedAt: new Date().toISOString()
  });
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
  return { lobby: 0, drafting: 1, reviewing: 2, coach: 3, bracket: 4, finished: 5 }[status] ?? 0;
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
  const payload = (await request.json().catch(() => ({}))) as { rooms?: FriendRoom[] };
  const playerName = currentUser.playerName?.trim() || currentUser.username;
  const teamName = currentUser.teamName?.trim() || `${playerName} FC`;
  const incomingRooms = (Array.isArray(payload.rooms) ? payload.rooms : []).map((room) => {
    const participant = room.players.some((player) =>
      player.userName.trim().toLowerCase() === playerName.toLowerCase() &&
      player.teamName.trim().toLowerCase() === teamName.toLowerCase()
    );
    const saved = current.find((item) => item.id === room.id);
    if (!participant) return saved;
    const namesAllowed = validatePublicName(room.name).allowed &&
      room.players.every((player) => validatePublicName(player.userName).allowed && validatePublicName(player.teamName).allowed);
    if (!namesAllowed) return saved;
    if (!saved) return room;
    const actor = saved.players.find((player) =>
      player.userName.trim().toLowerCase() === playerName.toLowerCase() &&
      player.teamName.trim().toLowerCase() === teamName.toLowerCase()
    );
    if (actor) return authorizeDraftMutation(room, saved, actor.id);
    if (saved.status === "lobby" && saved.players.length < 16) {
      return normalizeFriendRoom({
        ...room,
        revision: Math.max(saved.revision ?? 0, room.revision ?? 0) + 1,
        updatedAt: new Date().toISOString()
      });
    }
    return saved;
  }).filter((room): room is FriendRoom => Boolean(room));
  const rooms = mergeRooms(incomingRooms, current);
  await writeRooms(rooms);
  return Response.json({ rooms });
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json({ error: "Nao autenticado." }, { status: 401 });
  const payload = (await request.json().catch(() => ({}))) as { roomId?: string };
  if (!payload.roomId) return Response.json({ error: "Sala invalida." }, { status: 400 });

  const playerName = currentUser.playerName?.trim() || currentUser.username;
  const teamName = currentUser.teamName?.trim() || `${playerName} FC`;
  const current = await readRooms();
  let deleteRoomId: string | undefined;
  const rooms = current.flatMap((room) => {
    if (room.id !== payload.roomId) return [room];
    const leaving = room.players.find(
      (player) => player.userName.trim().toLowerCase() === playerName.toLowerCase() && player.teamName.trim().toLowerCase() === teamName.toLowerCase()
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
