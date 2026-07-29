import type { CampaignSummary, SiteMetrics, UserAccount } from "@/types/game";
import type { FriendRoom } from "@/lib/friend-rooms";
import type { RankedMatch, RankedReward, RankedSeason } from "@/types/seasons";
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
  rankedSeasons: RankedSeason[];
  rankedMatches: RankedMatch[];
  rankedRewards: RankedReward[];
};

type SupabaseUserRow = {
  username: string;
  player_name: string | null;
  team_name: string | null;
  emblem_id: string | null;
  country: string | null;
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

type SupabaseRankedSeasonRow = {
  id: string;
  username: string;
  season_number: number;
  division: string;
  status: RankedSeason["status"];
  updated_at: string;
  state: RankedSeason;
};

type SupabaseRankedMatchRow = {
  id: string;
  idempotency_key: string;
  username: string;
  ranked_season_id: string;
  match_number: number;
  completed_at: string;
  state: RankedMatch;
};

type SupabaseRankedRewardRow = {
  id: string;
  username: string;
  reward_id: string;
  unlocked_at: string;
  state: RankedReward;
};

const dataDir = path.join(process.cwd(), ".data");
const dbFile = path.join(dataDir, "craque-ou-bagre-db.json");
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const forceLocalDb = process.env.USE_LOCAL_DB === "true";

export function hasSupabaseConfig() {
  return Boolean(!forceLocalDb && supabaseUrl && supabaseServiceKey);
}

function publicUser(user: StoredUser): UserAccount {
  return {
    username: user.username,
    playerName: user.playerName,
    teamName: user.teamName,
    emblemId: user.emblemId,
    country: user.country,
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
    emblemId: row.emblem_id ?? undefined,
    country: row.country ?? undefined,
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
    emblem_id: user.emblemId ?? null,
    country: user.country ?? null,
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
      metrics: parsed.metrics ?? { visits: 0 },
      rankedSeasons: parsed.rankedSeasons ?? [],
      rankedMatches: parsed.rankedMatches ?? [],
      rankedRewards: parsed.rankedRewards ?? []
    };
  } catch {
    return { users: [], campaigns: [], metrics: { visits: 0 }, rankedSeasons: [], rankedMatches: [], rankedRewards: [] };
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
    emblemId: "emblem-01",
    country: "Brasil",
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
    if ("emblemId" in patch) body.emblem_id = patch.emblemId ?? null;
    if ("country" in patch) body.country = patch.country ?? null;
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

export async function listRankedSeasons() {
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseRankedSeasonRow[]>("cob_ranked_seasons?select=state&order=updated_at.desc&limit=2000");
    return rows.map((row) => row.state);
  }
  return (await readLocalDb()).rankedSeasons;
}

export async function getLatestRankedSeason(username: string) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseRankedSeasonRow[]>(
      `cob_ranked_seasons?username=eq.${encodeURIComponent(username)}&select=state&order=season_number.desc&limit=1`
    );
    return rows[0]?.state;
  }
  return (await readLocalDb()).rankedSeasons
    .filter((season) => season.username.toLowerCase() === username.toLowerCase())
    .sort((a, b) => b.seasonNumber - a.seasonNumber)[0];
}

export async function saveRankedSeason(season: RankedSeason) {
  if (hasSupabaseConfig()) {
    await supabaseFetch<void>("cob_ranked_seasons?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: season.id,
        username: season.username,
        season_number: season.seasonNumber,
        division: String(season.division),
        status: season.status,
        updated_at: season.updatedAt,
        state: season
      })
    });
    return;
  }
  const db = await readLocalDb();
  db.rankedSeasons = [season, ...db.rankedSeasons.filter((item) => item.id !== season.id)].slice(0, 4000);
  await writeLocalDb(db);
}

export async function listRankedMatches(username?: string, seasonId?: string) {
  if (hasSupabaseConfig()) {
    const filters = [
      username ? `username=eq.${encodeURIComponent(username)}` : "",
      seasonId ? `ranked_season_id=eq.${encodeURIComponent(seasonId)}` : ""
    ].filter(Boolean);
    const query = filters.length ? `${filters.join("&")}&` : "";
    const rows = await supabaseFetch<SupabaseRankedMatchRow[]>(`cob_ranked_matches?${query}select=state&order=completed_at.desc&limit=4000`);
    return rows.map((row) => row.state);
  }
  return (await readLocalDb()).rankedMatches.filter(
    (match) => (!username || match.username.toLowerCase() === username.toLowerCase()) && (!seasonId || match.rankedSeasonId === seasonId)
  );
}

export async function getRankedMatchByIdempotency(username: string, idempotencyKey: string) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseFetch<SupabaseRankedMatchRow[]>(
      `cob_ranked_matches?username=eq.${encodeURIComponent(username)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=state&limit=1`
    );
    return rows[0]?.state;
  }
  return (await readLocalDb()).rankedMatches.find(
    (match) => match.username.toLowerCase() === username.toLowerCase() && match.idempotencyKey === idempotencyKey
  );
}

export async function saveRankedMatch(match: RankedMatch) {
  if (hasSupabaseConfig()) {
    await supabaseFetch<void>("cob_ranked_matches?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: match.id,
        idempotency_key: match.idempotencyKey,
        username: match.username,
        ranked_season_id: match.rankedSeasonId,
        match_number: match.matchNumber,
        completed_at: match.completedAt,
        state: match
      })
    });
    return;
  }
  const db = await readLocalDb();
  if (!db.rankedMatches.some((item) => item.id === match.id || (item.username === match.username && item.idempotencyKey === match.idempotencyKey))) {
    db.rankedMatches = [match, ...db.rankedMatches].slice(0, 12000);
    await writeLocalDb(db);
  }
}

export async function listRankedRewards(username?: string) {
  if (hasSupabaseConfig()) {
    const filter = username ? `username=eq.${encodeURIComponent(username)}&` : "";
    const rows = await supabaseFetch<SupabaseRankedRewardRow[]>(`cob_ranked_rewards?${filter}select=state&order=unlocked_at.desc&limit=4000`);
    return rows.map((row) => row.state);
  }
  return (await readLocalDb()).rankedRewards.filter((reward) => !username || reward.username.toLowerCase() === username.toLowerCase());
}

export async function saveRankedReward(reward: RankedReward) {
  if (hasSupabaseConfig()) {
    await supabaseFetch<void>("cob_ranked_rewards?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: reward.id,
        username: reward.username,
        reward_id: reward.rewardId,
        unlocked_at: reward.unlockedAt,
        state: reward
      })
    });
    return;
  }
  const db = await readLocalDb();
  if (!db.rankedRewards.some((item) => item.id === reward.id)) {
    db.rankedRewards = [reward, ...db.rankedRewards];
    await writeLocalDb(db);
  }
}
