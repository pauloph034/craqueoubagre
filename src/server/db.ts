import type { CampaignSummary, SiteMetrics, UserAccount } from "@/types/game";
import type { FriendRoom } from "@/lib/friend-rooms";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hashPassword } from "./password";

export type StoredUser = Omit<UserAccount, "password"> & {
  passwordHash: string;
};

type LocalDb = {
  users: StoredUser[];
  campaigns: CampaignSummary[];
  metrics: SiteMetrics;
};

type SupabaseUserRow = {
  username: string;
  player_name: string | null;
  team_name: string | null;
  password_hash: string;
  role: "admin" | "player";
  created_at: string;
};

type SupabaseCampaignRow = {
  id: string;
  username: string | null;
  team_name: string;
  stage_reached: string;
  champion: boolean;
  matches_count: number;
  score: number;
  created_at: string;
  summary: CampaignSummary;
};

type SupabaseMetricsRow = {
  key: string;
  visits: number;
  first_visit_at: string | null;
  last_visit_at: string | null;
};

type SupabaseFriendRoomRow = {
  id: string;
  room: FriendRoom;
  updated_at: string;
};

const dataDir = path.join(process.cwd(), ".data");
const dbFile = path.join(dataDir, "craque-ou-bagre-db.json");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseServiceKey);
}

function publicUser(user: StoredUser): UserAccount {
  return {
    username: user.username,
    playerName: user.playerName,
    teamName: user.teamName,
    password: "",
    role: user.role,
    createdAt: user.createdAt
  };
}

function toStoredUser(row: SupabaseUserRow): StoredUser {
  return {
    username: row.username,
    playerName: row.player_name ?? undefined,
    teamName: row.team_name ?? undefined,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at
  };
}

function toUserRow(user: StoredUser): SupabaseUserRow {
  return {
    username: user.username,
    player_name: user.playerName ?? null,
    team_name: user.teamName ?? null,
    password_hash: user.passwordHash,
    role: user.role,
    created_at: user.createdAt
  };
}

async function supabaseFetch<T>(pathName: string, init: RequestInit = {}) {
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Supabase nao configurado.");
  const response = await fetch(`${supabaseUrl}/rest/v1/${pathName}`, {
    ...init,
    headers: {
      apikey: supabaseServiceKey,
      Authorization: `Bearer ${supabaseServiceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase ${response.status}: ${text}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function readLocalDb(): Promise<LocalDb> {
  try {
    const raw = await readFile(dbFile, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalDb>;
    return {
      users: parsed.users ?? [],
      campaigns: parsed.campaigns ?? [],
      metrics: parsed.metrics ?? { visits: 0 }
    };
  } catch {
    return { users: [], campaigns: [], metrics: { visits: 0 } };
  }
}

async function writeLocalDb(db: LocalDb) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dbFile, JSON.stringify(db, null, 2), "utf8");
}

export function sanitizeUser(user: StoredUser) {
  return publicUser(user);
}

export async function ensureAdminUser() {
  const username = process.env.ADMIN_USERNAME?.trim() || "admin";
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin0033");
  if (!password) return;
  const existing = await getStoredUser(username);
  if (existing) return;
  await createStoredUser({
    username,
    playerName: "Admin",
    teamName: "Admin FC",
    passwordHash: hashPassword(password),
    role: "admin",
    createdAt: new Date().toISOString()
  });
}

export async function getStoredUser(username: string) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseUserRow[]>(`cob_users?username=eq.${encodeURIComponent(username)}&select=*`);
    return rows[0] ? toStoredUser(rows[0]) : undefined;
  }
  const db = await readLocalDb();
  return db.users.find((user) => user.username.toLowerCase() === username.toLowerCase());
}

export async function listStoredUsers() {
  await ensureAdminUser();
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseUserRow[]>("cob_users?select=*&order=created_at.desc");
    return rows.map(toStoredUser);
  }
  const db = await readLocalDb();
  return db.users.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function createStoredUser(user: StoredUser) {
  if (hasSupabaseConfig()) {
    await supabaseFetch<SupabaseUserRow[]>("cob_users", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toUserRow(user))
    });
    return user;
  }
  const db = await readLocalDb();
  db.users = [user, ...db.users.filter((item) => item.username.toLowerCase() !== user.username.toLowerCase())];
  await writeLocalDb(db);
  return user;
}

export async function updateStoredUser(username: string, patch: Partial<Omit<StoredUser, "username" | "createdAt">>) {
  if (hasSupabaseConfig()) {
    const body: Partial<SupabaseUserRow> = {};
    if ("playerName" in patch) body.player_name = patch.playerName ?? null;
    if ("teamName" in patch) body.team_name = patch.teamName ?? null;
    if ("passwordHash" in patch && patch.passwordHash) body.password_hash = patch.passwordHash;
    if ("role" in patch && patch.role) body.role = patch.role;
    const rows = await supabaseFetch<SupabaseUserRow[]>(`cob_users?username=eq.${encodeURIComponent(username)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body)
    });
    return rows[0] ? toStoredUser(rows[0]) : undefined;
  }
  const db = await readLocalDb();
  let updated: StoredUser | undefined;
  db.users = db.users.map((user) => {
    if (user.username.toLowerCase() !== username.toLowerCase()) return user;
    updated = { ...user, ...patch };
    return updated;
  });
  await writeLocalDb(db);
  return updated;
}

export async function deleteStoredUser(username: string) {
  if (hasSupabaseConfig()) {
    await supabaseFetch<void>(`cob_users?username=eq.${encodeURIComponent(username)}`, { method: "DELETE" });
    return true;
  }
  const db = await readLocalDb();
  const before = db.users.length;
  db.users = db.users.filter((user) => user.username.toLowerCase() !== username.toLowerCase());
  await writeLocalDb(db);
  return db.users.length !== before;
}

export async function listPublicUsers() {
  return (await listStoredUsers()).map(publicUser);
}

export async function saveCampaignSummary(summary: CampaignSummary) {
  if (hasSupabaseConfig()) {
    await supabaseFetch<SupabaseCampaignRow[]>("cob_campaigns", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        id: summary.id,
        username: summary.config.userName,
        team_name: summary.config.teamName,
        stage_reached: summary.stageReached,
        champion: summary.champion,
        matches_count: summary.matches.length,
        score: summary.score,
        created_at: summary.date,
        summary
      })
    });
    return;
  }
  const db = await readLocalDb();
  db.campaigns = [summary, ...db.campaigns.filter((item) => item.id !== summary.id)].slice(0, 1000);
  await writeLocalDb(db);
}

export async function listCampaignSummaries() {
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseCampaignRow[]>("cob_campaigns?select=summary&order=created_at.desc&limit=1000");
    return rows.map((row) => row.summary);
  }
  const db = await readLocalDb();
  return db.campaigns;
}

export async function getMetrics() {
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseMetricsRow[]>("cob_metrics?key=eq.global&select=*");
    const row = rows[0];
    return row ? { visits: row.visits, firstVisitAt: row.first_visit_at ?? undefined, lastVisitAt: row.last_visit_at ?? undefined } : { visits: 0 };
  }
  const db = await readLocalDb();
  return db.metrics;
}

export async function recordVisit() {
  const now = new Date().toISOString();
  if (hasSupabaseConfig()) {
    const current = await getMetrics();
    const next = { visits: current.visits + 1, firstVisitAt: current.firstVisitAt ?? now, lastVisitAt: now };
    const exists = current.visits > 0 || current.firstVisitAt;
    if (exists) {
      await supabaseFetch<void>("cob_metrics?key=eq.global", {
        method: "PATCH",
        body: JSON.stringify({ visits: next.visits, first_visit_at: next.firstVisitAt, last_visit_at: next.lastVisitAt })
      });
    } else {
      await supabaseFetch<void>("cob_metrics", {
        method: "POST",
        body: JSON.stringify({ key: "global", visits: next.visits, first_visit_at: next.firstVisitAt, last_visit_at: next.lastVisitAt })
      });
    }
    return next;
  }
  const db = await readLocalDb();
  db.metrics = { visits: db.metrics.visits + 1, firstVisitAt: db.metrics.firstVisitAt ?? now, lastVisitAt: now };
  await writeLocalDb(db);
  return db.metrics;
}

export async function listSharedFriendRooms() {
  if (!hasSupabaseConfig()) return undefined;
  const rows = await supabaseFetch<SupabaseFriendRoomRow[]>("cob_friend_rooms?select=room,updated_at&order=updated_at.desc&limit=80");
  return rows.map((row) => row.room);
}

export async function saveSharedFriendRooms(rooms: FriendRoom[]) {
  if (!hasSupabaseConfig()) return false;
  if (rooms.length === 0) return true;
  await supabaseFetch<void>("cob_friend_rooms?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(
      rooms.map((room) => ({
        id: room.id,
        room,
        updated_at: room.updatedAt || new Date().toISOString()
      }))
    )
  });
  return true;
}
