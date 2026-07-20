import { normalizeFriendRoom, normalizeFriendRooms, type FriendRoom, type RoomMatch, type RoomPlayer, type RoomStatus } from "@/lib/friend-rooms";
import { hasSupabaseConfig, listSharedFriendRooms, saveSharedFriendRooms } from "@/server/db";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".local");
const roomsFile = path.join(dataDir, "friend-rooms.json");

async function readRooms() {
  if (hasSupabaseConfig()) {
    const sharedRooms = await listSharedFriendRooms();
    if (sharedRooms) return normalizeFriendRooms(sharedRooms).filter(isFreshRoom);
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
  if (incomingReset) return normalizeFriendRoom(incoming);

  const incomingRank = statusRank(incoming.status);
  const currentRank = statusRank(current.status);
  const base = incomingRank >= currentRank ? incoming : current;
  const status = incoming.status === "finished" || current.status === "finished" ? "finished" : incomingRank >= currentRank ? incoming.status : current.status;
  return normalizeFriendRoom({
    ...base,
    status,
    lastSeenAt: { ...(current.lastSeenAt ?? {}), ...(incoming.lastSeenAt ?? {}) },
    players: mergePlayers(incoming.players, current.players),
    turnIndex: base.turnIndex ?? 0,
    turnOptions: base.turnOptions ?? [],
    currentDraw: base.currentDraw,
    pendingPickId: base.pendingPickId,
    rerollsByPlayer: base.rerollsByPlayer ?? {},
    picksInTurn: base.picksInTurn ?? 0,
    turnStartedAt: base.turnStartedAt,
    reviewEndsAt: base.reviewEndsAt,
    coachOptionsByPlayer: { ...(current.coachOptionsByPlayer ?? {}), ...(incoming.coachOptionsByPlayer ?? {}) },
    selectedCoachByPlayer: { ...(current.selectedCoachByPlayer ?? {}), ...(incoming.selectedCoachByPlayer ?? {}) },
    bracket: mergeMatches(incoming.bracket, current.bracket),
    bracketRound: Math.max(incoming.bracketRound ?? 0, current.bracketRound ?? 0),
    champion: incoming.champion ?? current.champion,
    updatedAt: latestDate(incoming.updatedAt || incoming.createdAt, current.updatedAt || current.createdAt)
  });
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
  const current = await readRooms();
  const payload = (await request.json().catch(() => ({}))) as { rooms?: FriendRoom[] };
  const rooms = mergeRooms(Array.isArray(payload.rooms) ? payload.rooms : [], current);
  await writeRooms(rooms);
  return Response.json({ rooms });
}
