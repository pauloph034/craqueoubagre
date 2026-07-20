"use client";

import { difficultyRules } from "@/config/game-balance";
import { getFormationSlots } from "@/config/formations";
import { coaches } from "@/data/coaches";
import { clubSeasons, opponents, players } from "@/data/loaders";
import { drawClubSeason, eligiblePlayers } from "@/game-engine/draft-engine";
import { simulateMatch } from "@/game-engine/match-engine";
import { campaignOpponents } from "@/game-engine/opponent-generator";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { createCampaignSeed, createRng } from "@/game-engine/rng";
import { calculateScore, unlockedAchievements } from "@/game-engine/scoring-engine";
import { calculateChemistry } from "@/game-engine/chemistry";
import { calculateTeamRating } from "@/game-engine/team-rating";
import { storage } from "@/lib/storage";
import type { BracketMatch, CampaignConfig, CampaignSummary, ClubSeason, Coach, DraftPick, GamePhase, GroupStanding, MatchResult, Player, Position, TacticalStyle, Difficulty, UserAccount } from "@/types/game";
import { create } from "zustand";

type DrawState = {
  clubSeason: ClubSeason;
  roster: Player[];
  options: Player[];
  slotId?: string;
  slotPosition?: Position;
};

type TournamentTeam = {
  id: string;
  name: string;
  baseName: string;
  season?: string;
  clubSeasonId?: string;
  strength: number;
  country: string;
  primaryColor: string;
  secondaryColor: string;
};

type GameState = {
  phase: GamePhase;
  config: CampaignConfig;
  selectedSlotId?: string;
  pendingPlayerId?: string;
  currentDraw?: DrawState;
  coachDraw?: Coach;
  coachOptions: Coach[];
  coachDrawCount: number;
  selectedCoach?: Coach;
  campaignSchedule: ReturnType<typeof campaignOpponents>;
  campaignMatches: MatchResult[];
  campaignStep: number;
  showGroupTable: boolean;
  groupTables: GroupStanding[];
  qualifiedTeams: string[];
  squad: DraftPick[];
  drawHistory: string[];
  rerollsLeft: number;
  swapsLeft: number;
  undoAvailable: boolean;
  undoUsed: boolean;
  swapsUsed: number;
  rerollsUsed: number;
  lastSummary?: CampaignSummary;
  history: CampaignSummary[];
  users: UserAccount[];
  currentUser?: UserAccount;
  authError?: string;
  audioEnabled: boolean;
  volume: number;
  startDraft: (config: Partial<CampaignConfig>) => void;
  selectSlot: (slotId: string) => void;
  drawForSlot: (slotId?: string) => void;
  reroll: () => void;
  choosePlayer: (playerId: string) => void;
  placePendingPlayer: (slotId: string) => void;
  clearPendingPlayer: () => void;
  drawCoach: () => void;
  confirmCoach: (coachId: string) => void;
  swapSlot: (slotId: string) => void;
  undoLast: () => void;
  confirmSquad: () => void;
  simulate: () => void;
  startCampaign: () => void;
  simulateNextMatch: () => void;
  revealGroupTable: () => void;
  continueAfterGroup: () => void;
  reset: () => void;
  loadAccount: () => Promise<void>;
  register: (username: string, password: string, teamName: string) => Promise<boolean>;
  login: (username: string, password: string) => Promise<boolean>;
  updateProfile: (values: { playerName: string; teamName: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  adminResetPassword: (username: string) => Promise<string | undefined>;
  adminDeleteUser: (username: string) => Promise<boolean>;
  adminToggleRole: (username: string) => Promise<boolean>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<boolean>;
  loadHistory: () => void;
  deleteHistory: (id: string) => void;
  updateSettings: (settings: { audioEnabled?: boolean; volume?: number }) => void;
};

const initialConfig: CampaignConfig = {
  seed: createCampaignSeed(),
  userName: "Jogador",
  teamName: "Craque ou Bagre",
  formation: "4-3-3",
  tacticalStyle: "equilibrado",
  difficulty: "classico"
};

function counters(difficulty: Difficulty) {
  const rules = difficultyRules[difficulty];
  return { rerollsLeft: rules.rerolls, swapsLeft: rules.swaps };
}

function normalizeAccount(user: UserAccount): UserAccount {
  const playerName = user.playerName?.trim() || user.username;
  const teamName = user.teamName?.trim() || (user.role === "admin" ? "Admin FC" : `${playerName} FC`);
  return { ...user, playerName, teamName, password: "" };
}

function accountTeamName(user: UserAccount) {
  return user.teamName?.trim() || `${user.playerName?.trim() || user.username} FC`;
}

type ApiUserResponse = { user?: UserAccount | null; users?: UserAccount[]; password?: string; error?: string };

async function apiRequest<T extends ApiUserResponse>(url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {})
    }
  });
  const data = (await response.json().catch(() => ({}))) as T;
  if (!response.ok) throw new Error(data.error || "Operacao indisponivel.");
  return data;
}

async function loadAdminUsers() {
  const data = await apiRequest<ApiUserResponse>("/api/admin/users");
  return (data.users ?? []).map(normalizeAccount);
}

function persistCampaign(summary: CampaignSummary) {
  if (typeof window === "undefined") return;
  window.fetch("/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary })
  }).catch(() => undefined);
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "setup",
  config: initialConfig,
  campaignSchedule: [],
  campaignMatches: [],
  campaignStep: 0,
  showGroupTable: false,
  groupTables: [],
  qualifiedTeams: [],
  coachDrawCount: 0,
  coachOptions: [],
  squad: [],
  drawHistory: [],
  ...counters("classico"),
  undoAvailable: false,
  undoUsed: false,
  swapsUsed: 0,
  rerollsUsed: 0,
  history: [],
  users: [],
  currentUser: undefined,
  authError: undefined,
  audioEnabled: false,
  volume: 0.5,
  startDraft: (partial) => {
    const currentUser = get().currentUser;
    const accountConfig = currentUser
      ? { userName: currentUser.username, teamName: accountTeamName(currentUser) }
      : {};
    const config = { ...initialConfig, ...partial, seed: partial.seed || createCampaignSeed(), ...accountConfig } as CampaignConfig;
    set({
      phase: "drafting",
      config,
      squad: [],
      currentDraw: undefined,
      coachDraw: undefined,
      coachOptions: [],
      coachDrawCount: 0,
      selectedCoach: undefined,
      campaignSchedule: [],
      campaignMatches: [],
      campaignStep: 0,
      showGroupTable: false,
      groupTables: [],
      qualifiedTeams: [],
      drawHistory: [],
      selectedSlotId: undefined,
      ...counters(config.difficulty),
      undoAvailable: false,
      undoUsed: false,
      swapsUsed: 0,
      rerollsUsed: 0
    });
  },
  selectSlot: (slotId) => set({ selectedSlotId: slotId }),
  drawForSlot: (slotId) => {
    const state = get();
    const slots = getFormationSlots(state.config.formation, state.config.tacticalStyle);
    const slot = slotId ? slots.find((item) => item.id === slotId) : undefined;
    const openSlots = slots.filter((item) => !state.squad.some((pick) => pick.slotId === item.id));
    if (slotId && !slot) return;
    if (openSlots.length === 0) return;
    const drawTarget = slot?.position ?? "ANY";
    const rng = createRng(`${state.config.seed}-draw-${state.drawHistory.length}-${slot?.id ?? "any"}-${state.rerollsUsed}`);
    const selectedCanonicalIds = state.squad.map((pick) => pick.player.canonicalPlayerId);
    const appearanceCounts = state.drawHistory.reduce<Record<string, number>>((acc, id) => {
      acc[id] = (acc[id] ?? 0) + 1;
      return acc;
    }, {});
    const clubSeason = drawClubSeason(rng, clubSeasons, players, drawTarget, {
      difficulty: state.config.difficulty,
      selectedCanonicalIds,
      appearanceCounts,
      recentClubSeasonIds: state.drawHistory
    });
    const roster = players.filter((player) => player.clubSeasonId === clubSeason.id && player.isActive);
    const options =
      drawTarget === "ANY"
        ? roster.filter((player) => !selectedCanonicalIds.includes(player.canonicalPlayerId) && openSlots.some((openSlot) => calculatePositionFit(player, openSlot.position).allowed))
        : eligiblePlayers(players, clubSeason.id, drawTarget, selectedCanonicalIds);
    set({ currentDraw: { clubSeason, roster, options, slotId: slot?.id, slotPosition: slot?.position }, selectedSlotId: slot?.id, pendingPlayerId: undefined });
  },
  reroll: () => {
    const state = get();
    if (!state.currentDraw || state.rerollsLeft <= 0) return;
    set({ rerollsLeft: state.rerollsLeft - 1, rerollsUsed: state.rerollsUsed + 1, drawHistory: [...state.drawHistory, state.currentDraw.clubSeason.id] });
    get().drawForSlot(state.currentDraw.slotId);
  },
  choosePlayer: (playerId) => {
    const state = get();
    const draw = state.currentDraw;
    if (!draw) return;
    const player = draw.options.find((item) => item.id === playerId);
    if (!player || state.squad.some((pick) => pick.player.canonicalPlayerId === player.canonicalPlayerId)) return;
    if (!draw.slotId || !draw.slotPosition) {
      set({ pendingPlayerId: playerId });
      return;
    }
    const fit = calculatePositionFit(player, draw.slotPosition);
    if (!fit.allowed) return;
    const pick: DraftPick = {
      slotId: draw.slotId,
      slotPosition: draw.slotPosition,
      player,
      clubSeason: draw.clubSeason,
      effectiveRating: fit.effectiveRating,
      fitType: fit.type
    };
    set({
      squad: [...state.squad.filter((item) => item.slotId !== draw.slotId), pick],
      currentDraw: undefined,
      pendingPlayerId: undefined,
      selectedSlotId: undefined,
      drawHistory: [...state.drawHistory, draw.clubSeason.id],
      undoAvailable: difficultyRules[state.config.difficulty].undo && !state.undoUsed
    });
    window.setTimeout(() => {
      if (get().undoAvailable) set({ undoAvailable: false });
    }, 10000);
  },
  placePendingPlayer: (slotId) => {
    const state = get();
    const draw = state.currentDraw;
    const player = draw?.options.find((item) => item.id === state.pendingPlayerId);
    const slot = getFormationSlots(state.config.formation, state.config.tacticalStyle).find((item) => item.id === slotId);
    if (!draw || !player || !slot) return;
    if (state.squad.some((pick) => pick.player.canonicalPlayerId === player.canonicalPlayerId || pick.slotId === slotId)) return;
    const fit = calculatePositionFit(player, slot.position);
    if (!fit.allowed) return;
    const pick: DraftPick = {
      slotId,
      slotPosition: slot.position,
      player,
      clubSeason: draw.clubSeason,
      effectiveRating: fit.effectiveRating,
      fitType: fit.type
    };
    set({
      squad: [...state.squad, pick],
      currentDraw: undefined,
      pendingPlayerId: undefined,
      selectedSlotId: undefined,
      drawHistory: [...state.drawHistory, draw.clubSeason.id],
      undoAvailable: difficultyRules[state.config.difficulty].undo && !state.undoUsed
    });
    window.setTimeout(() => {
      if (get().undoAvailable) set({ undoAvailable: false });
    }, 10000);
  },
  clearPendingPlayer: () => set({ pendingPlayerId: undefined }),
  drawCoach: () => {
    const state = get();
    if (state.coachDrawCount >= 1 || state.selectedCoach) return;
    const nextCount = state.coachDrawCount + 1;
    const rng = createRng(`${state.config.seed}-coach-${state.squad.length}-${nextCount}`);
    const pool = [...coaches].sort(() => rng.next() - 0.5).slice(0, 3);
    set({ coachOptions: pool, coachDraw: pool[0], coachDrawCount: nextCount });
  },
  confirmCoach: (coachId) => {
    const state = get();
    const coach = state.coachOptions.find((item) => item.id === coachId) ?? state.coachDraw;
    if (!coach) return;
    set({ selectedCoach: coach, coachDraw: coach, phase: "campaignReady" });
  },
  swapSlot: (slotId) => {
    const state = get();
    if (state.config.difficulty === "lenda" || state.swapsLeft <= 0 || state.phase !== "drafting") return;
    const pick = state.squad.find((item) => item.slotId === slotId);
    if (!pick) return;
    set({ squad: state.squad.filter((item) => item.slotId !== slotId), swapsLeft: state.swapsLeft - 1, swapsUsed: state.swapsUsed + 1 });
    get().drawForSlot(slotId);
  },
  undoLast: () => {
    const state = get();
    if (!state.undoAvailable || state.undoUsed || state.squad.length === 0) return;
    set({ squad: state.squad.slice(0, -1), undoAvailable: false, undoUsed: true });
  },
  confirmSquad: () => {
    const state = get();
    if (state.squad.length !== 11) return;
    set({ phase: "coachSelection", coachDraw: undefined, coachOptions: [], coachDrawCount: 0 });
  },
  simulate: () => {
    const state = get();
    if (state.squad.length !== 11) return;
    const schedule = enrichSchedule(campaignOpponents(createRng(`${state.config.seed}-campaign`)));
    const rng = createRng(`${state.config.seed}-instant-campaign`);
    const matches = schedule.map((item) => simulateMatch({ rng, squad: state.squad, tacticalStyle: state.selectedCoach?.style ?? state.config.tacticalStyle, difficulty: state.config.difficulty, opponent: item.opponent, phase: item.phase, knockout: item.knockout }));
    const last = matches.at(-1);
    const champion = matches.length === 7 && last ? last.userGoals > last.opponentGoals : false;
    const stageReached = champion ? "Campeao" : last?.phase ?? "Fase inicial";
    const base = {
      id: `${state.config.seed}-${Date.now()}`,
      date: new Date().toISOString(),
      config: state.config,
      squad: state.squad,
      coach: state.selectedCoach,
      matches,
      stageReached,
      champion,
      rerollsUsed: state.rerollsUsed,
      swapsUsed: state.swapsUsed,
      undoUsed: state.undoUsed
    };
    const score = calculateScore({ ...base, config: state.config });
    const summary = { ...base, score, achievements: unlockedAchievements({ ...base, score }) };
    const history = [summary, ...state.history].slice(0, 100);
    storage.saveHistory(history);
    persistCampaign(summary);
    set({ phase: "campaignFinished", lastSummary: summary, history });
  },
  startCampaign: () => {
    const state = get();
    if (state.squad.length !== 11 || !state.selectedCoach) return;
    set({
      phase: "simulating",
      campaignSchedule: enrichSchedule(campaignOpponents(createRng(`${state.config.seed}-campaign`))),
      campaignMatches: [],
      campaignStep: 0,
      showGroupTable: false,
      groupTables: [],
      qualifiedTeams: []
    });
  },
  simulateNextMatch: () => {
    const state = get();
    const item = state.campaignSchedule[state.campaignStep];
    if (!item || state.showGroupTable) return;
    const rng = createRng(`${state.config.seed}-match-${state.campaignStep}-${state.selectedCoach?.id ?? "coach"}`);
    const result = simulateMatch({
      rng,
      squad: state.squad,
      tacticalStyle: state.selectedCoach?.style ?? state.config.tacticalStyle,
      difficulty: state.config.difficulty,
      opponent: item.opponent,
      phase: item.phase,
      knockout: item.knockout
    });
    const matches = [...state.campaignMatches, result];
    const nextStep = state.campaignStep + 1;
    if (nextStep === 3) {
      set({ campaignMatches: matches, campaignStep: nextStep, showGroupTable: false });
      return;
    }
    if (item.knockout && result.userGoals < result.opponentGoals) {
      const final = buildFinishedCampaign(get(), matches, `Eliminado em ${result.phase}`, false, undefined, simulateRemainingTournament(get(), matches, nextStep));
      storage.saveHistory(final.history);
      persistCampaign(final.summary);
      set({ phase: "campaignFinished", campaignMatches: matches, lastSummary: final.summary, history: final.history });
      return;
    }
    if (nextStep >= state.campaignSchedule.length) {
      const final = buildFinishedCampaign(get(), matches, "Campeao", true);
      storage.saveHistory(final.history);
      persistCampaign(final.summary);
      set({ phase: "campaignFinished", campaignMatches: matches, lastSummary: final.summary, history: final.history });
      return;
    }
    set({ campaignMatches: matches, campaignStep: nextStep });
  },
  revealGroupTable: () => {
    const state = get();
    const groups = buildGroupStage(state, state.campaignMatches.slice(0, 3));
    set({ showGroupTable: true, groupTables: groups.groupTables, qualifiedTeams: groups.qualifiedTeams });
  },
  continueAfterGroup: () => {
    const state = get();
    const groups = state.qualifiedTeams.length ? { groupTables: state.groupTables, qualifiedTeams: state.qualifiedTeams } : buildGroupStage(state, state.campaignMatches.slice(0, 3));
    const qualified = groups.qualifiedTeams.includes(state.config.teamName);
    const knockoutSchedule = buildKnockoutSchedule(state, groups.qualifiedTeams);
    const campaignSchedule = [...state.campaignSchedule.slice(0, 3), ...knockoutSchedule];
    if (!qualified) {
      const final = buildFinishedCampaign({ ...state, campaignSchedule, qualifiedTeams: groups.qualifiedTeams }, state.campaignMatches, "Eliminado na fase de grupos", false, undefined, simulateRemainingTournament({ ...state, campaignSchedule, qualifiedTeams: groups.qualifiedTeams }, state.campaignMatches, 3));
      storage.saveHistory(final.history);
      persistCampaign(final.summary);
      set({ phase: "campaignFinished", campaignSchedule, lastSummary: final.summary, history: final.history, showGroupTable: false, groupTables: groups.groupTables, qualifiedTeams: groups.qualifiedTeams });
      return;
    }
    set({ showGroupTable: false, campaignSchedule, campaignStep: 3, groupTables: groups.groupTables, qualifiedTeams: groups.qualifiedTeams });
  },
  reset: () => set({ phase: "setup", config: { ...initialConfig, seed: createCampaignSeed() }, squad: [], currentDraw: undefined, coachDraw: undefined, coachOptions: [], coachDrawCount: 0, selectedCoach: undefined, campaignSchedule: [], campaignMatches: [], campaignStep: 0, showGroupTable: false, groupTables: [], qualifiedTeams: [], drawHistory: [], ...counters("classico") }),
  loadAccount: async () => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/auth/session");
      const currentUser = data.user ? normalizeAccount(data.user) : undefined;
      const users = currentUser?.role === "admin" ? await loadAdminUsers() : [];
      set((state) => ({
        users,
        currentUser,
        authError: undefined,
        config: currentUser ? { ...state.config, userName: currentUser.username, teamName: accountTeamName(currentUser) } : state.config
      }));
    } catch (error) {
      set({ users: [], currentUser: undefined, authError: error instanceof Error ? error.message : "Sessao indisponivel." });
    }
  },
  register: async (username, password, teamName) => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/auth/register", { method: "POST", body: JSON.stringify({ username, password, teamName }) });
      const user = data.user ? normalizeAccount(data.user) : undefined;
      if (!user) throw new Error("Cadastro indisponivel.");
      set((state) => ({ currentUser: user, users: [], authError: undefined, config: { ...state.config, userName: user.username, teamName: accountTeamName(user) } }));
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Nao foi possivel criar conta." });
      return false;
    }
  },
  login: async (username, password) => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
      const user = data.user ? normalizeAccount(data.user) : undefined;
      if (!user) throw new Error("Login indisponivel.");
      const users = user.role === "admin" ? await loadAdminUsers() : [];
      set((state) => ({ users, currentUser: user, authError: undefined, config: { ...state.config, userName: user.username, teamName: accountTeamName(user) } }));
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Usuario ou senha invalido." });
      return false;
    }
  },
  updateProfile: async ({ playerName, teamName }) => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/auth/profile", { method: "PATCH", body: JSON.stringify({ playerName, teamName }) });
      const user = data.user ? normalizeAccount(data.user) : undefined;
      if (!user) throw new Error("Perfil indisponivel.");
      set((state) => ({
        currentUser: user,
        users: state.users.map((item) => (item.username === user.username ? user : item)),
        authError: undefined,
        config: { ...state.config, userName: user.username, teamName: accountTeamName(user) }
      }));
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Nao foi possivel salvar perfil." });
      return false;
    }
  },
  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    set({ currentUser: undefined, users: [], authError: undefined });
  },
  adminResetPassword: async (username) => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "reset-password", username }) });
      set({ users: (data.users ?? []).map(normalizeAccount), authError: undefined });
      return data.password;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Nao foi possivel gerar senha." });
      return undefined;
    }
  },
  adminDeleteUser: async (username) => {
    try {
      const data = await apiRequest<ApiUserResponse>(`/api/admin/users?username=${encodeURIComponent(username)}`, { method: "DELETE" });
      set({ users: (data.users ?? []).map(normalizeAccount), authError: undefined });
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Nao foi possivel excluir usuario." });
      return false;
    }
  },
  adminToggleRole: async (username) => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/admin/users", { method: "POST", body: JSON.stringify({ action: "toggle-role", username }) });
      set({ users: (data.users ?? []).map(normalizeAccount), authError: undefined });
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Nao foi possivel alterar acesso." });
      return false;
    }
  },
  changePassword: async (currentPassword, nextPassword) => {
    try {
      const data = await apiRequest<ApiUserResponse>("/api/auth/password", { method: "PATCH", body: JSON.stringify({ currentPassword, nextPassword }) });
      const user = data.user ? normalizeAccount(data.user) : undefined;
      if (!user) throw new Error("Senha indisponivel.");
      set({ currentUser: user, authError: undefined });
      return true;
    } catch (error) {
      set({ authError: error instanceof Error ? error.message : "Nao foi possivel alterar a senha." });
      return false;
    }
  },
  loadHistory: () => set({ history: storage.loadHistory() }),
  deleteHistory: (id) => {
    const history = get().history.filter((item) => item.id !== id);
    storage.saveHistory(history);
    set({ history });
  },
  updateSettings: (settings) => set((state) => ({ ...state, ...settings }))
}));

export function useTeamMetrics() {
  const squad = useGameStore((state) => state.squad);
  return { rating: calculateTeamRating(squad), chemistry: calculateChemistry(squad) };
}

function buildFinishedCampaign(state: GameState, matches: MatchResult[], stageReached: string, champion: boolean, tournamentChampion?: string, tournamentBracket: BracketMatch[] = []) {
  const championName = champion ? state.config.teamName : tournamentChampion ?? tournamentBracket.at(-1)?.winnerName;
  const base = {
    id: `${state.config.seed}-${Date.now()}`,
    date: new Date().toISOString(),
    config: state.config,
    squad: state.squad,
    coach: state.selectedCoach,
    matches,
    stageReached,
    champion,
    tournamentChampion: championName,
    tournamentBracket,
    rerollsUsed: state.rerollsUsed,
    swapsUsed: state.swapsUsed,
    undoUsed: state.undoUsed
  };
  const score = calculateScore({ ...base, config: state.config });
  const summary = { ...base, score, achievements: unlockedAchievements({ ...base, score }) };
  return { summary, history: [summary, ...state.history].slice(0, 100) };
}

function groupRank(teamName: string, matches: MatchResult[]) {
  const rows = [
    {
      name: teamName,
      pts: matches.reduce((sum, match) => sum + (match.userGoals > match.opponentGoals ? 3 : match.userGoals === match.opponentGoals ? 1 : 0), 0),
      gf: matches.reduce((sum, match) => sum + match.userGoals, 0),
      ga: matches.reduce((sum, match) => sum + match.opponentGoals, 0)
    },
    ...matches.map((match) => ({
      name: match.opponentName,
      pts: match.opponentGoals > match.userGoals ? 3 : match.opponentGoals === match.userGoals ? 1 : 0,
      gf: match.opponentGoals,
      ga: match.userGoals
    }))
  ].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  return rows.findIndex((row) => row.name === teamName) + 1;
}

function buildGroupStage(state: GameState, userMatches: MatchResult[]) {
  const rng = createRng(`${state.config.seed}-parallel-groups`);
  const userGroupNames = unique([state.config.teamName, ...userMatches.map((match) => match.opponentName)]);
  const used = new Set(userGroupNames);
  const groupTables: GroupStanding[] = [
    {
      groupName: "Grupo A",
      rows: rankRows([
        {
          name: state.config.teamName,
          pts: userMatches.reduce((sum, match) => sum + (match.userGoals > match.opponentGoals ? 3 : match.userGoals === match.opponentGoals ? 1 : 0), 0),
          gf: userMatches.reduce((sum, match) => sum + match.userGoals, 0),
          ga: userMatches.reduce((sum, match) => sum + match.opponentGoals, 0),
          qualified: false
        },
        ...userMatches.map((match) => ({
          name: match.opponentName,
          pts: match.opponentGoals > match.userGoals ? 3 : match.opponentGoals === match.userGoals ? 1 : 0,
          gf: match.opponentGoals,
          ga: match.userGoals,
          qualified: false
        }))
      ])
    }
  ];

  const pool = tournamentTeamPool()
    .filter((team) => !used.has(team.name))
    .sort(() => rng.next() - 0.5);

  for (let groupIndex = 1; groupIndex < 8; groupIndex++) {
    const groupTeams = pool.splice(0, 4);
    groupTeams.forEach((team) => used.add(team.name));
    groupTables.push({
      groupName: `Grupo ${String.fromCharCode(65 + groupIndex)}`,
      rows: simulateAiGroup(groupTeams, createRng(`${state.config.seed}-group-${groupIndex}`))
    });
  }

  const qualifiedTeams = unique(groupTables.flatMap((group) => group.rows.filter((row) => row.qualified).map((row) => row.name))).slice(0, 16);
  return { groupTables, qualifiedTeams };
}

function simulateAiGroup(groupTeams: TournamentTeam[], rng: ReturnType<typeof createRng>) {
  const rows = groupTeams.map((team) => ({ name: team.name, strength: team.strength, pts: 0, gf: 0, ga: 0, qualified: false }));
  for (let home = 0; home < rows.length; home++) {
    for (let away = home + 1; away < rows.length; away++) {
      const homeRow = rows[home]!;
      const awayRow = rows[away]!;
      const strengthGap = (homeRow.strength - awayRow.strength) / 18;
      const homeGoals = Math.max(0, rng.int(0, 3) + (strengthGap > 0.45 && rng.next() > 0.45 ? 1 : 0));
      const awayGoals = Math.max(0, rng.int(0, 3) + (strengthGap < -0.45 && rng.next() > 0.45 ? 1 : 0));
      homeRow.gf += homeGoals;
      homeRow.ga += awayGoals;
      awayRow.gf += awayGoals;
      awayRow.ga += homeGoals;
      if (homeGoals > awayGoals) homeRow.pts += 3;
      else if (awayGoals > homeGoals) awayRow.pts += 3;
      else {
        homeRow.pts += 1;
        awayRow.pts += 1;
      }
    }
  }
  return rankRows(rows.map(({ strength: _strength, ...row }) => row));
}

function rankRows(rows: GroupStanding["rows"]) {
  return [...rows]
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, qualified: index < 2 }));
}

function buildKnockoutSchedule(state: GameState, qualifiedTeams: string[]): ReturnType<typeof campaignOpponents> {
  const rng = createRng(`${state.config.seed}-qualified-knockout`);
  const rivals = qualifiedTeams.filter((name) => name !== state.config.teamName);
  const shuffled = [...rivals].sort(() => rng.next() - 0.5);
  const phases = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
  return phases.map((phase, index) => {
    const opponentName = shuffled[index] ?? rivals[index % Math.max(1, rivals.length)] ?? "Adversario surpresa";
    return {
      phase,
      knockout: true,
      opponent: findOpponent(opponentName)
    };
  });
}

function enrichSchedule(schedule: ReturnType<typeof campaignOpponents>): ReturnType<typeof campaignOpponents> {
  return schedule.map((item) => ({
    ...item,
    opponent: findOpponent(item.opponent.name)
  }));
}

function tournamentTeamPool(): TournamentTeam[] {
  const byName = new Map<string, TournamentTeam>();
  opponents.forEach((opponent) => {
    const fallbackSeason = opponentSeasonFallback[opponent.name];
    byName.set(opponent.name, {
      ...opponent,
      name: fallbackSeason ? teamSeasonLabel(opponent.name, fallbackSeason) : opponent.name,
      baseName: opponent.name,
      season: fallbackSeason
    });
  });
  clubSeasons.forEach((season) => {
    const current = byName.get(season.clubName);
    if (current?.season && season.season <= current.season) return;
    byName.set(season.clubName, {
      id: current?.id ?? season.clubId,
      name: teamSeasonLabel(season.clubName, season.season),
      baseName: season.clubName,
      season: season.season,
      clubSeasonId: season.id,
      country: current?.country ?? season.country,
      strength: current?.strength ?? (season.wasChampion ? 88 : 82),
      primaryColor: season.primaryColor,
      secondaryColor: season.secondaryColor
    });
  });
  return [...byName.values()];
}

function findOpponent(name: string): TournamentTeam {
  return tournamentTeamPool().find((opponent) => opponent.name === name || opponent.baseName === name) ?? {
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "adversario",
    name,
    baseName: name,
    season: undefined,
    country: "Europa",
    strength: 84,
    primaryColor: "#1d4ed8",
    secondaryColor: "#f8c630"
  };
}

function teamSeasonLabel(name: string, season: string) {
  const years = season.match(/^(\d{4})\/(\d{2})$/);
  return years ? `${name} ${years[1].slice(2)}/${years[2]}` : name;
}

const opponentSeasonFallback: Record<string, string> = {
  Benfica: "1961/62",
  Sevilla: "2019/20"
};

function simulateRemainingTournament(state: GameState, userMatches: MatchResult[], fromStep: number): BracketMatch[] {
  const rng = createRng(`${state.config.seed}-remaining-bracket-${fromStep}`);
  const fallback = ["Real Madrid", "Manchester City", "Bayern de Munique", "Liverpool", "Milan", "Internazionale", "Paris Saint-Germain", "Arsenal", "Porto", "Ajax", "Chelsea", "Juventus", "Atletico de Madrid", "Napoli", "Benfica", "Borussia Dortmund", "Barcelona", "Manchester United"];
  const pathOpponents = state.campaignSchedule.slice(3).map((item) => item.opponent.name);
  const userKnockoutMatches = new Map(userMatches.filter((match) => isKnockoutPhase(match.phase)).map((match) => [match.phase, match]));
  const includeUserTeam = state.qualifiedTeams.includes(state.config.teamName) || userKnockoutMatches.size > 0;
  const rounds = ["Oitavas de final", "Quartas de final", "Semifinal", "Final"];
  let teams = tournamentBracketSeeds(state.config.teamName, state.qualifiedTeams, pathOpponents, fallback, includeUserTeam);
  const bracket: BracketMatch[] = [];
  for (const phase of rounds) {
    const winners: string[] = [];
    for (let i = 0; i < teams.length; i += 2) {
      let homeName = teams[i]!;
      let awayName = teams[i + 1]!;
      const userMatch = userKnockoutMatches.get(phase);
      let homeGoals: number;
      let awayGoals: number;
      if (userMatch && (homeName === state.config.teamName || awayName === state.config.teamName)) {
        const userIsHome = homeName === state.config.teamName;
        if (userIsHome) awayName = userMatch.opponentName;
        else homeName = userMatch.opponentName;
        homeGoals = userIsHome ? userMatch.userGoals : userMatch.opponentGoals;
        awayGoals = userIsHome ? userMatch.opponentGoals : userMatch.userGoals;
      } else {
        homeGoals = rng.int(0, 4);
        awayGoals = rng.int(0, 4);
        if (homeGoals === awayGoals) {
          if (rng.next() > 0.5) homeGoals += 1;
          else awayGoals += 1;
        }
      }
      const winnerName = homeGoals > awayGoals ? homeName : awayName;
      winners.push(winnerName);
      bracket.push({
        id: `${phase}-${homeName}-${awayName}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        phase,
        homeName,
        awayName,
        homeGoals,
        awayGoals,
        winnerName
      });
    }
    teams = winners;
  }
  return bracket;
}

function tournamentBracketSeeds(teamName: string, qualifiedTeams: string[], pathOpponents: string[], fallback: string[], includeUserTeam: boolean) {
  const seeds: string[] = [];
  const pool = unique([...qualifiedTeams, ...pathOpponents, ...fallback]).filter((name) => name !== teamName);
  if (includeUserTeam) {
    seeds.push(teamName);
    seeds.push(pathOpponents[0] ?? pool.shift() ?? "Adversario surpresa");
  }
  for (const name of pool) {
    if (!seeds.includes(name)) seeds.push(name);
  }
  while (seeds.length < 16) seeds.push(`Clube ${seeds.length + 1}`);
  return seeds.slice(0, 16);
}

function isKnockoutPhase(phase: string) {
  return !phase.toLowerCase().includes("grupos");
}

function unique(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

