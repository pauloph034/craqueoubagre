"use client";

import { TeamNameWithCrest } from "@/components/game/TeamNameWithCrest";
import { ChampionSound, EliminatedSound } from "@/components/game/ChampionSound";
import { GenericBadge } from "@/components/game/GenericBadge";
import { NationalityFlag } from "@/components/game/NationalityFlag";
import { SoccerFieldMarkings } from "@/components/game/SoccerFieldMarkings";
import { ChemistryLinks } from "@/components/game/ChemistryLinks";
import {
  MatchDecisionPrompt,
  PenaltyTakerPrompt,
  type MatchDecisionType
} from "@/components/game/MatchInteractivePrompt";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { getFormationSlots } from "@/config/formations";
import { clubSeasons as clubSeasonData, players as playerData } from "@/data/loaders";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { matchDecisionMoments, resolveMatchDecision } from "@/game-engine/match-decisions";
import { countCoachNationalityMatches } from "@/game-engine/coach-nationality";
import { positionLabel } from "@/game-engine/position-labels";
import {
  autoPickRoomPlayer,
  autoPickRoomTurn,
  activateRoomSecretCard,
  chooseRoomCoach,
  chooseRoomLegend,
  chooseRoomSecretCard,
  confirmRoomReview,
  createFriendRoom,
  currentPlayerRoomMatch,
  drawRoomCoaches,
  drawRoomTeam,
  hasPendingHumanRoomMatches,
  joinRoom,
  moveRoomPick,
  playPlayerRoomMatch,
  placeRoomPlayer,
  previewPlayerRoomMatch,
  progressRoomRound,
  roomCardSpecialOptions,
  roomSecretCard,
  replaceRoomPick,
  resolveRoomPenaltyTimeout,
  resetRoomToLobby,
  saveFriendRooms,
  selectRoomPlayer,
  setRoomPlayerReady,
  startRoomCoachStage,
  startRoomDraft,
  shootRoomPenalty,
  touchRoomPlayer,
  updateRoomPlayerSetup,
  updateRoomSettings,
  type FriendRoom,
  type ActivateRoomCardInput,
  type RoomCoach,
  type RoomDraftMode,
  type RoomDraw,
  type RoomMatch,
  type RoomPick,
  type RoomPlayer,
  type RoomSecretCardId,
  type RoomVisibility,
  type PenaltyDirection
} from "@/lib/friend-rooms";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import type { CampaignSummary, Position, TacticalStyle } from "@/types/game";
import { Check, CircleDot, Clock, Copy, Crown, Dices, Lock, Play, Plus, ShieldCheck, Trophy, UserX, Users, Volume2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const inputClass =
  "min-h-10 w-full rounded-sm border border-black bg-white px-3 py-2 text-sm font-semibold text-black placeholder:text-[var(--muted)] focus:border-[var(--accent)]";

const phases = [
  { name: "Oitavas de final", label: "Oitavas" },
  { name: "Quartas de final", label: "Quartas" },
  { name: "Semifinal", label: "Semi" },
  { name: "Final", label: "Final" }
] as const;

type RoomTimelineEvent = {
  id: string;
  minute: number;
  teamName: string;
  text: string;
  homeGoals: number;
  awayGoals: number;
  kind?: "event" | "decision" | "penalty";
  decisionType?: MatchDecisionType;
};

const formationOptions = ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "3-4-3", "4-1-2-1-2"];
const tacticalStyleOptions: Array<{ value: TacticalStyle; label: string }> = [
  { value: "equilibrado", label: "Equilibrado" },
  { value: "defensivo", label: "Defensivo" },
  { value: "ofensivo", label: "Ofensivo" },
  { value: "pressao", label: "Pressao alta" }
];

async function fetchSharedRooms() {
  const response = await fetch("/api/friend-rooms", { cache: "no-store" });
  if (!response.ok) throw new Error("Nao foi possivel carregar as salas.");
  const payload = (await response.json()) as { rooms?: FriendRoom[] };
  return Array.isArray(payload.rooms) ? payload.rooms : [];
}

type RoomConnectionStatus = "syncing" | "connected" | "disconnected";
const activeFriendRoomStorageKey = "craque-ou-bagre:active-friend-room:v1";

function createActionId() {
  return globalThis.crypto?.randomUUID?.() ?? `acao-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function persistSharedRooms(rooms: FriendRoom[], actionId?: string, actionRoomId?: string) {
  const response = await fetch("/api/friend-rooms", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rooms, actionId, actionRoomId })
  });
  if (!response.ok) throw new Error("Nao foi possivel salvar as salas.");
  const payload = (await response.json()) as { rooms?: FriendRoom[] };
  return Array.isArray(payload.rooms) ? payload.rooms : rooms;
}

async function leaveSharedRoom(roomId: string, playerId?: string) {
  const response = await fetch("/api/friend-rooms", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, playerId })
  });
  if (!response.ok) throw new Error("Nao foi possivel sair da sala.");
  const payload = (await response.json()) as { rooms?: FriendRoom[] };
  return Array.isArray(payload.rooms) ? payload.rooms : [];
}

async function kickSharedRoomPlayer(roomId: string, kickPlayerId: string) {
  const response = await fetch("/api/friend-rooms", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId, kickPlayerId })
  });
  if (!response.ok) throw new Error("Nao foi possivel remover o jogador.");
  const payload = (await response.json()) as { rooms?: FriendRoom[] };
  return Array.isArray(payload.rooms) ? payload.rooms : [];
}

function mergeLatestRooms(incoming: FriendRoom[], current: FriendRoom[]) {
  const byId = new Map<string, FriendRoom>();
  for (const room of current) byId.set(room.id, room);
  for (const room of incoming) {
    const existing = byId.get(room.id);
    const existingTime = existing ? roomUpdatedTime(existing) : 0;
    const incomingTime = roomUpdatedTime(room);
    if (!existing || incomingTime >= existingTime) byId.set(room.id, room);
  }
  return Array.from(byId.values()).sort((a, b) => roomUpdatedTime(b) - roomUpdatedTime(a)).slice(0, 40);
}

function roomUpdatedTime(room: FriendRoom) {
  return Date.parse(room.updatedAt ?? room.createdAt ?? "") || 0;
}

function onlineRoomSummary(room: FriendRoom, player: RoomPlayer, username: string): CampaignSummary {
  const squad = player.squad.flatMap((pick) => {
    const sourcePlayer = playerData.find((item) => item.id === pick.id || item.canonicalPlayerId === pick.canonicalPlayerId);
    const clubSeason = clubSeasonData.find((item) => item.id === pick.clubSeasonId);
    return sourcePlayer && clubSeason && pick.slotId && pick.slotPosition
      ? [{ slotId: pick.slotId, slotPosition: pick.slotPosition, player: sourcePlayer, clubSeason, effectiveRating: pick.effectiveRating ?? pick.overall, fitType: "primary" as const }]
      : [];
  });
  const matches = room.bracket
    .filter((match) => match.status === "done" && (match.homePlayerId === player.id || match.awayPlayerId === player.id))
    .map((match) => {
      const isHome = match.homePlayerId === player.id;
      return {
        id: `online-${room.id}-${match.id}`,
        phase: match.phase,
        opponentName: isHome ? match.awayName : match.homeName,
        opponentBadge: "",
        userGoals: (isHome ? match.homeGoals : match.awayGoals) ?? 0,
        opponentGoals: (isHome ? match.awayGoals : match.homeGoals) ?? 0,
        events: [],
        stats: { possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, opponentPossession: 50, opponentShots: 0, opponentShotsOnTarget: 0, opponentCorners: 0 },
        bestPlayer: player.squad[0]?.name ?? "Elenco"
      };
    });
  const coachId = room.selectedCoachByPlayer[player.id];
  const coach = (room.coachOptionsByPlayer[player.id] ?? []).find((item) => item.id === coachId);
  const champion = sameText(room.champion ?? "", player.teamName);
  const elimination = matches.find((match) => match.userGoals < match.opponentGoals);
  const stageReached = champion ? "Campeao da sala" : elimination ? `Eliminado em ${elimination.phase}` : "Mata-mata online";
  return {
    id: `online-${room.id}-${player.id}`,
    date: room.updatedAt ?? new Date().toISOString(),
    config: {
      seed: `online-${room.id}`,
      userName: username,
      teamName: player.teamName,
      formation: player.formation,
      tacticalStyle: player.tacticalStyle,
      difficulty: room.difficulty === "almanaque" ? "lenda" : "classico"
    },
    squad,
    coach,
    matches,
    stageReached,
    champion,
    tournamentChampion: player.teamName,
    tournamentBracket: room.bracket.filter((match) => match.status === "done").map((match) => ({
      id: match.id,
      phase: match.phase,
      homeName: match.homeName,
      awayName: match.awayName,
      homeGoals: match.homeGoals ?? 0,
      awayGoals: match.awayGoals ?? 0,
      winnerName: match.winnerName ?? ""
    })),
    score: (champion ? 700 : 120) + matches.filter((match) => match.userGoals > match.opponentGoals).length * 100,
    achievements: champion ? ["primeiro-titulo", "campeao-online"] : ["estreia-online"],
    rerollsUsed: room.rerollsByPlayer[player.id] ?? 0,
    swapsUsed: 0,
    undoUsed: false
  };
}

export default function FriendRoomsPage() {
  const currentUser = useGameStore((state) => state.currentUser);
  const loadAccount = useGameStore((state) => state.loadAccount);
  const [rooms, setRooms] = useState<FriendRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>();
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [accountChecked, setAccountChecked] = useState(false);
  const [panelTab, setPanelTab] = useState<"salas" | "criar">("salas");
  const [roomScreen, setRoomScreen] = useState<"rooms" | "room">("rooms");
  const [joinPasswords, setJoinPasswords] = useState<Record<string, string>>({});
  const [reviewSlotId, setReviewSlotId] = useState<string>();
  const [form, setForm] = useState({
    name: "",
    visibility: "publica" as RoomVisibility,
    password: "",
    difficulty: "classico" as "classico" | "almanaque",
    draftMode: "turnos" as RoomDraftMode,
    simultaneousMinutes: 2 as 2 | 4 | 6,
    turnSeconds: 30 as 20 | 30 | 45
  });
  const playedTurnSoundsRef = useRef(new Set<string>());
  const handledAutoPicksRef = useRef(new Set<string>());
  const roomsRef = useRef<FriendRoom[]>([]);
  const persistSequenceRef = useRef(0);
  const pendingMutationsRef = useRef(0);
  const roomMutationQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const createInFlightRef = useRef(false);
  const hiddenRoomUntilRef = useRef(new Map<string, number>());
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<RoomConnectionStatus>("syncing");
  const savedOnlineResultsRef = useRef(new Set<string>());

  const applyRooms = useCallback((nextRooms: FriendRoom[], activeId?: string) => {
    const now = Date.now();
    const hiddenRoomUntil = hiddenRoomUntilRef.current;
    for (const [roomId, expiresAt] of hiddenRoomUntil) {
      if (expiresAt <= now) hiddenRoomUntil.delete(roomId);
    }
    const cleanRooms = nextRooms
      .filter(isFreshRoom)
      .filter((room) => (hiddenRoomUntil.get(room.id) ?? 0) <= now)
      .slice(0, 40);
    roomsRef.current = cleanRooms;
    setRooms(cleanRooms);
    saveFriendRooms(cleanRooms);
    setActiveRoomId((current) => {
      const preferredId = activeId ?? current;
      return preferredId && cleanRooms.some((room) => room.id === preferredId) ? preferredId : cleanRooms[0]?.id;
    });
  }, []);

  const refreshRooms = useCallback(
    async () => {
      if (pendingMutationsRef.current > 0) return;
      const sequenceAtStart = persistSequenceRef.current;
      try {
        const sharedRooms = await fetchSharedRooms();
        if (pendingMutationsRef.current > 0 || sequenceAtStart !== persistSequenceRef.current) return;
        applyRooms(sharedRooms);
        setConnectionStatus("connected");
      } catch {
        if (pendingMutationsRef.current > 0 || sequenceAtStart !== persistSequenceRef.current) return;
        setConnectionStatus("disconnected");
      }
    },
    [applyRooms]
  );

  useEffect(() => {
    if (!currentUser) void loadAccount();
    setAccountChecked(true);
  }, [currentUser, loadAccount]);

  useEffect(() => {
    void refreshRooms();
    const timer = window.setInterval(() => {
      void refreshRooms();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refreshRooms]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const activeRoom = useMemo(() => rooms.find((room) => room.id === activeRoomId) ?? rooms[0], [activeRoomId, rooms]);
  const publicRooms = rooms.filter((room) => room.visibility === "publica");
  const privateRooms = rooms.filter((room) => room.visibility === "privada");
  const roomFocusMode = roomScreen === "room" && Boolean(activeRoom && activeRoom.status !== "lobby");

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!currentUser || activeRoom?.status !== "finished" || !activeRoom.champion) return;
    const playerName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName?.trim() || `${playerName} FC`;
    const participant = activeRoom.players.find((player) => samePlayer(player, playerName, teamName));
    if (!participant) return;
    const rewardId = `online-${activeRoom.id}-${participant.id}`;
    if (savedOnlineResultsRef.current.has(rewardId)) return;
    savedOnlineResultsRef.current.add(rewardId);
    void fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: onlineRoomSummary(activeRoom, participant, currentUser.username) })
    }).then((response) => {
      if (!response.ok) savedOnlineResultsRef.current.delete(rewardId);
    }).catch(() => savedOnlineResultsRef.current.delete(rewardId));
  }, [activeRoom, currentUser]);

  useEffect(() => {
    if (!currentUser || !rooms.length || roomScreen === "room") return;
    const savedRoomId = window.localStorage.getItem(activeFriendRoomStorageKey);
    if (!savedRoomId) return;
    const playerName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName?.trim() || `${playerName} FC`;
    const savedRoom = rooms.find((room) => room.id === savedRoomId && room.players.some((player) => samePlayer(player, playerName, teamName)));
    if (!savedRoom) return;
    setActiveRoomId(savedRoom.id);
    setRoomScreen("room");
    setMessage("Progresso recuperado. Voce voltou para a sala.");
  }, [currentUser, roomScreen, rooms]);

  useEffect(() => {
    document.body.classList.toggle("room-focus-mode", roomFocusMode);
    return () => document.body.classList.remove("room-focus-mode");
  }, [roomFocusMode]);

  const commitRooms = useCallback(
    async (nextRooms: FriendRoom[], activeId?: string, actionId = createActionId()) => {
      const cleanRooms = nextRooms.slice(0, 40);
      const sequence = ++persistSequenceRef.current;
      pendingMutationsRef.current += 1;
      setConnectionStatus("syncing");
      try {
        const sharedRooms = await persistSharedRooms(cleanRooms, actionId, activeId);
        if (sequence === persistSequenceRef.current) applyRooms(sharedRooms, activeId);
        setConnectionStatus("connected");
        return sharedRooms;
      } catch {
        setConnectionStatus("disconnected");
        setMessage("Conexao interrompida. Reconectando automaticamente...");
        return roomsRef.current;
      } finally {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
      }
    },
    [applyRooms]
  );

  const commitRoom = useCallback((room: FriendRoom) => {
    const actionId = createActionId();
    const touchedRoom = { ...room, revision: (room.revision ?? 0) + 1, updatedAt: new Date().toISOString() };
    const currentRooms = roomsRef.current;
    const nextRooms = currentRooms.some((item) => item.id === touchedRoom.id) ? currentRooms.map((item) => (item.id === touchedRoom.id ? touchedRoom : item)) : [touchedRoom, ...currentRooms];
    applyRooms(nextRooms, touchedRoom.id);
    setConnectionStatus("connected");

    const operation = roomMutationQueueRef.current.then(async () => {
      pendingMutationsRef.current += 1;
      const sequence = ++persistSequenceRef.current;
      try {
        const sharedRooms = await persistSharedRooms(nextRooms, actionId, touchedRoom.id);
        const latestRevision = roomsRef.current.find((item) => item.id === touchedRoom.id)?.revision ?? 0;
        if (sequence === persistSequenceRef.current && latestRevision <= (touchedRoom.revision ?? 0)) {
          applyRooms(sharedRooms, touchedRoom.id);
        }
        setConnectionStatus("connected");
        return Boolean(sharedRooms.find((item) => item.id === touchedRoom.id)?.processedActionIds?.includes(actionId));
      } catch {
        setConnectionStatus("disconnected");
        setMessage("Conexao interrompida. Reconectando automaticamente...");
        return false;
      } finally {
        pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
      }
    });
    roomMutationQueueRef.current = operation.then(() => true, () => false);
    return operation;
  }, [applyRooms]);

  useEffect(() => {
    if (!currentUser || !activeRoomId || roomScreen !== "room") return;
    const userName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName ?? `${userName} FC`;
    const touch = () => {
      const latest = roomsRef.current.find((room) => room.id === activeRoomId);
      const player = latest?.players.find((item) => samePlayer(item, userName, teamName));
      if (!latest || !player) return;
      if (pendingMutationsRef.current === 0) void commitRoom(touchRoomPlayer(latest, player.id));
    };
    touch();
    const timer = window.setInterval(touch, 10_000);
    return () => window.clearInterval(timer);
  }, [activeRoomId, commitRoom, currentUser, roomScreen]);

  async function handleCreateRoom() {
    if (createInFlightRef.current) return;
    if (!currentUser) {
      setMessage("Entre com uma conta para criar sala.");
      return;
    }
    if (form.visibility === "privada" && form.password.trim().length < 3) {
      setMessage("Sala privada precisa de senha com pelo menos 3 caracteres.");
      return;
    }
    createInFlightRef.current = true;
    setCreatingRoom(true);
    const room = createFriendRoom({
      ...form,
      hostName: currentUser.playerName?.trim() || currentUser.username,
      hostTeamName: currentUser.teamName ?? `${currentUser.playerName?.trim() || currentUser.username} FC`,
      hostEmblemId: currentUser.emblemId
    });
    try {
      const sharedRooms = await commitRooms([room, ...roomsRef.current], room.id);
      const createdRoom = sharedRooms.find((item) => item.id === room.id) ?? sharedRooms.find((item) => sameText(item.hostName, room.hostName) && sameText(item.name, room.name));
      if (createdRoom) {
        window.localStorage.setItem(activeFriendRoomStorageKey, createdRoom.id);
        setActiveRoomId(createdRoom.id);
        setRoomScreen("room");
        setMessage("Sala criada.");
      }
    } finally {
      createInFlightRef.current = false;
      setCreatingRoom(false);
    }
  }

  async function handleJoin(room: FriendRoom) {
    if (!currentUser) {
      setMessage("Entre com uma conta para entrar na sala.");
      return;
    }
    if (room.visibility === "privada" && joinPasswords[room.id]?.trim() !== room.password) {
      setMessage("Senha da sala incorreta.");
      return;
    }
    const userName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName ?? `${userName} FC`;
    if (await commitRoom(joinRoom(room, userName, teamName, currentUser.emblemId))) {
      window.localStorage.setItem(activeFriendRoomStorageKey, room.id);
      setRoomScreen("room");
      setMessage("Voce entrou na sala.");
    }
  }

  async function handleLeaveRoom() {
    if (!activeRoom) {
      setRoomScreen("rooms");
      return;
    }
    const roomId = activeRoom.id;
    const playerName = currentUser?.playerName?.trim() || currentUser?.username || "";
    const teamName = currentUser?.teamName?.trim() || `${playerName} FC`;
    const leavingPlayer = activeRoom.players.find((player) => samePlayer(player, playerName, teamName));
    ++persistSequenceRef.current;
    hiddenRoomUntilRef.current.set(roomId, Date.now() + 10_000);
    applyRooms(roomsRef.current.filter((room) => room.id !== roomId));
    setRoomScreen("rooms");
    window.localStorage.removeItem(activeFriendRoomStorageKey);
    try {
      applyRooms(await leaveSharedRoom(roomId, leavingPlayer?.id));
    } catch {
      void refreshRooms();
    }
  }

  async function handleKickPlayer(playerId: string) {
    if (!activeRoom) return;
    try {
      applyRooms(await kickSharedRoomPlayer(activeRoom.id, playerId), activeRoom.id);
      setMessage("Jogador inativo removido da sala.");
    } catch {
      setMessage("Nao foi possivel remover o jogador.");
    }
  }

  function updateActiveRoom(updater: (room: FriendRoom) => FriendRoom) {
    const latest = roomsRef.current.find((room) => room.id === activeRoom?.id);
    if (!latest) return;
    void commitRoom(updater(latest));
  }

  async function handlePlacePick(playerId: string, slotId: string) {
    const latest = roomsRef.current.find((room) => room.id === activeRoom?.id);
    if (!latest) return;
    if (await commitRoom(placeRoomPlayer(latest, playerId, slotId))) {
      handledAutoPicksRef.current.add(autoPickKey(latest, playerId));
    }
  }

  function handleStartDraft() {
    if (!activeRoom) return;
    const players = activeRoom.players.filter((player) => !player.isBot);
    if (!players.length || !players.every((player) => player.ready)) {
      setMessage("Todos os jogadores precisam confirmar que estao prontos.");
      return;
    }
    updateActiveRoom(startRoomDraft);
  }

  function handlePlayerReady(playerId: string, ready: boolean) {
    updateActiveRoom((room) => touchRoomPlayer(setRoomPlayerReady(room, playerId, ready), playerId));
  }

  function handlePlayerSetup(playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) {
    updateActiveRoom((room) => touchRoomPlayer(updateRoomPlayerSetup(room, playerId, setup), playerId));
  }

  function handleRoomSettings(settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) {
    updateActiveRoom((room) => updateRoomSettings(room, settings));
  }

  const turnRemaining =
    activeRoom?.status === "drafting" && activeRoom.draftMode === "todos" && activeRoom.draftEndsAt
      ? Math.max(0, Math.ceil((activeRoom.draftEndsAt - now) / 1000))
      : activeRoom?.status === "drafting" && activeRoom.turnStartedAt
        ? Math.max(0, activeRoom.turnSeconds - Math.floor((now - activeRoom.turnStartedAt) / 1000))
        : undefined;
  const reviewRemaining =
    activeRoom?.status === "reviewing" && activeRoom.reviewEndsAt
      ? Math.max(0, Math.ceil((activeRoom.reviewEndsAt - now) / 1000))
      : undefined;
  const penaltyRemaining =
    activeRoom?.status === "challenge" && activeRoom.penaltyEndsAt
      ? Math.max(0, Math.ceil((activeRoom.penaltyEndsAt - now) / 1000))
      : undefined;

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "drafting" || turnRemaining !== 0 || !currentUser) return;
    const latest = roomsRef.current.find((room) => room.id === activeRoom.id);
    if (!latest || latest.status !== "drafting") return;
    const playerName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName ?? `${playerName} FC`;
    const player = latest.players.find((item) => samePlayer(item, playerName, teamName));
    if (!player) return;
    const remaining = latest.draftMode === "todos" && latest.draftEndsAt
      ? Math.max(0, latest.draftEndsAt - Date.now())
      : latest.turnStartedAt
        ? Math.max(0, latest.turnSeconds * 1000 - (Date.now() - latest.turnStartedAt))
        : 1;
    if (remaining > 0) return;
    const key = autoPickKey(latest, player.id);
    if (handledAutoPicksRef.current.has(key)) return;
    handledAutoPicksRef.current.add(key);
    if (latest.draftMode === "todos") {
      if (player.squad.length < 11) void commitRoom(autoPickRoomPlayer(latest, player.id));
      return;
    }
    if (latest.players[latest.turnIndex]?.id === player.id) void commitRoom(autoPickRoomTurn(latest));
  }, [activeRoom, commitRoom, currentUser, turnRemaining]);

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "reviewing" || reviewRemaining !== 0) return;
    setReviewSlotId(undefined);
    void commitRoom(startRoomCoachStage(activeRoom));
  }, [activeRoom, commitRoom, reviewRemaining]);

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "challenge" || activeRoom.penaltyWinnerId || penaltyRemaining !== 0) return;
    void commitRoom(resolveRoomPenaltyTimeout(activeRoom));
  }, [activeRoom, commitRoom, penaltyRemaining]);

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "drafting" || activeRoom.draftMode !== "turnos") return;
    if (!currentUser) return;
    const playerName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName ?? `${playerName} FC`;
    const player = activeRoom.players.find((item) => samePlayer(item, playerName, teamName));
    if (!player || activeRoom.players[activeRoom.turnIndex]?.id !== player.id) return;
    const batchStartSize = Math.max(0, player.squad.length - activeRoom.picksInTurn);
    const signature = `${activeRoom.id}:${player.id}:${batchStartSize}`;
    if (playedTurnSoundsRef.current.has(signature)) return;
    playedTurnSoundsRef.current.add(signature);
    playTurnSound();
  }, [activeRoom, currentUser]);

  if (!accountChecked) {
    return (
      <main className="editorial-shell max-w-4xl py-8">
        <section className="editorial-panel p-7 text-center">
          <p className="editorial-kicker">Jogar com amigos</p>
          <h1 className="editorial-page-title mt-3">Carregando sua conta</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">So um instante para validar seu acesso local.</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="editorial-shell max-w-4xl py-8">
        <section className="editorial-panel p-7 text-center">
          <p className="editorial-kicker">Jogar com amigos</p>
          <h1 className="editorial-page-title mt-3">Entre para criar ou acessar salas</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">O modo com amigos usa o nome do jogador e o nome do time cadastrados na conta.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/conta?modo=entrar&redirect=%2Fsalas"><Button>Entrar</Button></Link>
            <Link href="/conta?modo=criar&redirect=%2Fsalas"><Button variant="secondary">Criar conta</Button></Link>
          </div>
        </section>
      </main>
    );
  }

  const accountPlayerName = currentUser.playerName?.trim() || currentUser.username;
  const accountTeamName = currentUser.teamName ?? `${accountPlayerName} FC`;
  const focusedRoom = roomScreen === "room" ? activeRoom : undefined;

  if (focusedRoom) {
    const gameStarted = focusedRoom.status !== "lobby";
    return (
      <main className={cn("editorial-shell", gameStarted ? "max-w-7xl py-4" : "max-w-6xl py-6")}>
        {message && (
          <div className="fixed right-4 top-16 z-[80] max-w-sm border border-black bg-[var(--success)] px-4 py-3 text-sm font-bold text-white shadow-lg">
            {message}
          </div>
        )}
        <ActiveRoomPanel
          room={focusedRoom}
          turnRemaining={turnRemaining}
          reviewRemaining={reviewRemaining}
          penaltyRemaining={penaltyRemaining}
          accountPlayerName={accountPlayerName}
          accountTeamName={accountTeamName}
          focused={gameStarted}
          connectionStatus={connectionStatus}
          now={now}
          onBackToRooms={() => void handleLeaveRoom()}
          onStartDraft={handleStartDraft}
          onDrawTeam={(playerId) => updateActiveRoom((room) => drawRoomTeam(room, playerId))}
          onSelectPick={(playerId, pickId) => updateActiveRoom((room) => selectRoomPlayer(room, playerId, pickId))}
          onPlacePick={handlePlacePick}
          onShootPenalty={(playerId, direction, accuracy) => updateActiveRoom((room) => shootRoomPenalty(room, playerId, direction, accuracy))}
          onChooseLegend={(playerId, legendId) => updateActiveRoom((room) => chooseRoomLegend(room, playerId, legendId))}
          reviewSlotId={reviewSlotId}
          onReviewSlotChange={setReviewSlotId}
          onMovePick={(playerId, fromSlotId, toSlotId) => updateActiveRoom((room) => moveRoomPick(room, playerId, fromSlotId, toSlotId))}
          onReplacePick={(playerId, slotId, replacementId) => updateActiveRoom((room) => replaceRoomPick(room, playerId, slotId, replacementId))}
          onConfirmReview={(playerId) => updateActiveRoom((room) => confirmRoomReview(room, playerId))}
          onDrawCoaches={(playerId) => updateActiveRoom((room) => drawRoomCoaches(room, playerId))}
          onChooseCoach={(playerId, coachId) => updateActiveRoom((room) => chooseRoomCoach(room, playerId, coachId))}
          onChooseCard={(playerId, cardId) => updateActiveRoom((room) => chooseRoomSecretCard(room, playerId, cardId))}
          onActivateCard={(playerId, input) => updateActiveRoom((room) => activateRoomSecretCard(room, playerId, input))}
          onPlayerReady={handlePlayerReady}
          onPlayerSetup={handlePlayerSetup}
          onRoomSettings={handleRoomSettings}
          onPlayMatch={(playerId) => updateActiveRoom((room) => playPlayerRoomMatch(room, playerId))}
          onProgressRound={() => updateActiveRoom(progressRoomRound)}
          onResetLobby={() => updateActiveRoom(resetRoomToLobby)}
          onKickPlayer={(playerId) => void handleKickPlayer(playerId)}
        />
        {!gameStarted && <div className="mt-6"><AdBanner variant="leaderboard" /></div>}
      </main>
    );
  }

  return (
    <main className="editorial-shell max-w-6xl py-6">
      <section className="editorial-panel p-5">
        <p className="editorial-kicker">Jogar com amigos</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="editorial-page-title">Salas mata-mata</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Oitavas com amigos, times aleatorios completando a chave e draft com tempo.</p>
            <p className="mt-2 text-sm text-slate-400">Jogando como <strong className="text-white">{accountPlayerName}</strong> - {accountTeamName}</p>
          </div>
          <Link href="/jogar"><Button variant="secondary">Voltar ao solo</Button></Link>
        </div>
      </section>

      {message && (
        <div className="fixed right-4 top-16 z-[80] max-w-sm border border-black bg-[var(--success)] px-4 py-3 text-sm font-bold text-white shadow-lg">
          {message}
        </div>
      )}

      <section className="mt-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="grid grid-cols-2 border border-black bg-white p-1">
            <button className={tabButtonClass(panelTab === "salas")} onClick={() => setPanelTab("salas")}>Salas disponiveis</button>
            <button className={tabButtonClass(panelTab === "criar")} onClick={() => setPanelTab("criar")}>Criar sala</button>
          </div>
          {panelTab === "salas" ? (
            <RoomsPanel
              publicRooms={publicRooms}
              privateRooms={privateRooms}
              activeRoomId={activeRoom?.id}
              joinPasswords={joinPasswords}
              onPasswordChange={(roomId, password) => setJoinPasswords((value) => ({ ...value, [roomId]: password }))}
              onSelect={(room) => setActiveRoomId(room.id)}
              onJoin={handleJoin}
            />
          ) : (
            <CreateRoomPanel form={form} accountUserName={accountPlayerName} accountTeamName={accountTeamName} creating={creatingRoom} onChange={setForm} onCreate={handleCreateRoom} />
          )}
        </div>
      </section>
      <div className="mx-auto mt-6 max-w-3xl">
        <AdBanner variant="leaderboard" />
      </div>
    </main>
  );
}

function CreateRoomPanel({
  form,
  accountUserName,
  accountTeamName,
  creating,
  onChange,
  onCreate
}: {
  form: {
    name: string;
    visibility: RoomVisibility;
    password: string;
    difficulty: "classico" | "almanaque";
    draftMode: RoomDraftMode;
    simultaneousMinutes: 2 | 4 | 6;
    turnSeconds: 20 | 30 | 45;
  };
  accountUserName: string;
  accountTeamName: string;
  creating: boolean;
  onChange: (form: {
    name: string;
    visibility: RoomVisibility;
    password: string;
    difficulty: "classico" | "almanaque";
    draftMode: RoomDraftMode;
    simultaneousMinutes: 2 | 4 | 6;
    turnSeconds: 20 | 30 | 45;
  }) => void;
  onCreate: () => Promise<void>;
}) {
  return (
    <article className="editorial-panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="editorial-number">02</p>
          <h2 className="font-display text-2xl font-black uppercase">Criar torneio</h2>
        </div>
        <Users className="mt-1 text-emerald-300" />
      </div>

      <div className="mt-4 grid gap-3">
        <input className={inputClass} value={form.name} placeholder="Nome do torneio, ex: Copa dos Amigos" onChange={(event) => onChange({ ...form, name: event.target.value })} />
        <div className="rounded-md border border-emerald-300/15 bg-night/55 px-3 py-2 text-sm text-slate-300">
          Criador: <strong className="text-white">{accountUserName}</strong> - Time: <strong className="text-white">{accountTeamName}</strong>
        </div>
      </div>

      <ControlBlock label="Modo">
        <SegmentButton active={form.difficulty === "classico"} onClick={() => onChange({ ...form, difficulty: "classico" })}>Classico</SegmentButton>
        <SegmentButton active={form.difficulty === "almanaque"} onClick={() => onChange({ ...form, difficulty: "almanaque" })}>De almanaque</SegmentButton>
      </ControlBlock>

      <ControlBlock label="Sala">
        <SegmentButton active={form.visibility === "publica"} onClick={() => onChange({ ...form, visibility: "publica" })}>Publica</SegmentButton>
        <SegmentButton active={form.visibility === "privada"} onClick={() => onChange({ ...form, visibility: "privada" })}>Privada</SegmentButton>
      </ControlBlock>

      {form.visibility === "privada" && (
        <input className={cn(inputClass, "mt-3")} value={form.password} type="password" placeholder="ex: arena123" onChange={(event) => onChange({ ...form, password: event.target.value })} />
      )}

      <ControlBlock label="Formato do draft">
        <SegmentButton active={form.draftMode === "turnos"} onClick={() => onChange({ ...form, draftMode: "turnos" })}>3 por vez</SegmentButton>
        <SegmentButton active={form.draftMode === "todos"} onClick={() => onChange({ ...form, draftMode: "todos" })}>Todos juntos</SegmentButton>
      </ControlBlock>

      {form.draftMode === "turnos" ? (
        <ControlBlock label="Tempo por jogada">
          {[20, 30, 45].map((value) => (
            <SegmentButton key={value} active={form.turnSeconds === value} onClick={() => onChange({ ...form, turnSeconds: value as 20 | 30 | 45 })}>{value}s</SegmentButton>
          ))}
        </ControlBlock>
      ) : (
        <ControlBlock label="Tempo para montar o time">
          {[2, 4, 6].map((value) => (
            <SegmentButton key={value} active={form.simultaneousMinutes === value} onClick={() => onChange({ ...form, simultaneousMinutes: value as 2 | 4 | 6 })}>{value} min</SegmentButton>
          ))}
        </ControlBlock>
      )}

      <div className="mt-4 border border-black/20 bg-[var(--surface-muted)] px-3 py-2 text-sm text-black">
        {form.draftMode === "turnos" ? "Cada jogador escolhe 3 atletas por vez e fecha o time com 2 escolhas finais." : "Todos montam o próprio time ao mesmo tempo e podem acompanhar as escalações dos adversários."}
      </div>

      <Button className="mt-5 w-full bg-[var(--success)] text-white hover:bg-black" disabled={creating} onClick={() => void onCreate()}>
        <Plus size={18} /> {creating ? "Criando..." : "Criar sala"}
      </Button>
    </article>
  );
}

function RoomsPanel({
  publicRooms,
  privateRooms,
  activeRoomId,
  joinPasswords,
  onPasswordChange,
  onSelect,
  onJoin
}: {
  publicRooms: FriendRoom[];
  privateRooms: FriendRoom[];
  activeRoomId?: string;
  joinPasswords: Record<string, string>;
  onPasswordChange: (roomId: string, password: string) => void;
  onSelect: (room: FriendRoom) => void;
  onJoin: (room: FriendRoom) => void;
}) {
  return (
    <article className="editorial-panel p-0">
      <div className="flex items-center justify-between gap-3 border-b border-black px-4 py-3">
        <div>
          <p className="editorial-kicker">Salas criadas</p>
          <h2 className="font-display text-2xl font-black uppercase">Disponiveis</h2>
        </div>
        <ShieldCheck className="text-electric" />
      </div>
      <div className="p-4">
        <RoomSection title="Publicas" rooms={publicRooms} activeRoomId={activeRoomId} joinPasswords={joinPasswords} onPasswordChange={onPasswordChange} onSelect={onSelect} onJoin={onJoin} />
        <RoomSection title="Privadas" rooms={privateRooms} activeRoomId={activeRoomId} joinPasswords={joinPasswords} onPasswordChange={onPasswordChange} onSelect={onSelect} onJoin={onJoin} />
      </div>
    </article>
  );
}

function RoomSection({
  title,
  rooms,
  activeRoomId,
  joinPasswords,
  onPasswordChange,
  onSelect,
  onJoin
}: {
  title: string;
  rooms: FriendRoom[];
  activeRoomId?: string;
  joinPasswords: Record<string, string>;
  onPasswordChange: (roomId: string, password: string) => void;
  onSelect: (room: FriendRoom) => void;
  onJoin: (room: FriendRoom) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
      <div className="mt-2 divide-y divide-black/15 border border-black/20">
        {rooms.length === 0 && <div className="rounded-md border border-dashed border-white/12 p-3 text-sm text-slate-400">Nenhuma sala.</div>}
        {rooms.map((room) => (
          <article key={room.id} className={cn("grid gap-2 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center", room.id === activeRoomId ? "bg-[var(--surface-muted)]" : "bg-white")}>
            <button className="w-full text-left" onClick={() => onSelect(room)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-black text-white">{room.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{room.players.length}/16 jogadores - {draftModeLabel(room.draftMode)} - {roomStatusLabel(room.status)}</p>
                </div>
                {room.visibility === "privada" ? <Lock className="shrink-0 text-gold" size={18} /> : <Users className="shrink-0 text-emerald-300" size={18} />}
              </div>
            </button>
            {room.visibility === "privada" && (
              <input
                className={cn(inputClass, "mt-3 min-h-9")}
                type="password"
                value={joinPasswords[room.id] ?? ""}
                placeholder="Senha"
                onChange={(event) => onPasswordChange(room.id, event.target.value)}
              />
            )}
            <Button variant="secondary" className="min-h-9 w-full text-xs sm:w-auto" onClick={() => onJoin(room)}>
              Entrar
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}

function ActiveRoomPanel({
  room,
  turnRemaining,
  reviewRemaining,
  penaltyRemaining,
  accountPlayerName,
  accountTeamName,
  focused = false,
  connectionStatus,
  now,
  onBackToRooms,
  onStartDraft,
  onDrawTeam,
  onSelectPick,
  onPlacePick,
  onShootPenalty,
  onChooseLegend,
  reviewSlotId,
  onReviewSlotChange,
  onMovePick,
  onReplacePick,
  onConfirmReview,
  onDrawCoaches,
  onChooseCoach,
  onChooseCard,
  onActivateCard,
  onPlayerReady,
  onPlayerSetup,
  onRoomSettings,
  onPlayMatch,
  onProgressRound,
  onResetLobby,
  onKickPlayer
}: {
  room?: FriendRoom;
  turnRemaining?: number;
  reviewRemaining?: number;
  penaltyRemaining?: number;
  accountPlayerName: string;
  accountTeamName: string;
  focused?: boolean;
  connectionStatus: RoomConnectionStatus;
  now: number;
  onBackToRooms?: () => void;
  onStartDraft: () => void;
  onDrawTeam: (playerId: string) => void;
  onSelectPick: (playerId: string, pickId: string) => void;
  onPlacePick: (playerId: string, slotId: string) => void;
  onShootPenalty: (playerId: string, direction: PenaltyDirection, accuracy: number) => void;
  onChooseLegend: (playerId: string, legendId: string) => void;
  reviewSlotId?: string;
  onReviewSlotChange: (slotId?: string) => void;
  onMovePick: (playerId: string, fromSlotId: string, toSlotId: string) => void;
  onReplacePick: (playerId: string, slotId: string, replacementId: string) => void;
  onConfirmReview: (playerId: string) => void;
  onDrawCoaches: (playerId: string) => void;
  onChooseCoach: (playerId: string, coachId: string) => void;
  onChooseCard: (playerId: string, cardId: RoomSecretCardId) => void;
  onActivateCard: (playerId: string, input?: ActivateRoomCardInput) => void;
  onPlayerReady: (playerId: string, ready: boolean) => void;
  onPlayerSetup: (playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) => void;
  onRoomSettings: (settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) => void;
  onPlayMatch: (playerId: string) => void;
  onProgressRound: () => void;
  onResetLobby: () => void;
  onKickPlayer: (playerId: string) => void;
}) {
  if (!room) {
    return (
      <section className="rounded-xl border border-white/12 bg-white/[0.055] p-8 text-center shadow-card">
        <h2 className="text-3xl font-black">Crie uma sala</h2>
        <p className="mt-2 text-slate-300">A sala aparece aqui assim que for criada.</p>
      </section>
    );
  }

  const currentPlayer = room.players.find((player) => samePlayer(player, accountPlayerName, accountTeamName));
  const isHost = sameText(room.hostName, accountPlayerName);

  return (
    <section className={cn("min-w-0", focused ? "" : "rounded-xl border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(4,18,43,.88),rgba(3,46,52,.62))] p-5 shadow-card")}>
      <div className="mb-3 flex justify-end">
        <ConnectionStateBadge status={connectionStatus} />
      </div>
      {!focused && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{room.visibility === "privada" ? "Sala privada" : "Sala publica"}</p>
            <h2 className="mt-1 text-3xl font-black">{room.name}</h2>
            <p className="mt-1 text-sm text-slate-300">Host: {room.hostName} - {room.players.length}/16 jogadores - {room.difficulty === "almanaque" ? "De almanaque" : "Classico"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={room.status} />
            {onBackToRooms && <Button variant="secondary" onClick={onBackToRooms}>Ver salas</Button>}
          </div>
        </div>
      )}

      {room.status === "lobby" && (
        <LobbyPanel
          room={room}
          currentPlayer={currentPlayer}
          isHost={isHost}
          onStartDraft={onStartDraft}
          onPlayerReady={onPlayerReady}
          onPlayerSetup={onPlayerSetup}
          onRoomSettings={onRoomSettings}
          now={now}
          connectionStatus={connectionStatus}
          onKickPlayer={onKickPlayer}
        />
      )}

      {room.status === "drafting" && (
        <DraftPanel
          room={room}
          turnRemaining={turnRemaining}
          currentPlayer={currentPlayer}
          onDrawTeam={onDrawTeam}
          onSelectPick={onSelectPick}
          onPlacePick={onPlacePick}
        />
      )}

      {room.status === "challenge" && (
        <PenaltyChallengePanel
          room={room}
          currentPlayer={currentPlayer}
          remaining={penaltyRemaining ?? 0}
          onShoot={onShootPenalty}
          onChooseLegend={onChooseLegend}
        />
      )}

      {room.status === "reviewing" && (
        <ReviewPanel
          room={room}
          currentPlayer={currentPlayer}
          reviewRemaining={reviewRemaining ?? 0}
          selectedSlotId={reviewSlotId}
          onSelectSlot={onReviewSlotChange}
          onMovePick={onMovePick}
          onReplacePick={onReplacePick}
          onConfirmReview={onConfirmReview}
        />
      )}

      {room.status === "coach" && (
        <RoomCoachPanel
          room={room}
          currentPlayer={currentPlayer}
          onDrawCoaches={onDrawCoaches}
          onChooseCoach={onChooseCoach}
        />
      )}

      {room.status === "cards" && (
        <RoomSecretCardPanel room={room} currentPlayer={currentPlayer} onChooseCard={onChooseCard} />
      )}

      {(room.status === "bracket" || room.status === "finished") && (
        <RoomBracket room={room} currentPlayer={currentPlayer} isHost={isHost} onActivateCard={onActivateCard} onPlayMatch={onPlayMatch} onProgressRound={onProgressRound} onResetLobby={onResetLobby} />
      )}
    </section>
  );
}

function LobbyPanel({
  room,
  currentPlayer,
  isHost,
  onStartDraft,
  onPlayerReady,
  onPlayerSetup,
  onRoomSettings,
  now,
  connectionStatus,
  onKickPlayer
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  isHost: boolean;
  onStartDraft: () => void;
  onPlayerReady: (playerId: string, ready: boolean) => void;
  onPlayerSetup: (playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) => void;
  onRoomSettings: (settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) => void;
  now: number;
  connectionStatus: RoomConnectionStatus;
  onKickPlayer: (playerId: string) => void;
}) {
  const realPlayers = room.players.filter((player) => !player.isBot);
  const readyCount = realPlayers.filter((player) => player.ready).length;
  const autoTeams = Math.max(0, 16 - realPlayers.length);
  const canStart = realPlayers.length > 0 && readyCount === realPlayers.length;

  return (
    <div className="mt-5">
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(220px,.72fr)_minmax(300px,1.05fr)_minmax(280px,.9fr)]">
        {currentPlayer ? (
          <PlayerSetupPanel player={currentPlayer} onReady={onPlayerReady} onSetup={onPlayerSetup} />
        ) : (
          <div className="border border-dashed border-black/25 bg-white p-4 text-sm text-[var(--muted)]">
            Entre nessa sala pela lista para configurar seu time e confirmar pronto.
          </div>
        )}
        <RoomFormationPreview formation={currentPlayer?.formation ?? "4-3-3"} tacticalStyle={currentPlayer?.tacticalStyle ?? "equilibrado"} />
        <div className="border border-black bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-black">Jogadores na sala</h3>
            <p className="text-sm text-slate-400">Ao iniciar, {autoTeams} vagas restantes entram como times historicos aleatorios.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-black text-gold">{readyCount}/{realPlayers.length} prontos</span>
            {isHost ? (
              <Button disabled={!canStart} onClick={onStartDraft}><Play size={18} /> Iniciar draft</Button>
            ) : (
              <span className="rounded-full border border-white/10 px-3 py-2 text-xs font-black text-slate-300">Aguardando host</span>
            )}
          </div>
        </div>
        <RoomInvite room={room} />
        <PlayerLobbyList
          room={room}
          players={realPlayers}
          now={now}
          currentPlayerId={currentPlayer?.id}
          isHost={isHost}
          connectionStatus={connectionStatus}
          onKickPlayer={onKickPlayer}
        />
      </div>
      </div>
      {isHost && <div className="mt-4"><HostSettingsPanel room={room} onChange={onRoomSettings} /></div>}
    </div>
  );
}

function DraftPanel({
  room,
  turnRemaining,
  currentPlayer,
  onDrawTeam,
  onSelectPick,
  onPlacePick
}: {
  room: FriendRoom;
  turnRemaining?: number;
  currentPlayer?: RoomPlayer;
  onDrawTeam: (playerId: string) => void;
  onSelectPick: (playerId: string, pickId: string) => void;
  onPlacePick: (playerId: string, slotId: string) => void;
}) {
  const currentPlayerId = currentPlayer?.id;
  const turnPlayer = room.draftMode === "todos" ? currentPlayer : room.players[room.turnIndex];
  const isMyTurn = Boolean(currentPlayerId && (room.draftMode === "todos" || turnPlayer?.id === currentPlayerId));
  const [previewPlayerId, setPreviewPlayerId] = useState<string>();
  const previewPlayer = room.players.find((player) => player.id === previewPlayerId);
  const fieldPlayer = previewPlayer ?? (isMyTurn ? currentPlayer : turnPlayer ?? currentPlayer ?? room.players[0]);
  const activeDraw = room.draftMode === "todos" && currentPlayerId ? room.currentDrawByPlayer?.[currentPlayerId] : room.currentDraw;
  const activePendingPickId = room.draftMode === "todos" && currentPlayerId ? room.pendingPickByPlayer?.[currentPlayerId] : room.pendingPickId;
  const pendingPick = isMyTurn && !previewPlayer ? activeDraw?.roster.find((pick) => pick.id === activePendingPickId) : undefined;
  const rerollsUsed = turnPlayer ? room.rerollsByPlayer?.[turnPlayer.id] ?? 0 : 0;
  const rerollsLeft = Math.max(0, 3 - rerollsUsed);
  const draftTarget = room.penaltyWinnerId ? 11 : 10;
  const batchStartSize = Math.max(0, (turnPlayer?.squad.length ?? 0) - room.picksInTurn);
  const batchLimit = batchStartSize >= 9 ? 1 : 3;
  const batchRemaining = Math.max(1, batchLimit - room.picksInTurn);
  const turnText = room.draftMode === "todos"
    ? `Monte ${draftTarget} jogadores antes do tempo acabar`
    : batchLimit === 1
      ? room.penaltyWinnerId ? "Escolha o ultimo jogador" : "Feche os 10 para liberar o desafio"
      : "Escolha 3 jogadores nesta vez";
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRevealingDraw, setIsRevealingDraw] = useState(false);
  const [rollingIndex, setRollingIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const drawingLockRef = useRef(false);
  const previousDrawKeyRef = useRef<string>("");
  const skipNextRevealRef = useRef(false);
  const rollingClub = useMemo(() => clubSeasonData[rollingIndex % clubSeasonData.length], [rollingIndex]);
  const drawKey = activeDraw ? `${turnPlayer?.id ?? "player"}:${turnPlayer?.squad.length ?? 0}:${room.picksInTurn}:${activeDraw.clubSeasonId}` : "";

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!drawKey) {
      previousDrawKeyRef.current = "";
      setIsRevealingDraw(false);
      return;
    }
    if (drawKey === previousDrawKeyRef.current) return;
    previousDrawKeyRef.current = drawKey;
    if (isMyTurn) {
      skipNextRevealRef.current = false;
      setIsRevealingDraw(false);
      return;
    }
    if (skipNextRevealRef.current) {
      skipNextRevealRef.current = false;
      setIsRevealingDraw(false);
      return;
    }
    setIsRevealingDraw(true);
    setRollingIndex((value) => value + 1);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setRollingIndex((value) => value + 1 + Math.floor(Math.random() * 3));
    }, 115);
    if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    revealTimeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      setIsRevealingDraw(false);
    }, 1000);
  }, [drawKey, isMyTurn]);

  function runDrawAnimation() {
    if (!currentPlayerId || isDrawing || drawingLockRef.current || !isMyTurn) return;
    drawingLockRef.current = true;
    setIsDrawing(true);
    setRollingIndex((value) => value + 1);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (revealTimeoutRef.current) window.clearTimeout(revealTimeoutRef.current);
    intervalRef.current = window.setInterval(() => {
      setRollingIndex((value) => value + 1 + Math.floor(Math.random() * 3));
    }, 115);
    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      skipNextRevealRef.current = true;
      onDrawTeam(currentPlayerId);
      setIsDrawing(false);
      drawingLockRef.current = false;
    }, 1000);
  }

  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(380px,.9fr)_minmax(420px,1.1fr)]">
      <RoomSquadField
        player={fieldPlayer}
        pendingPick={pendingPick}
        interactive={isMyTurn && !previewPlayer}
        onPlace={(slotId) => currentPlayerId && onPlacePick(currentPlayerId, slotId)}
      />
      <aside className="space-y-4 xl:sticky xl:top-20">
        {room.draftMode === "todos" && currentPlayer && (
          <div className="flex flex-wrap items-center gap-2 border border-black bg-white p-2 text-black">
            <span className="mr-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Ver elencos</span>
            <button type="button" className={cn("border px-2 py-1 text-xs font-black", !previewPlayer ? "border-black bg-[var(--success)] text-white" : "border-black/20 bg-white text-black")} onClick={() => setPreviewPlayerId(undefined)}>Meu time</button>
            {room.players.filter((player) => player.id !== currentPlayer.id).map((player) => (
              <button key={player.id} type="button" className={cn("max-w-32 truncate border px-2 py-1 text-xs font-black", previewPlayerId === player.id ? "border-black bg-[var(--success)] text-white" : "border-black/20 bg-white text-black")} onClick={() => setPreviewPlayerId(player.id)}>{player.teamName}</button>
            ))}
          </div>
        )}
        <div className="overflow-hidden border border-black bg-white">
          <div className={cn("border-b border-black/15 p-4", isMyTurn && !previewPlayer ? "bg-[var(--success)] text-white" : "bg-[var(--surface-muted)] text-black")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={cn("text-xs font-black uppercase tracking-[0.2em]", isMyTurn && !previewPlayer ? "text-white/80" : "text-[var(--success)]")}>{isMyTurn && !previewPlayer ? "Agora" : "Vez de escolher"}</p>
                <h3 className="mt-1 truncate font-display text-4xl font-black uppercase leading-none">{isMyTurn && !previewPlayer ? "Sua vez" : turnPlayer?.teamName ?? "Jogador"}</h3>
                {isMyTurn && !previewPlayer && <p className="mt-2 text-sm font-bold text-white">{room.draftMode === "turnos" ? `${batchRemaining} escolha(s) neste bloco` : `${Math.max(0, draftTarget - (currentPlayer?.squad.length ?? 0))} jogador(es) para fechar esta etapa`}</p>}
              </div>
              <TimerPill seconds={turnRemaining ?? room.turnSeconds} icon={<Volume2 size={16} />} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">
              <span className="border border-black/15 bg-white px-3 py-1.5">{fieldPlayer?.formation ?? "4-3-3"}</span>
              <span className="border border-black/15 bg-white px-3 py-1.5">{room.difficulty === "almanaque" ? "De almanaque" : "Classico"}</span>
              <span className={cn("border px-3 py-1.5", isMyTurn && !previewPlayer ? "border-white/40 bg-black/15 text-white" : "border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]")}>{turnText}{room.draftMode === "turnos" ? ` - faltam ${batchRemaining}` : ""}</span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {isMyTurn ? (pendingPick ? "Clique em uma posicao destacada no campo ou troque o jogador na lista." : "Sorteie um time, escolha um jogador e depois a posicao.") : "Aguardando esse jogador escolher."}
            </p>
          </div>
          <div className="relative p-4">
            {!isMyTurn && !previewPlayer && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-white/90 p-5 text-center" aria-live="polite">
                <div>
                  <Lock className="mx-auto mb-2" size={22} />
                  <p className="font-display text-2xl font-black uppercase text-black">Aguardando {turnPlayer?.teamName}</p>
                  <p className="mt-1 text-xs font-bold text-[var(--muted)]">Os controles liberam automaticamente na sua vez.</p>
                </div>
              </div>
            )}
            {(isDrawing || isRevealingDraw) && rollingClub ? (
              <RollingTeamCard club={rollingClub} />
            ) : !activeDraw ? (
              <div className="border border-dashed border-black/25 bg-[var(--surface-muted)] p-5 text-center">
                <p className="text-sm font-semibold text-[var(--muted)]">{isMyTurn ? "Nenhum time sorteado para esta escolha." : "O jogador da vez ainda nao sorteou o time."}</p>
                <Button className="mt-4 w-full" disabled={!isMyTurn || isDrawing} onClick={runDrawAnimation}>
                  <Dices size={18} /> Sortear time
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 border border-black/15 bg-[var(--surface-muted)] px-3 py-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-black">Rerolls: <strong className="text-[var(--success)]">{rerollsLeft}</strong>/3</span>
                  <Button variant="secondary" disabled={!isMyTurn || isDrawing || rerollsLeft <= 0} onClick={runDrawAnimation}>
                    <Dices size={18} /> Sortear novamente
                  </Button>
                </div>
                <DrawnTeamRoster
                  draw={activeDraw}
                  player={turnPlayer}
                  selectedPickId={activePendingPickId}
                  disabled={!isMyTurn}
                  onPick={(pickId) => currentPlayerId && onSelectPick(currentPlayerId, pickId)}
                />
              </div>
            )}
          </div>
        </div>

        <DraftProgress players={room.players} currentPlayerId={currentPlayerId} />
      </aside>
    </div>
  );
}

function DrawnTeamRoster({
  draw,
  player,
  selectedPickId,
  disabled,
  onPick
}: {
  draw: RoomDraw;
  player?: RoomPlayer;
  selectedPickId?: string;
  disabled: boolean;
  onPick: (pickId: string) => void;
}) {
  const orderedRoster = draw.roster
    .slice()
    .sort((a, b) => Number(!isRoomPickEligible(player, a)) - Number(!isRoomPickEligible(player, b)) || roomPositionOrder(a.position) - roomPositionOrder(b.position) || (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99));
  return (
    <div className="overflow-hidden border border-black/20 bg-white">
      <div
        className="flex items-center gap-4 border-b border-black/15 px-4 py-3"
        style={{
          background: `linear-gradient(90deg, ${draw.primaryColor}22, var(--surface-muted) 48%, ${draw.secondaryColor}18)`
        }}
      >
        <GenericBadge club={draw} size={68} />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{draw.rarity}</p>
          <h4 className="mt-1 truncate text-xl font-black text-black">{draw.clubName} {draw.season}</h4>
          <p className="text-sm text-[var(--muted)]">{draw.country}</p>
        </div>
      </div>
      <div className="game-scrollbar min-h-[240px] max-h-[min(560px,65dvh)] touch-pan-y overflow-y-auto overscroll-contain">
      {orderedRoster.map((pick) => {
        const alreadyPicked = Boolean(player?.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId));
        const eligible = isRoomPickEligible(player, pick);
        const blocked = disabled || alreadyPicked || !eligible;
        return (
        <button
          key={pick.id}
          className={cn(
            "grid w-full grid-cols-[3rem_minmax(0,1fr)_3.75rem_3.5rem] items-center gap-3 border-b border-black/10 px-3 py-2.5 text-left text-sm transition last:border-b-0",
            selectedPickId === pick.id && "bg-gold/15 ring-1 ring-inset ring-gold/70",
            blocked ? "cursor-not-allowed opacity-45" : "bg-white hover:bg-[var(--success)]/10"
          )}
          disabled={blocked}
          onClick={() => onPick(pick.id)}
        >
          <span className="font-mono text-xs font-black text-[var(--success)]">#{pick.shirtNumber ?? "--"}</span>
          <div className="min-w-0">
            <p className="truncate font-black text-black">{pick.name}</p>
            <p className="truncate text-xs text-[var(--muted)]">{pick.nationality ?? pick.clubName}</p>
          </div>
          <span className="justify-self-center border border-black/15 bg-[var(--surface-muted)] px-2 py-1 font-mono text-[11px] font-black text-[var(--success)]">{positionLabel(pick.position)}</span>
          <span className="text-right font-mono text-lg font-black text-[var(--warning)] tabular-nums">{alreadyPicked ? "XI" : pick.overall}</span>
        </button>
      );})}
      </div>
    </div>
  );
}

function RollingTeamCard({ club }: { club: (typeof clubSeasonData)[number] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gold/35 bg-white/[0.06] shadow-card">
      <div
        className="flex min-h-28 items-center gap-4 p-4"
        style={{
          background: `linear-gradient(135deg, ${club.primaryColor}55, rgba(7,24,50,.9) 52%, ${club.secondaryColor}35)`
        }}
      >
        <GenericBadge club={club} size={72} />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Sorteio em movimento</p>
          <h4 className="mt-1 truncate text-2xl font-black text-white">{club.clubName} {club.season}</h4>
          <p className="text-sm text-slate-300">{club.country}</p>
        </div>
      </div>
    </div>
  );
}

function RoomSquadField({
  player,
  pendingPick,
  interactive = false,
  onPlace,
  reviewSelectionSlotId,
  onReviewSlotClick
}: {
  player?: RoomPlayer;
  pendingPick?: RoomPick;
  interactive?: boolean;
  onPlace?: (slotId: string) => void;
  reviewSelectionSlotId?: string;
  onReviewSlotClick?: (slotId: string) => void;
}) {
  const slots = getFormationSlots(player?.formation ?? "4-3-3", player?.tacticalStyle ?? "equilibrado");
  const assigned = assignRoomPicksToSlots(slots, player?.squad ?? []);
  const rating = player?.squad.length ? Math.round(player.squad.reduce((sum, pick) => sum + (pick.effectiveRating ?? pick.overall), 0) / player.squad.length) : 0;
  const progress = Math.round(((player?.squad.length ?? 0) / 11) * 100);

  return (
    <section className="border border-black bg-white p-3">
      <div className="mb-3 border border-black/15 bg-[var(--surface-muted)] px-4 py-3">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
          <div className="rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-gold">Rating</span>
            <span className="font-mono text-2xl font-black leading-none text-black">{rating}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Elenco</span>
              <span className="font-mono text-sm font-black text-black">{player?.squad.length ?? 0}/11</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-electric to-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rounded-full border border-electric/25 bg-electric/10 px-3 py-2 text-center">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-electric">Time</span>
            <span className="block max-w-40 truncate text-sm font-black text-black">{player?.teamName ?? "Aguardando"}</span>
          </div>
        </div>
      </div>
      <div className="relative mx-auto aspect-[7/10] max-h-[590px] min-h-[390px] overflow-hidden border border-black/20 field-lines sm:min-h-[460px]">
        <SoccerFieldMarkings />
        <ChemistryLinks
          slots={slots}
          players={Object.entries(assigned).flatMap(([slotId, pick]) =>
            pick
              ? [{
                  slotId,
                  nationality: pick.nationality,
                  clubKey: `${pick.clubName}-${pick.season}`
                }]
              : []
          )}
        />
        {slots.map((slot) => {
          const pick = assigned[slot.id];
          const pendingFit = pendingPick && !pick ? roomPickFit(pendingPick, slot.position) : undefined;
          const canPlacePending = Boolean(interactive && pendingFit?.allowed);
          const reviewMode = Boolean(onReviewSlotClick);
          const selectedForReview = reviewSelectionSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 border text-center text-[11px] font-bold shadow-card transition",
                pick ? "grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border-electric bg-night/95 px-2 text-white ring-1 ring-electric/35" : "grid h-12 w-16 place-items-center rounded-md border-dashed border-white/40 bg-white/10 px-2 text-slate-200",
                canPlacePending && "border-gold bg-gold/20 text-white ring-2 ring-gold hover:bg-gold/30",
                pendingPick && !canPlacePending && !pick && "opacity-35",
                selectedForReview && "ring-2 ring-gold",
                reviewMode && "hover:border-gold"
              )}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              onClick={() => {
                if (canPlacePending) onPlace?.(slot.id);
                else if (reviewMode && (pick || reviewSelectionSlotId)) onReviewSlotClick?.(slot.id);
              }}
            >
              {pick ? (
                <>
                  <NationalityFlag
                    nationality={pick.nationality}
                    className="absolute left-1/2 top-1.5 w-7 -translate-x-1/2"
                  />
                  <span className="mt-6 max-w-[4.15rem] truncate px-0.5 text-[10px] leading-tight">{shortName(pick.name)}</span>
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-gold/80 bg-gold font-mono text-[11px] font-black text-night shadow-[0_0_16px_rgba(248,198,48,.35)]">
                    {pick.effectiveRating ?? pick.overall}
                  </span>
                  <span className="absolute -bottom-3 rounded-full border border-white/10 bg-black/75 px-2.5 py-0.5 text-[9px] font-black text-sky-100">{slot.label}</span>
                </>
              ) : (
                <span>{slot.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DraftProgress({ players, currentPlayerId }: { players: RoomPlayer[]; currentPlayerId?: string }) {
  return (
    <div className="border border-black bg-white p-4 text-black">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Jogadores</p>
        <span className="text-xs font-bold text-[var(--muted)]">{players.length}/16</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {players.map((player) => (
          <div key={player.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 border px-3 py-2 text-sm", player.id === currentPlayerId ? "border-[var(--warning)] bg-[var(--warning)]/10" : "border-black/15 bg-[var(--surface-muted)]")}>
            <span className="min-w-0">
              <span className="block truncate font-black text-black">{player.teamName}</span>
              <span className="block truncate text-xs text-[var(--muted)]">{player.ready ? "Pronto" : "Montando elenco"}</span>
            </span>
            <span className="font-mono text-xs font-black text-gold">{player.squad.length}/11</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PenaltyChallengePanel({
  room,
  currentPlayer,
  remaining,
  onShoot,
  onChooseLegend
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  remaining: number;
  onShoot: (playerId: string, direction: PenaltyDirection, accuracy: number) => void;
  onChooseLegend: (playerId: string, legendId: string) => void;
}) {
  const [accuracy, setAccuracy] = useState(50);
  const [shotLocked, setShotLocked] = useState(false);
  const round = room.penaltyRound;
  const myShots = currentPlayer ? room.penaltyShotsByPlayer[currentPlayer.id] ?? [] : [];
  const myRoundShots = myShots.filter((shot) => shot.round === round);
  const lastRoundShot = myRoundShots[myRoundShots.length - 1];
  const requiredShots = round === 0 ? 3 : 1;
  const isEligible = Boolean(currentPlayer && room.penaltyEligiblePlayerIds.includes(currentPlayer.id));
  const canShoot = Boolean(currentPlayer && !room.penaltyWinnerId && isEligible && myRoundShots.length < requiredShots && remaining > 0 && !shotLocked);
  const winner = room.players.find((player) => player.id === room.penaltyWinnerId);
  const isWinner = Boolean(currentPlayer && room.penaltyWinnerId === currentPlayer.id);

  useEffect(() => {
    if (!canShoot) return;
    let frame = 0;
    const startedAt = performance.now();
    const animate = (timestamp: number) => {
      const phase = ((timestamp - startedAt) % 1600) / 1600;
      const wave = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;
      setAccuracy(Math.round(8 + wave * 92));
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [canShoot]);

  useEffect(() => {
    setShotLocked(false);
  }, [myShots.length, round]);

  function takeShot(direction: PenaltyDirection) {
    if (!currentPlayer || !canShoot) return;
    setShotLocked(true);
    onShoot(currentPlayer.id, direction, accuracy);
    window.setTimeout(() => setShotLocked(false), 1200);
  }

  function directionLabel(direction: PenaltyDirection) {
    if (direction === "left") return "esquerda";
    if (direction === "right") return "direita";
    return "centro";
  }

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/75 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-label="Desafio do Craque 99">
      <div className="mx-auto min-h-full max-w-6xl border border-black bg-[var(--surface)] text-black shadow-2xl">
        <header className="grid gap-4 border-b border-black bg-[var(--success)] p-5 text-white md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/75">Ultima vaga do elenco</p>
            <h2 className="mt-2 font-display text-4xl font-black uppercase leading-none sm:text-6xl">Penalti de Ouro</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-white/85">Tres cobrancas para disputar a primeira escolha entre cinco Craques 99.</p>
          </div>
          <div className="flex items-center gap-3 border border-white/40 bg-black/15 px-4 py-3">
            <Clock size={20} />
            <span className="font-mono text-3xl font-black tabular-nums">0:{String(remaining).padStart(2, "0")}</span>
          </div>
        </header>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <section className="border-b border-black p-4 sm:p-6 lg:border-b-0 lg:border-r">
            {!room.penaltyWinnerId ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--success)]">{round === 0 ? "Rodada principal" : `Morte subita ${round}/${3}`}</p>
                    <h3 className="mt-1 text-2xl font-black">{isEligible ? "Escolha o canto" : "Acompanhe o desempate"}</h3>
                  </div>
                  <p className="font-mono text-sm font-black">{Math.min(myRoundShots.length, requiredShots)}/{requiredShots} cobranca(s)</p>
                </div>

                <div className="mx-auto mt-5 max-w-2xl border-x-8 border-t-8 border-black bg-[linear-gradient(180deg,#dff7eb_0_72%,#137a4c_72%)] p-3 pt-8 shadow-[inset_0_0_0_2px_rgba(0,0,0,.12)] sm:p-6 sm:pt-12">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    {(["left", "center", "right"] as PenaltyDirection[]).map((direction) => (
                      <button
                        key={direction}
                        type="button"
                        disabled={!canShoot}
                        className="grid min-h-24 place-items-center border-2 border-dashed border-black/55 bg-white px-2 font-black uppercase text-black transition hover:border-[var(--success)] hover:bg-[var(--success)] hover:text-white focus-visible:border-[var(--success)] focus-visible:bg-[var(--success)] focus-visible:text-white focus-visible:outline focus-visible:outline-4 focus-visible:outline-[var(--warning)] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-36"
                        onClick={() => takeShot(direction)}
                      >
                        <CircleDot size={28} />
                        <span>{direction === "left" ? "Esquerda" : direction === "right" ? "Direita" : "Centro"}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mx-auto mt-5 max-w-2xl">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em]">
                    <span>Precisao</span><span>{accuracy}%</span>
                  </div>
                  <div
                    className="penalty-accuracy-track relative mt-2 h-6 overflow-hidden border-2 border-black"
                  >
                    <div className="penalty-accuracy-marker" style={{ left: `${accuracy}%` }} aria-hidden="true" />
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
                    <span>Baixa</span><span>Alta</span>
                  </div>
                  <p className="mt-3 text-center text-xs font-bold text-[var(--muted)]">Pare o marcador na faixa verde e escolha o canto da cobranca.</p>
                </div>

                {lastRoundShot && (
                  <div
                    aria-live="polite"
                    className={cn(
                      "mx-auto mt-5 max-w-2xl border-2 border-black px-4 py-3 text-center text-white shadow-[4px_4px_0_#000]",
                      lastRoundShot.scored ? "bg-[var(--success)]" : "bg-[#c73333]"
                    )}
                  >
                    <strong className="block font-display text-3xl font-black uppercase leading-none">{lastRoundShot.scored ? "Gol!" : "Defendido"}</strong>
                    <span className="mt-1 block text-xs font-bold">
                      Chute na {directionLabel(lastRoundShot.direction)} com {lastRoundShot.accuracy}% de precisao.
                    </span>
                  </div>
                )}

                <div className="mt-5 flex justify-center gap-2">
                  {Array.from({ length: requiredShots }, (_, index) => {
                    const shot = myRoundShots[index];
                    return <span key={index} className={cn("grid h-10 w-10 place-items-center border border-black font-mono text-sm font-black", shot ? shot.scored ? "bg-[var(--success)] text-white" : "bg-[#c73333] text-white" : "bg-white text-black")}>{shot ? shot.scored ? "GOL" : "X" : index + 1}</span>;
                  })}
                </div>
              </>
            ) : (
              <div className="py-8 text-center sm:py-14">
                <Crown className="mx-auto text-[var(--warning)]" size={48} />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-[var(--success)]">Vencedor do desafio</p>
                <h3 className="mt-2 font-display text-5xl font-black uppercase">{winner?.teamName}</h3>
                {!isWinner && <p className="mx-auto mt-3 max-w-xl text-sm font-semibold text-[var(--muted)]">O vencedor esta escolhendo o Craque 99. Sua ultima vaga sera preenchida pelo draft tradicional.</p>}
              </div>
            )}

            {room.penaltyWinnerId && isWinner && !room.legendSelectedId && (
              <div className="border-t border-black pt-5">
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--success)]">Premio</p><h3 className="mt-1 text-2xl font-black">Escolha seu Craque 99</h3></div>
                  <span className="font-mono text-sm font-black">5 opcoes</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                  {room.legendOptions.map((legend) => (
                    <button key={legend.id} type="button" className="group min-h-40 border border-black bg-white p-3 text-left transition hover:-translate-y-1 hover:bg-[var(--success)] hover:text-white" onClick={() => currentPlayer && onChooseLegend(currentPlayer.id, legend.id)}>
                      <span className="font-mono text-4xl font-black text-[var(--warning)]">99</span>
                      <span className="mt-4 block text-lg font-black leading-tight">{legend.name}</span>
                      <span className="mt-1 block text-xs font-bold opacity-70">{positionLabel(legend.position)} - {legend.clubName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="bg-white p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--success)]">Placar ao vivo</p>
            <div className="mt-3 divide-y divide-black/15 border-y border-black">
              {room.players.map((player) => {
                const shots = room.penaltyShotsByPlayer[player.id] ?? [];
                const goals = shots.filter((shot) => shot.scored).length;
                const active = room.penaltyEligiblePlayerIds.includes(player.id);
                return (
                  <div key={player.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 py-3", !active && round > 0 && "opacity-45")}>
                    <div className="min-w-0"><p className="truncate font-black">{player.teamName}</p><p className="text-xs text-[var(--muted)]">{shots.length} cobranca(s)</p></div>
                    <span className="font-mono text-2xl font-black text-[var(--success)]">{goals}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs font-semibold leading-relaxed text-[var(--muted)]">Em empate, os lideres fazem ate tres cobrancas alternadas. Persistindo a igualdade, vence o melhor indice tecnico do elenco.</p>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReviewPanel({
  room,
  currentPlayer,
  reviewRemaining,
  selectedSlotId,
  onSelectSlot,
  onMovePick,
  onReplacePick,
  onConfirmReview
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  reviewRemaining: number;
  selectedSlotId?: string;
  onSelectSlot: (slotId?: string) => void;
  onMovePick: (playerId: string, fromSlotId: string, toSlotId: string) => void;
  onReplacePick: (playerId: string, slotId: string, replacementId: string) => void;
  onConfirmReview: (playerId: string) => void;
}) {
  const fieldPlayer = currentPlayer ?? room.players[0];
  const replacementUsed = Boolean(currentPlayer && room.reviewSwapUsedByPlayer[currentPlayer.id]);
  const selectedPick = currentPlayer?.squad.find((pick) => pick.slotId === selectedSlotId);
  const selectedSlot = selectedSlotId ? getFormationSlots(fieldPlayer?.formation ?? "4-3-3", fieldPlayer?.tacticalStyle ?? "equilibrado").find((slot) => slot.id === selectedSlotId) : undefined;
  const replacementOptions = useMemo(() => {
    if (!currentPlayer || !selectedSlot || replacementUsed) return [];
    const usedCanonicals = new Set(currentPlayer.squad.map((pick) => pick.canonicalPlayerId));
    const seed = `${room.id}-${currentPlayer.id}-${selectedSlot.id}-${room.reviewEndsAt ?? 0}`;
    return shuffleReviewOptions(
      playerData.filter((player) => player.isActive && !usedCanonicals.has(player.canonicalPlayerId) && calculatePositionFit(player, selectedSlot.position).allowed),
      seed
    )
      .slice(0, 10)
      .map((player) => {
        const season = clubSeasonData.find((item) => item.id === player.clubSeasonId);
        const fit = calculatePositionFit(player, selectedSlot.position);
        return { player, season, effectiveRating: fit.effectiveRating };
      });
  }, [currentPlayer, replacementUsed, room.id, room.reviewEndsAt, selectedSlot]);

  function handleReviewSlot(slotId: string) {
    if (!currentPlayer) return;
    const hasPick = currentPlayer.squad.some((pick) => pick.slotId === slotId);
    if (!selectedSlotId) {
      if (hasPick) onSelectSlot(slotId);
      return;
    }
    if (selectedSlotId === slotId) {
      onSelectSlot(undefined);
      return;
    }
    onMovePick(currentPlayer.id, selectedSlotId, slotId);
    onSelectSlot(undefined);
  }

  function handleReplacement(replacementId: string) {
    if (!currentPlayer || !selectedSlotId || replacementUsed) return;
    onReplacePick(currentPlayer.id, selectedSlotId, replacementId);
    onSelectSlot(undefined);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
      <RoomSquadField player={fieldPlayer} reviewSelectionSlotId={selectedSlotId} onReviewSlotClick={handleReviewSlot} />
      <aside className="space-y-4">
        <div className="rounded-lg border border-gold/25 bg-gold/10 p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Ajuste final</p>
          <h3 className="mt-2 text-3xl font-black">Uma troca opcional em 30 segundos</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">Troque um jogador ou confirme seu elenco. Quando todos confirmarem, a escolha dos tecnicos comeca imediatamente.</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <TimerPill seconds={reviewRemaining} icon={<Clock size={16} />} />
            {currentPlayer && !replacementUsed && (
              <Button onClick={() => { onSelectSlot(undefined); onConfirmReview(currentPlayer.id); }}>
                <Check size={17} /> Confirmar elenco
              </Button>
            )}
          </div>
        </div>
        {currentPlayer && replacementUsed && (
          <div className="border border-[var(--success)] bg-[var(--success)]/10 p-5 text-sm font-black text-black">
            Seu elenco esta confirmado. Aguardando os demais jogadores.
          </div>
        )}
        {currentPlayer && selectedSlot && !replacementUsed && (
          <div className="rounded-lg border border-emerald-300/20 bg-emerald-950/25 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Substitutos</p>
                <p className="mt-1 text-sm text-slate-300">
                  {selectedPick ? `${selectedPick.name} - ${selectedSlot.label}` : selectedSlot.label}
                </p>
              </div>
              <Button variant="secondary" onClick={() => onSelectSlot(undefined)}>Cancelar</Button>
            </div>
            <div className="mt-3 max-h-[360px] overflow-y-auto rounded-md border border-white/10">
              {replacementOptions.map(({ player, season, effectiveRating }) => (
                <button
                  key={player.id}
                  type="button"
                  className="grid w-full grid-cols-[minmax(0,1fr)_3.5rem_3.5rem] items-center gap-3 border-b border-white/10 bg-white/[0.035] px-3 py-3 text-left text-sm transition last:border-b-0 hover:bg-electric/10"
                  onClick={() => handleReplacement(player.id)}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-black text-white">{player.name}</span>
                    <span className="block truncate text-xs text-slate-400">{season ? `${season.clubName} ${shortSeason(season.season)}` : player.nationality}</span>
                  </span>
                  <span className="justify-self-center rounded-full border border-emerald-300/15 bg-night/45 px-2 py-1 font-mono text-[11px] font-black text-emerald-300">{positionLabel(player.primaryPosition)}</span>
                  <span className="text-right font-mono text-lg font-black text-gold">{effectiveRating}</span>
                </button>
              ))}
              {replacementOptions.length === 0 && <div className="p-3 text-sm text-slate-400">Nenhum substituto compativel encontrado.</div>}
            </div>
          </div>
        )}
        {currentPlayer && !selectedSlot && !replacementUsed && (
          <div className="rounded-lg border border-dashed border-white/15 bg-night/45 p-5 text-sm font-semibold text-slate-300">
            Selecione um jogador no campo para ver as opcoes de troca.
          </div>
        )}
        <DraftProgress players={room.players} currentPlayerId={currentPlayer?.id} />
      </aside>
    </div>
  );
}

function RoomCoachPanel({
  room,
  currentPlayer,
  onDrawCoaches,
  onChooseCoach
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  onDrawCoaches: (playerId: string) => void;
  onChooseCoach: (playerId: string, coachId: string) => void;
}) {
  const options = currentPlayer ? room.coachOptionsByPlayer[currentPlayer.id] ?? [] : [];
  const selectedCoachId = currentPlayer ? room.selectedCoachByPlayer[currentPlayer.id] : undefined;
  const selectedCoach = options.find((coach) => coach.id === selectedCoachId);

  return (
    <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <RoomSquadField player={currentPlayer ?? room.players[0]} />
      <aside className="space-y-4">
        <div className="border border-black bg-white p-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--success)]">Tecnico</p>
          <h3 className="mt-2 text-3xl font-black">{currentPlayer?.teamName ?? "Aguardando"}</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">Sorteie 3 tecnicos e escolha 1 para comandar seu time no mata-mata.</p>
          {currentPlayer && options.length === 0 && (
            <Button className="mt-4 w-full" onClick={() => onDrawCoaches(currentPlayer.id)}>
              <Dices size={18} /> Sortear 3 tecnicos
            </Button>
          )}
          {selectedCoach && (
            <div className="mt-4 border border-[var(--success)] bg-[var(--success)] px-4 py-3 text-white">
              <p className="text-xs font-black uppercase tracking-[0.18em]">Escolhido</p>
              <p className="mt-1 font-black">{selectedCoach.name} - {selectedCoach.clubName} {shortSeason(selectedCoach.season)}</p>
            </div>
          )}
        </div>
        {options.length > 0 && (
          <div className="grid gap-3">
            {options.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
                squad={currentPlayer?.squad ?? []}
                selected={selectedCoachId === coach.id}
                disabled={Boolean(selectedCoachId)}
                onChoose={() => currentPlayer && onChooseCoach(currentPlayer.id, coach.id)}
              />
            ))}
          </div>
        )}
        <CoachProgress room={room} />
      </aside>
    </div>
  );
}

function RoomSecretCardPanel({
  room,
  currentPlayer,
  onChooseCard
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  onChooseCard: (playerId: string, cardId: RoomSecretCardId) => void;
}) {
  const selectedId = currentPlayer ? room.selectedCardByPlayer[currentPlayer.id] : undefined;
  const selected = roomSecretCard(selectedId);
  const confirmed = Boolean(currentPlayer?.ready);
  const readyCount = room.players.filter((player) => player.ready).length;

  return (
    <div className="mx-auto max-w-5xl border border-black bg-white p-5 text-black">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-black pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--success)]">Carta secreta</p>
          <h3 className="mt-1 text-3xl font-black">Sua vantagem foi sorteada</h3>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">A carta fica oculta para os adversarios e pode ser usada uma unica vez entre as oitavas e a final.</p>
        </div>
        <span className="border border-black px-3 py-2 text-xs font-black">{readyCount}/{room.players.length} prontos</span>
      </div>

      {selected ? (
        <div className="mt-5 border border-[var(--success)] bg-[var(--success)] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em]">Carta sorteada</p>
          <p className="mt-2 text-2xl font-black">{selected.name}</p>
          <p className="mt-1 text-sm">{selected.description}</p>
          <button
            type="button"
            disabled={confirmed || !currentPlayer}
            onClick={() => currentPlayer && onChooseCard(currentPlayer.id, selected.id)}
            className="mt-5 border border-white bg-white px-5 py-3 text-xs font-black uppercase text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmed ? "Aguardando os demais jogadores" : "Prosseguir ao mata-mata"}
          </button>
        </div>
      ) : <p className="mt-5 text-sm">Preparando sua carta...</p>}
    </div>
  );
}

function CoachCard({ coach, squad, selected, disabled, onChoose }: { coach: RoomCoach; squad: RoomPick[]; selected: boolean; disabled: boolean; onChoose: () => void }) {
  const club =
    clubSeasonData.find((season) => season.id === coach.clubSeasonId) ??
    clubSeasonData.find((season) => sameText(season.clubName, coach.clubName) && season.season === coach.season);
  const badgeClub =
    club ?? {
      shortName: initials(coach.clubName),
      clubName: coach.clubName,
      primaryColor: "#071832",
      secondaryColor: "#22d3ee",
      genericBadgeShape: "shield" as const
    };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onChoose}
      className={cn(
        "border p-4 text-left transition",
        selected ? "border-[var(--success)] bg-[var(--success)]/10" : disabled ? "border-black/15 bg-[var(--surface-muted)] opacity-55" : "border-black/20 bg-white hover:border-[var(--success)]"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <GenericBadge club={badgeClub} size={52} />
        <span className="coach-rating-badge grid h-12 min-w-12 shrink-0 place-items-center border border-black bg-black px-3 font-mono text-xl font-black text-white">{coach.rating}</span>
      </div>
      <div className="mt-4 min-w-0">
        <p className="text-2xl font-black leading-tight text-black">{coach.name}</p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{coach.clubName} {shortSeason(coach.season)} - {tacticalStyleLabel(coach.style)}</p>
        <div className="mt-3 flex items-center gap-2">
          <NationalityFlag nationality={coach.nationality} />
          <span className="text-sm font-bold text-black">{coach.nationality}</span>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">{coach.description}</p>
      <p className="coach-benefit-badge mt-3 inline-flex border border-black bg-[var(--success)] px-3 py-2 text-xs font-black uppercase tracking-[0.08em] text-white">
        +2 overall para {countCoachNationalityMatches(squad.map((pick) => pick.nationality), coach.nationality)} jogadores
      </p>
    </button>
  );
}

function CoachProgress({ room }: { room: FriendRoom }) {
  return (
    <div className="rounded-lg border border-white/10 bg-night/55 p-4">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Escolhas dos tecnicos</p>
      <div className="mt-3 grid gap-2">
        {room.players.map((player) => {
          const selected = Boolean(room.selectedCoachByPlayer[player.id]);
          return (
            <div key={player.id} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm">
              <span className="truncate font-black text-white">{player.teamName}</span>
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-black", selected ? "bg-emerald-300 text-night" : "border border-white/15 text-slate-300")}>
                {selected && <Check size={13} />} {selected ? "Pronto" : "Aguardando"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function assignRoomPicksToSlots(slots: ReturnType<typeof getFormationSlots>, picks: RoomPick[]) {
  const assigned: Record<string, RoomPick | undefined> = {};
  const available = picks.filter((pick) => {
    if (!pick.slotId || !slots.some((slot) => slot.id === pick.slotId)) return true;
    assigned[pick.slotId] = pick;
    return false;
  });
  for (const slot of slots) {
    if (assigned[slot.id]) continue;
    const index = findBestRoomPickIndex(available, slot.position);
    if (index < 0) continue;
    assigned[slot.id] = available.splice(index, 1)[0];
  }
  return assigned;
}

function findBestRoomPickIndex(picks: RoomPick[], position: string) {
  const exact = picks.findIndex((pick) => pick.position === position);
  if (exact >= 0) return exact;
  const sameLine = picks.findIndex((pick) => positionGroup(pick.position) === positionGroup(position));
  return sameLine >= 0 ? sameLine : picks.length ? 0 : -1;
}

function isRoomPickEligible(player: RoomPlayer | undefined, pick: RoomPick) {
  if (!player || player.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId)) return false;
  return getFormationSlots(player.formation, player.tacticalStyle).some((slot) => !player.squad.some((item) => item.slotId === slot.id) && roomPickFit(pick, slot.position).allowed);
}

function roomPickFit(pick: RoomPick, position: Position) {
  const sourcePlayer =
    playerData.find((player) => player.id === pick.id) ??
    playerData.find((player) => player.canonicalPlayerId === pick.canonicalPlayerId && player.clubSeasonId === pick.clubSeasonId) ??
    playerData.find((player) => player.canonicalPlayerId === pick.canonicalPlayerId);
  if (sourcePlayer) return calculatePositionFit(sourcePlayer, position);
  const allowed = pick.position === position || positionGroup(pick.position) === positionGroup(position);
  return {
    allowed,
    effectiveRating: allowed ? pick.overall : 0
  };
}

function roomPositionOrder(position: Position) {
  const order: Position[] = ["GK", "RB", "RWB", "CB", "LB", "LWB", "DM", "CM", "MEI", "RM", "LM", "RW", "LW", "CF", "ST"];
  return order.indexOf(position);
}

function shuffleReviewOptions<T>(items: T[], seed: string) {
  const shuffled = [...items];
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  for (let index = shuffled.length - 1; index > 0; index--) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const swapIndex = (state >>> 0) % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

function positionGroup(position: string) {
  if (position === "GK") return "gk";
  if (["RB", "RWB", "CB", "LB", "LWB"].includes(position)) return "def";
  if (["DM", "CM", "MEI", "RM", "LM"].includes(position)) return "mid";
  return "atk";
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return name;
  return parts.at(-1) ?? name;
}

function RoomCardControl({
  room,
  player,
  match,
  onActivate
}: {
  room: FriendRoom;
  player: RoomPlayer;
  match: RoomMatch;
  onActivate: (playerId: string, input?: ActivateRoomCardInput) => void;
}) {
  const cardId = room.selectedCardByPlayer[player.id];
  const card = roomSecretCard(cardId);
  const activation = room.cardActivationByPlayer[player.id];
  const [open, setOpen] = useState(false);
  const [targetPickId, setTargetPickId] = useState("");
  const [specialPickId, setSpecialPickId] = useState("");
  const needsTarget = cardId === "inspired-captain" || cardId === "historic-swap" || cardId === "loaned-star" || cardId === "luxury-bench";
  const specialOptions = cardId && targetPickId
    ? roomCardSpecialOptions(room, player.id, cardId, targetPickId)
    : [];
  const needsSpecial = cardId === "historic-swap" || cardId === "loaned-star" || cardId === "luxury-bench";
  const canActivate = Boolean(card && !activation && (!needsTarget || targetPickId) && (!needsSpecial || specialPickId));

  useEffect(() => {
    setOpen(false);
    setTargetPickId("");
    setSpecialPickId("");
  }, [match.id]);

  if (!card) return null;
  if (activation) {
    return (
      <div className="mt-3 flex items-center justify-between gap-3 border border-[var(--success)] bg-[var(--success)] px-4 py-3 text-white">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/75">Carta revelada</p>
          <p className="truncate font-black">{card.name}</p>
        </div>
        <Check size={18} className="shrink-0" />
      </div>
    );
  }

  return (
    <div className="mt-3 border border-black bg-[var(--surface-muted)] text-black">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-[var(--success)]">Sua carta secreta</span>
          <span className="mt-1 block truncate font-black">{card.name}</span>
        </span>
        <span className="shrink-0 border border-black bg-white px-3 py-2 text-xs font-black">{open ? "Fechar" : "Usar"}</span>
      </button>

      {open && (
        <div className="border-t border-black p-4">
          <p className="text-sm leading-6 text-[var(--muted)]">{card.description}</p>
          {cardId === "stored-penalty" && (
            <p className="mt-2 text-xs font-bold">A cobranca acontece aos 68 minutos e ainda pode ser defendida.</p>
          )}
          {cardId === "luxury-bench" && (
            <p className="mt-2 text-xs font-bold">A substituicao entra na linha do tempo no intervalo.</p>
          )}

          {needsTarget && (
            <div className="mt-4">
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" htmlFor={`card-target-${player.id}`}>Jogador do seu time</label>
              <select
                id={`card-target-${player.id}`}
                className={`${inputClass} mt-2`}
                value={targetPickId}
                onChange={(event) => {
                  setTargetPickId(event.target.value);
                  setSpecialPickId("");
                }}
              >
                <option value="">Selecione</option>
                {player.squad.map((pick) => (
                  <option key={pick.id} value={pick.id}>{pick.name} - {positionLabel(pick.slotPosition ?? pick.position)} - {pick.effectiveRating ?? pick.overall}</option>
                ))}
              </select>
            </div>
          )}

          {needsSpecial && targetPickId && (
            <div className="mt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]">
                {cardId === "historic-swap" ? "Jogador do adversario" : "Escolha entre os sorteados"}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {specialOptions.map((pick) => (
                  <button
                    key={pick.id}
                    type="button"
                    onClick={() => setSpecialPickId(pick.id)}
                    className={cn(
                      "border p-3 text-left",
                      specialPickId === pick.id ? "border-black bg-[var(--success)] text-white" : "border-black/20 bg-white text-black"
                    )}
                  >
                    <span className="block truncate font-black">{pick.name}</span>
                    <span className="mt-1 block text-xs">{positionLabel(pick.slotPosition ?? pick.position)} - {pick.effectiveRating ?? pick.overall}</span>
                  </button>
                ))}
              </div>
              {specialOptions.length === 0 && <p className="mt-2 text-sm text-[var(--muted)]">Nenhum jogador compativel encontrado.</p>}
            </div>
          )}

          <Button
            className="mt-4 w-full"
            disabled={!canActivate}
            onClick={() => onActivate(player.id, {
              targetPickId: targetPickId || undefined,
              opponentPickId: cardId === "historic-swap" ? specialPickId || undefined : undefined,
              specialPickId: cardId === "loaned-star" || cardId === "luxury-bench" ? specialPickId || undefined : undefined
            })}
          >
            Ativar carta nesta partida
          </Button>
          <p className="mt-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Uso unico ate a final</p>
        </div>
      )}
    </div>
  );
}

function RoomBracket({
  room,
  currentPlayer,
  isHost,
  onActivateCard,
  onPlayMatch,
  onProgressRound,
  onResetLobby
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  isHost: boolean;
  onActivateCard: (playerId: string, input?: ActivateRoomCardInput) => void;
  onPlayMatch: (playerId: string) => void;
  onProgressRound: () => void;
  onResetLobby: () => void;
}) {
  const playerMatch = currentPlayer ? currentPlayerRoomMatch(room, currentPlayer.id) : undefined;
  const completedPlayerMatches = currentPlayer
    ? room.bracket.filter(
        (match) =>
          match.status === "done" &&
          (match.homePlayerId === currentPlayer.id || match.awayPlayerId === currentPlayer.id)
      )
    : [];
  const eliminationMatch = currentPlayer
    ? completedPlayerMatches.find((match) => {
        const playerWasHome = match.homePlayerId === currentPlayer.id;
        const playerWon = playerWasHome ? match.winnerName === match.homeName : match.winnerName === match.awayName;
        return !playerWon;
      })
    : undefined;
  const playerEliminated = Boolean(eliminationMatch);
  const pendingHumans = hasPendingHumanRoomMatches(room);
  const currentPhase = phases[room.bracketRound]?.label ?? "Mata-mata";
  const canProgressRound = room.status === "bracket" && !playerMatch && !pendingHumans;
  const [presentation, setPresentation] = useState<{ playerId: string; match: RoomMatch; events: RoomTimelineEvent[]; visible: number; committed?: boolean }>();
  const [matchSpeed, setMatchSpeed] = useState<"normal" | "rapida" | "ultra">("normal");
  const [interactionChoices, setInteractionChoices] = useState<Record<string, string>>({});
  const [showResultOverlay, setShowResultOverlay] = useState(true);
  const onPlayMatchRef = useRef(onPlayMatch);
  const onProgressRoundRef = useRef(onProgressRound);
  const timelineRef = useRef<HTMLDivElement>(null);
  const visibleEvents = presentation?.events.slice(0, presentation.visible) ?? [];
  const lastVisibleEvent = visibleEvents.at(-1);
  const interactionPending = Boolean(
    lastVisibleEvent &&
      !interactionChoices[lastVisibleEvent.id] &&
      (lastVisibleEvent.kind === "decision" || lastVisibleEvent.kind === "penalty")
  );
  const scoreEvent = interactionPending && lastVisibleEvent?.kind === "penalty" ? visibleEvents.at(-2) : lastVisibleEvent;
  const presentationHomeGoals = scoreEvent?.homeGoals ?? 0;
  const presentationAwayGoals = scoreEvent?.awayGoals ?? 0;
  const currentIsHome = presentation?.match.homePlayerId === currentPlayer?.id;
  const decisionScore = currentIsHome
    ? { userGoals: presentationHomeGoals, opponentGoals: presentationAwayGoals }
    : { userGoals: presentationAwayGoals, opponentGoals: presentationHomeGoals };
  const presentationMinute = presentation ? Math.max(1, lastVisibleEvent?.minute ?? 1) : 1;
  const presentationProgress = Math.min(100, Math.round((presentationMinute / 90) * 100));
  const nextPlayerMatchReady = Boolean(
    presentation?.committed &&
      playerMatch &&
      playerMatch.id !== presentation.match.id
  );

  useEffect(() => {
    if (room.status === "finished" || eliminationMatch?.id) setShowResultOverlay(true);
  }, [eliminationMatch?.id, room.champion, room.status]);

  useEffect(() => {
    if (!presentation) return;
    if (!presentation.committed && (!playerMatch || playerMatch.id !== presentation.match.id)) {
      setPresentation(undefined);
    }
  }, [playerMatch, presentation]);

  useEffect(() => {
    onPlayMatchRef.current = onPlayMatch;
  }, [onPlayMatch]);

  useEffect(() => {
    onProgressRoundRef.current = onProgressRound;
  }, [onProgressRound]);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const frame = window.requestAnimationFrame(() => {
      timeline.scrollTo({ top: timeline.scrollHeight, behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interactionChoices, visibleEvents.length]);

  useEffect(() => {
    if (!presentation || interactionPending) return;
    if (presentation.committed) return;
    if (presentation.visible < presentation.events.length) {
      const timer = window.setTimeout(() => {
        setPresentation((current) => (current ? { ...current, visible: current.visible + 1 } : current));
      }, matchSpeed === "normal" ? 1200 : matchSpeed === "rapida" ? 750 : 420);
      return () => window.clearTimeout(timer);
    }
    const finish = window.setTimeout(() => {
      setPresentation((current) => (current ? { ...current, committed: true } : current));
      onPlayMatchRef.current(presentation.playerId);
    }, 900);
    return () => window.clearTimeout(finish);
  }, [interactionPending, matchSpeed, presentation]);

  useEffect(() => {
    if (!presentation?.committed || room.status !== "bracket") return;

    // A sincronizacao pode perder uma gravacao concorrente. Reenviar o mesmo
    // resultado e seguro porque a simulacao usa uma seed deterministica.
    if (playerMatch?.id === presentation.match.id) {
      const retry = window.setTimeout(() => onPlayMatchRef.current(presentation.playerId), 1500);
      return () => window.clearTimeout(retry);
    }

    if (!pendingHumans) {
      const advance = window.setTimeout(() => {
        setPresentation(undefined);
        onProgressRoundRef.current();
      }, 900);
      return () => window.clearTimeout(advance);
    }
  }, [pendingHumans, playerMatch?.id, presentation, room.status]);

  function startMatchPresentation() {
    if (!currentPlayer || !playerMatch || presentation) return;
    const preview = previewPlayerRoomMatch(room, currentPlayer.id);
    if (!preview) {
      onPlayMatch(currentPlayer.id);
      return;
    }
    setInteractionChoices({});
    setPresentation({ playerId: currentPlayer.id, match: preview, events: buildRoomMatchTimeline(room, preview, currentPlayer.id), visible: 1 });
  }

  function progressRoundFromScore() {
    setPresentation(undefined);
    onProgressRound();
  }

  return (
    <div className="mt-5">
      {(room.status === "finished" || playerEliminated) && currentPlayer && showResultOverlay && (
        <RoomResultOverlay room={room} player={currentPlayer} isHost={isHost} onClose={() => setShowResultOverlay(false)} onResetLobby={onResetLobby} />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Chaveamento</p>
          <h3 className="text-2xl font-black">Mata-mata da sala</h3>
        </div>
        {room.champion && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="border border-black bg-[var(--accent)] px-4 py-3 text-black">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">Campeao</p>
              <p className="font-black text-black">{room.champion}</p>
            </div>
            {isHost && <Button onClick={onResetLobby}>Voltar ao lobby</Button>}
          </div>
        )}
      </div>
      {room.status === "bracket" && (
        <div className="mt-4 border border-black bg-white p-4 text-black">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Rodada atual: {currentPhase}</p>
          {!presentation && playerMatch && currentPlayer && (
            <RoomCardControl room={room} player={currentPlayer} match={playerMatch} onActivate={onActivateCard} />
          )}
          {presentation ? (
            <div className="mt-3 overflow-hidden border border-black/20 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-black text-black">{presentation.match.homeName} x {presentation.match.awayName}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Simulando partida</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{tacticalRoomSummary(presentation.match)}</p>
                </div>
                <div className="grid gap-2 sm:justify-items-end">
                  <div className="flex flex-wrap items-center gap-3">
                    <RoomSpeedControl speed={matchSpeed} onSpeedChange={setMatchSpeed} />
                    <span className="border border-black bg-[var(--accent)] px-3 py-2 font-mono text-sm font-black text-black">{presentationMinute}&apos;</span>
                    <span className="font-mono text-3xl font-black text-[var(--warning)]">{presentationHomeGoals} - {presentationAwayGoals}</span>
                  </div>
                  {nextPlayerMatchReady && (
                    <Button className="w-full sm:w-auto" onClick={() => setPresentation(undefined)}>
                      Prosseguir para a proxima partida
                    </Button>
                  )}
                  {presentation.committed && canProgressRound && !nextPlayerMatchReady && (
                    <Button className="w-full sm:w-auto" onClick={progressRoundFromScore}>Proxima partida</Button>
                  )}
                  {presentation.committed && pendingHumans && !nextPlayerMatchReady && (
                    <span className="text-xs font-bold text-[var(--muted)]">Aguardando os outros jogadores</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-white/10">
                <div className="h-full rounded-r-full bg-gradient-to-r from-electric to-gold transition-all" style={{ width: `${presentationProgress}%` }} />
              </div>
              <div ref={timelineRef} className="grid max-h-[190px] overflow-y-auto p-3 game-scrollbar" aria-live="polite">
                {visibleEvents.map((event, index) => (
                  <div key={`${event.minute}-${index}`} className={cn("grid grid-cols-[3rem_auto_minmax(0,1fr)] items-center gap-3 border-b px-2 py-2.5 text-sm", event.text.startsWith("Gol") || event.kind === "penalty" ? "border-[var(--warning)]/40 bg-[var(--warning)]/10 font-bold" : event.kind === "decision" ? "border-[var(--success)]/30 bg-[color-mix(in_srgb,var(--success)_8%,transparent)]" : "border-black/10")}>
                    <span className="font-mono font-black text-black">{event.minute}&apos;</span>
                    <span className={cn("h-2.5 w-2.5 rounded-full", event.text.startsWith("Gol") || event.kind === "penalty" ? "bg-[var(--warning)]" : event.kind === "decision" ? "bg-[var(--success)]" : "bg-black/20")} aria-hidden />
                    <span className="min-w-0 break-words font-semibold">
                      {interactionChoices[event.id]
                        ? event.kind === "penalty"
                          ? `Penalti convertido do ${event.teamName}: ${interactionChoices[event.id]}`
                          : event.kind === "decision"
                            ? `Ajuste definido: ${interactionChoices[event.id]}`
                            : event.text
                        : event.text}
                    </span>
                  </div>
                ))}
              </div>
              {interactionPending && lastVisibleEvent?.kind === "decision" && lastVisibleEvent.decisionType && (
                <div className="border-t border-black/10 p-3">
                  <MatchDecisionPrompt
                    type={lastVisibleEvent.decisionType}
                    currentFormation={currentPlayer?.formation ?? "4-3-3"}
                    score={decisionScore}
                    onChoose={(value, label) => {
                      const outcome = resolveMatchDecision({ seed: `${room.id}-${presentation.match.id}-${lastVisibleEvent.id}`, type: lastVisibleEvent.decisionType!, value, userGoals: decisionScore.userGoals, opponentGoals: decisionScore.opponentGoals, formation: currentPlayer?.formation ?? "4-3-3" });
                      setInteractionChoices((choices) => ({ ...choices, [lastVisibleEvent.id]: `${label} - ${outcome.detail}` }));
                    }}
                  />
                </div>
              )}
              {interactionPending && lastVisibleEvent?.kind === "penalty" && (
                <div className="border-t border-black/10 p-3">
                  <PenaltyTakerPrompt
                    candidates={(() => {
                      const candidates = (currentPlayer?.squad ?? [])
                        .filter((pick) => pick.position !== "GK" && pick.slotPosition !== "GK")
                        .sort((a, b) => (b.effectiveRating ?? b.overall) - (a.effectiveRating ?? a.overall))
                        .slice(0, 5)
                        .map((pick) => ({ id: pick.id, name: pick.name, rating: pick.effectiveRating ?? pick.overall }));
                      return candidates.length ? candidates : [{ id: "fallback", name: "Batedor", rating: 80 }];
                    })()}
                    onChoose={(name) => setInteractionChoices((choices) => ({ ...choices, [lastVisibleEvent.id]: name }))}
                  />
                </div>
              )}
            </div>
          ) : playerMatch ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-black">
                  {playerMatch.homeName} x {playerMatch.awayName}
                </p>
                <p className="mt-1 text-sm text-[var(--muted)]">A partida vai rodar minuto a minuto. Quem terminar antes aguarda os outros jogadores da rodada.</p>
              </div>
              <Button className="px-6" onClick={startMatchPresentation}>
                <Play size={18} /> Iniciar partida
              </Button>
            </div>
          ) : pendingHumans ? (
            <p className="mt-3 text-sm font-semibold text-[var(--muted)]">Sua partida desta rodada ja terminou ou voce foi eliminado. Acompanhe o chaveamento enquanto os outros jogadores terminam.</p>
          ) : canProgressRound ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--muted)]">Todos terminaram. Prossiga para resolver os jogos restantes e abrir a proxima rodada.</p>
              <Button className="px-6" onClick={onProgressRound}>Prosseguir rodada</Button>
            </div>
          ) : null}
        </div>
      )}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[900px] grid-cols-[1.1fr_.95fr_.85fr_.72fr] gap-3">
          {phases.map((phase) => (
            <div key={phase.name} className="border border-black/20 bg-white p-3">
               <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-black">{phase.label}</p>
              <div className="grid min-h-[500px]" style={{ gridTemplateRows: "repeat(16, minmax(0, 1fr))" }}>
                {room.bracket.filter((match) => match.phase === phase.name).map((match, index) => (
                  <div key={match.id} style={{ gridRow: `${bracketRowStart(phase.name, index)} / span 2` }}>
                    <RoomBracketMatch match={match} room={room} />
                  </div>
                ))}
                {room.bracket.filter((match) => match.phase === phase.name).length === 0 && (
                  <div style={{ gridRow: `${bracketRowStart(phase.name, 0)} / span 2` }}>
                    <article className="border border-dashed border-black/25 bg-[var(--surface-muted)] px-3 py-2 text-sm font-black text-[var(--muted)]">A definir</article>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      {room.status === "finished" && currentPlayer && <RoomFinalSquadCard room={room} player={currentPlayer} />}
    </div>
  );
}

function RoomBracketMatch({ match, room }: { match: RoomMatch; room: FriendRoom }) {
  const done = match.status === "done";
  const homeEmblemId = room.players.find((player) => player.id === match.homePlayerId || sameText(player.teamName, match.homeName))?.emblemId;
  const awayEmblemId = room.players.find((player) => player.id === match.awayPlayerId || sameText(player.teamName, match.awayName))?.emblemId;
  return (
    <article className={cn("relative border px-3 py-2 text-sm", done ? "border-black/20 bg-white" : "border-[var(--warning)]/45 bg-[var(--warning)]/10")}>
      <BracketTeam name={match.homeName} emblemId={homeEmblemId} goals={match.homeGoals} winner={done && match.winnerName === match.homeName} />
      <BracketTeam name={match.awayName} emblemId={awayEmblemId} goals={match.awayGoals} winner={done && match.winnerName === match.awayName} last />
      {match.phase !== "Final" && (
        <span
          className="bracket-connector absolute -right-3 top-1/2 h-px w-3 bg-[var(--success)]"
          data-live={done ? "false" : "true"}
          aria-hidden
        />
      )}
    </article>
  );
}

function RoomFinalSquadCard({ room, player }: { room: FriendRoom; player: RoomPlayer }) {
  const playerMatches = room.bracket.filter(
    (match) => match.status === "done" && (match.homePlayerId === player.id || match.awayPlayerId === player.id || sameText(match.homeName, player.teamName) || sameText(match.awayName, player.teamName))
  );
  const lastMatch = playerMatches.at(-1);
  const isHome = lastMatch ? lastMatch.homePlayerId === player.id || sameText(lastMatch.homeName, player.teamName) : false;
  const goalsFor = lastMatch ? (isHome ? lastMatch.homeGoals : lastMatch.awayGoals) : undefined;
  const goalsAgainst = lastMatch ? (isHome ? lastMatch.awayGoals : lastMatch.homeGoals) : undefined;
  const resultLabel = sameText(room.champion ?? "", player.teamName) ? "Campeao da sala" : "Campanha encerrada";

  return (
    <section className="mt-5 border border-black bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/20 pb-4">
        <div>
          <p className="editorial-kicker">Card final do elenco</p>
          <h3 className="mt-2 font-display text-3xl font-black uppercase">{player.teamName}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {resultLabel}{lastMatch && typeof goalsFor === "number" && typeof goalsAgainst === "number" ? ` · ultimo jogo ${goalsFor}-${goalsAgainst}` : ""}
          </p>
        </div>
        <div className="grid h-12 w-12 place-items-center border border-black bg-[var(--success)] text-white">
          <Trophy size={24} aria-hidden />
        </div>
      </div>
      <div className="mt-4 grid gap-px border border-black/20 bg-black/20 sm:grid-cols-2 lg:grid-cols-3">
        {player.squad.map((pick) => (
          <article key={`${pick.slotId}-${pick.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{pick.name}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{pick.clubName} {pick.season}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-black text-[var(--success)]">{pick.effectiveRating ?? pick.overall}</p>
              <p className="text-[9px] font-black uppercase">{pick.slotLabel ?? positionLabel(pick.slotPosition ?? pick.position)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildRoomTournamentSummary(room: FriendRoom) {
  const matches = room.bracket.filter((match) => match.status === "done" && typeof match.homeGoals === "number" && typeof match.awayGoals === "number");
  const teamStats = new Map<string, { goalsFor: number; goalsAgainst: number; wins: number; losses: number; matches: number }>();
  for (const match of matches) {
    const home = teamStats.get(match.homeName) ?? { goalsFor: 0, goalsAgainst: 0, wins: 0, losses: 0, matches: 0 };
    const away = teamStats.get(match.awayName) ?? { goalsFor: 0, goalsAgainst: 0, wins: 0, losses: 0, matches: 0 };
    home.goalsFor += match.homeGoals ?? 0;
    home.goalsAgainst += match.awayGoals ?? 0;
    home.matches += 1;
    away.goalsFor += match.awayGoals ?? 0;
    away.goalsAgainst += match.homeGoals ?? 0;
    away.matches += 1;
    if ((match.homeGoals ?? 0) > (match.awayGoals ?? 0)) { home.wins += 1; away.losses += 1; }
    else { away.wins += 1; home.losses += 1; }
    teamStats.set(match.homeName, home);
    teamStats.set(match.awayName, away);
  }
  const biggestWin = matches.slice().sort((a, b) => Math.abs((b.homeGoals ?? 0) - (b.awayGoals ?? 0)) - Math.abs((a.homeGoals ?? 0) - (a.awayGoals ?? 0)))[0];
  const closestMatch = matches.slice().sort((a, b) => Math.abs((a.homeGoals ?? 0) - (a.awayGoals ?? 0)) - Math.abs((b.homeGoals ?? 0) - (b.awayGoals ?? 0)) || ((b.homeGoals ?? 0) + (b.awayGoals ?? 0)) - ((a.homeGoals ?? 0) + (a.awayGoals ?? 0)))[0];
  const bestAttack = Array.from(teamStats.entries()).sort((a, b) => b[1].goalsFor - a[1].goalsFor)[0];
  const bestDefense = Array.from(teamStats.entries()).filter(([, stats]) => stats.matches > 0).sort((a, b) => a[1].goalsAgainst - b[1].goalsAgainst || b[1].matches - a[1].matches)[0];
  const bestPlayer = room.players.flatMap((participant) => participant.squad.map((pick) => ({ ...pick, teamName: participant.teamName }))).sort((a, b) => (b.effectiveRating ?? b.overall) - (a.effectiveRating ?? a.overall))[0];
  const squads = room.players.filter((participant) => !participant.isBot).map((participant) => {
    const stats = teamStats.get(participant.teamName) ?? { goalsFor: 0, goalsAgainst: 0, wins: 0, losses: 0, matches: 0 };
    const rating = participant.squad.length ? Math.round((participant.squad.reduce((sum, pick) => sum + (pick.effectiveRating ?? pick.overall), 0) / participant.squad.length) * 10) / 10 : 0;
    return { participant, stats, rating };
  }).sort((a, b) => b.stats.wins - a.stats.wins || b.rating - a.rating);
  return { biggestWin, closestMatch, bestAttack, bestDefense, bestPlayer, squads };
}

function RoomResultOverlay({
  room,
  player,
  isHost,
  onClose,
  onResetLobby
}: {
  room: FriendRoom;
  player: RoomPlayer;
  isHost: boolean;
  onClose: () => void;
  onResetLobby: () => void;
}) {
  const tournament = buildRoomTournamentSummary(room);
  const matches = room.bracket.filter(
    (match) => match.status === "done" && (match.homePlayerId === player.id || match.awayPlayerId === player.id || sameText(match.homeName, player.teamName) || sameText(match.awayName, player.teamName))
  );
  const totals = matches.reduce(
    (acc, match) => {
      const home = match.homePlayerId === player.id || sameText(match.homeName, player.teamName);
      const goalsFor = (home ? match.homeGoals : match.awayGoals) ?? 0;
      const goalsAgainst = (home ? match.awayGoals : match.homeGoals) ?? 0;
      acc.goalsFor += goalsFor;
      acc.goalsAgainst += goalsAgainst;
      if (goalsFor > goalsAgainst) acc.wins += 1;
      return acc;
    },
    { wins: 0, goalsFor: 0, goalsAgainst: 0 }
  );
  const finalMatch = room.bracket.find((match) => match.phase === "Final" && match.status === "done");
  const winnerPlayerId = finalMatch
    ? finalMatch.winnerName === finalMatch.homeName
      ? finalMatch.homePlayerId
      : finalMatch.awayPlayerId
    : undefined;
  const champion = winnerPlayerId
    ? winnerPlayerId === player.id
    : room.status === "finished" && sameText(room.champion ?? "", player.teamName);
  const resultDescription = champion
    ? "Seu time venceu a sala e a taca foi registrada na galeria."
    : room.status === "finished"
      ? `Eliminado. O campeao da sala foi ${room.champion ?? "definido no mata-mata"}.`
      : "Seu time foi eliminado. Continue acompanhando o chaveamento ate a definicao do campeao.";

  return (
    <div className="room-result-backdrop fixed inset-0 z-[100] grid overflow-y-auto bg-black/75 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Resultado final da sala">
      {champion && <ChampionSound eventId={`online-${room.id}-${finalMatch?.id ?? room.champion ?? "final"}`} />}
      {!champion && <EliminatedSound eventId={`online-${room.id}-${matches.at(-1)?.id ?? player.id}`} />}
      <section className="room-result-panel m-auto w-full max-w-5xl border border-black bg-[var(--background)] text-black shadow-2xl">
        <div className="grid items-center border-b border-black md:grid-cols-[1.2fr_.8fr]">
          <div className="p-6 sm:p-9">
            <p className="editorial-kicker">Resultado do mata-mata</p>
            <h2 className="mt-3 font-display text-5xl font-black uppercase leading-[.88] sm:text-7xl">
              {champion ? "Campeao" : "Campanha encerrada"}
            </h2>
            <p className="mt-4 text-2xl font-black">{player.teamName}</p>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
              {resultDescription}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-px border border-black bg-black sm:grid-cols-4">
              <ResultMetric value={matches.length} label="Jogos" />
              <ResultMetric value={totals.wins} label="Vitorias" />
              <ResultMetric value={totals.goalsFor} label="Gols pro" />
              <ResultMetric value={totals.goalsAgainst} label="Gols sofridos" />
            </div>
          </div>
          <div className={cn("grid min-h-64 place-items-center self-stretch p-6", champion ? "bg-[var(--success)]" : "bg-[var(--surface-muted)]")}>
            <Image
              src="/images/liga-dos-craques-trophy.png"
              alt="Taca da Liga dos Craques"
              width={290}
              height={360}
              className={cn("h-64 w-auto object-contain drop-shadow-2xl", !champion && "opacity-80")}
              priority
            />
          </div>
        </div>
        <div className="p-5 sm:p-7">
          {room.status === "finished" && (
            <div className="mb-6">
              <h3 className="font-display text-2xl font-black uppercase">Resumo da disputa</h3>
              <div className="mt-3 grid gap-px border border-black bg-black sm:grid-cols-2 lg:grid-cols-4">
                <TournamentMetric label="Destaque" value={tournament.bestPlayer ? `${tournament.bestPlayer.name} (${tournament.bestPlayer.effectiveRating ?? tournament.bestPlayer.overall})` : "A definir"} />
                <TournamentMetric label="Maior goleada" value={tournament.biggestWin ? `${tournament.biggestWin.homeName} ${tournament.biggestWin.homeGoals}-${tournament.biggestWin.awayGoals} ${tournament.biggestWin.awayName}` : "A definir"} />
                <TournamentMetric label="Melhor ataque" value={tournament.bestAttack ? `${tournament.bestAttack[0]} · ${tournament.bestAttack[1].goalsFor} gols` : "A definir"} />
                <TournamentMetric label="Melhor defesa" value={tournament.bestDefense ? `${tournament.bestDefense[0]} · ${tournament.bestDefense[1].goalsAgainst} sofridos` : "A definir"} />
              </div>
              {tournament.closestMatch && <p className="border-x border-b border-black bg-[var(--surface-muted)] px-3 py-2 text-xs font-bold">Confronto mais equilibrado: {tournament.closestMatch.homeName} {tournament.closestMatch.homeGoals}-{tournament.closestMatch.awayGoals} {tournament.closestMatch.awayName}</p>}
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tournament.squads.map(({ participant, stats, rating }) => (
                  <article key={participant.id} className="border border-black/20 bg-white p-3">
                    <div className="flex items-center justify-between gap-2"><strong className="truncate">{participant.teamName}</strong><span className="font-mono font-black text-[var(--success)]">{rating}</span></div>
                    <p className="mt-1 text-[10px] font-black uppercase text-[var(--muted)]">{participant.formation} · V {stats.wins} · D {stats.losses} · GP {stats.goalsFor} · GC {stats.goalsAgainst}</p>
                  </article>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl font-black uppercase">Seu onze final</h3>
            <span className="text-xs font-black uppercase tracking-[0.16em] text-[var(--muted)]">{player.formation} · {tacticalStyleLabel(player.tacticalStyle)}</span>
          </div>
          <div className="mt-3 grid gap-px border border-black/20 bg-black/20 sm:grid-cols-2 lg:grid-cols-4">
            {player.squad.map((pick) => (
              <div key={`${pick.slotId}-${pick.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{pick.name}</p>
                  <p className="text-[9px] font-black uppercase text-[var(--muted)]">{pick.slotLabel ?? positionLabel(pick.slotPosition ?? pick.position)}</p>
                </div>
                <strong className="font-mono text-lg text-[var(--success)]">{pick.effectiveRating ?? pick.overall}</strong>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Ver chaveamento</Button>
            {isHost && room.status === "finished" && <Button onClick={onResetLobby}>Voltar ao lobby</Button>}
          </div>
        </div>
      </section>
    </div>
  );
}

function TournamentMetric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 bg-white p-3"><p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--success)]">{label}</p><p className="mt-1 text-sm font-black leading-tight text-black">{value}</p></div>;
}

function ResultMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white p-3">
      <p className="font-display text-3xl font-black text-[var(--success)]">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
    </div>
  );
}

function RoomSpeedControl({ speed, onSpeedChange }: { speed: "normal" | "rapida" | "ultra"; onSpeedChange: (speed: "normal" | "rapida" | "ultra") => void }) {
  return (
    <div className="flex border border-black/20 bg-[var(--surface-muted)] p-1">
      {(["normal", "rapida", "ultra"] as const).map((item) => (
        <button
          key={item}
          type="button"
          className={cn(
            "rounded-sm px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] transition",
            speed === item ? "bg-[var(--success)] text-white" : "text-black hover:bg-black/5"
          )}
          onClick={() => onSpeedChange(item)}
        >
          {item === "normal" ? "1x" : item === "rapida" ? "2x" : "3x"}
        </button>
      ))}
    </div>
  );
}

function BracketTeam({ name, emblemId, goals, winner, last = false }: { name: string; emblemId?: string; goals?: number; winner: boolean; last?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2", !last && "border-b border-black/10 pb-1.5", last && "pt-1.5", winner ? "text-black" : "text-[var(--muted)]")}>
      <TeamNameWithCrest showCrest={false} name={name} emblemId={emblemId} size="sm" textClassName="text-[11px] font-black" showUnknown allowWrap />
      <span className="text-right font-mono font-black text-gold">{typeof goals === "number" ? goals : "-"}</span>
    </div>
  );
}

function buildRoomMatchTimeline(room: FriendRoom, match: RoomMatch, currentPlayerId: string): RoomTimelineEvent[] {
  const currentIsHome = match.homePlayerId === currentPlayerId;
  const regularHomeGoals = Math.max(0, (match.homeGoals ?? 0) - (match.homeBonusGoals ?? 0));
  const regularAwayGoals = Math.max(0, (match.awayGoals ?? 0) - (match.awayBonusGoals ?? 0));
  const currentGoals = currentIsHome ? regularHomeGoals : regularAwayGoals;
  const opponentGoals = currentIsHome ? regularAwayGoals : regularHomeGoals;
  const decisions = matchDecisionMoments(`${room.id}-${match.id}`, currentGoals, opponentGoals, true);
  const eventSeed = stableRoomTimelineNumber(`${room.id}-${match.id}-events`);
  const flavorPool = [
    { minute: 12, text: "Chance perdida" },
    { minute: 24, text: "Defesa do goleiro" },
    { minute: 36, text: "Bola na trave" },
    { minute: 58, text: "Substituicao tatica" },
    { minute: 66, text: "Cartao amarelo" },
    { minute: 77, text: "Defesa do goleiro" }
  ];
  const flavorCount = 2 + (eventSeed % 3);
  const flavorEvents = Array.from({ length: flavorCount }, (_, index) => {
    const source = flavorPool[(eventSeed + index * 3) % flavorPool.length]!;
    return { id: `flavor-${index}`, minute: Math.min(88, source.minute + (eventSeed % 5)), teamName: "", text: source.text };
  });
  if (eventSeed % 11 === 0) flavorEvents.push({ id: "injury", minute: 48 + (eventSeed % 21), teamName: "", text: "Lesao obriga uma mudanca" });
  if (eventSeed % 17 === 0) flavorEvents.push({ id: "red-card", minute: 55 + (eventSeed % 24), teamName: "", text: "Expulsao apos revisao do lance" });
  if (Math.abs(currentGoals - opponentGoals) <= 1 && eventSeed % 3 === 0) flavorEvents.push({ id: "late-pressure", minute: 84, teamName: "", text: "Pressao final" });
  if (eventSeed % 2 === 0) flavorEvents.push({ id: "stoppage", minute: 90, teamName: "", text: `${3 + (eventSeed % 5)} minutos de acrescimos` });
  const timelineItems: Array<{
    id: string;
    minute: number;
    teamName: string;
    text: string;
    side?: "home" | "away";
    kind?: RoomTimelineEvent["kind"];
    decisionType?: MatchDecisionType;
  }> = [
    { id: "kickoff", minute: 1, teamName: "", text: "Bola rolando" },
    { id: "halftime", minute: 45, teamName: "", text: "Intervalo" },
    ...flavorEvents,
    ...(match.cardEvents ?? []).map((event) => ({
      id: event.id,
      minute: event.minute,
      teamName: event.side === "home" ? match.homeName : event.side === "away" ? match.awayName : "",
      text: event.text,
      side: event.scored ? event.side : undefined,
      kind: "event" as const
    })),
    ...decisions.map((decision) => ({ id: `decision-${decision.minute}-${decision.type}`, minute: decision.minute, teamName: "", text: decision.type === "formation" ? "Ajuste para a reta final" : "Decisao tatica", kind: "decision" as const, decisionType: decision.type }))
  ];
  let homeGoals = 0;
  let awayGoals = 0;
  const currentSide = match.homePlayerId === currentPlayerId ? "home" : match.awayPlayerId === currentPlayerId ? "away" : undefined;
  const penaltySeed = stableRoomTimelineNumber(`${room.id}-${match.id}-penalty`);
  const hasRarePenalty = Boolean(currentSide && penaltySeed % 9 === 0 && (currentSide === "home" ? match.homeGoals : match.awayGoals));
  const goalEvents = [
    ...Array.from({ length: regularHomeGoals }, (_, index) => ({ teamName: match.homeName, order: index, side: "home" as const })),
    ...Array.from({ length: regularAwayGoals }, (_, index) => ({ teamName: match.awayName, order: index, side: "away" as const }))
  ].sort((a, b) => `${a.teamName}-${a.order}`.localeCompare(`${b.teamName}-${b.order}`));
  const goalMinutes = spreadGoalMinutes(goalEvents.length);
  let penaltyAssigned = false;
  goalEvents.forEach((goal, index) => {
    const scorerName = roomGoalScorer(room, match, goal.side, goal.order);
    const isPenalty = hasRarePenalty && !penaltyAssigned && goal.side === currentSide;
    if (isPenalty) penaltyAssigned = true;
    timelineItems.push({
      id: `goal-${goal.side}-${goal.order}`,
      minute: goalMinutes[index] ?? 88,
      teamName: goal.teamName,
      text: isPenalty ? `Penalti para ${goal.teamName}` : `Gol do ${goal.teamName}: ${scorerName}`,
      side: goal.side,
      kind: isPenalty ? "penalty" : "event"
    });
  });
  timelineItems.push({ id: "fulltime", minute: 90, teamName: "", text: "Fim de jogo" });

  return timelineItems
    .sort((a, b) => a.minute - b.minute || roomTimelineOrder(a) - roomTimelineOrder(b))
    .map((event) => {
      if (event.side === "home") homeGoals += 1;
      if (event.side === "away") awayGoals += 1;
      return {
        id: event.id,
        minute: event.minute,
        teamName: event.teamName,
        text: event.text,
        homeGoals,
        awayGoals,
        kind: event.kind,
        decisionType: event.decisionType
      };
    });
}

function roomTimelineOrder(event: { text: string; kind?: RoomTimelineEvent["kind"] }) {
  if (event.text === "Intervalo") return 1;
  if (event.kind === "decision") return 2;
  return goalTextOrder(event.text);
}

function stableRoomTimelineNumber(value: string) {
  return value.split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 104729, 17);
}

function roomGoalScorer(room: FriendRoom, match: RoomMatch, side: "home" | "away", goalIndex: number) {
  const playerId = side === "home" ? match.homePlayerId : match.awayPlayerId;
  const teamName = side === "home" ? match.homeName : match.awayName;
  const humanPlayer = playerId ? room.players.find((player) => player.id === playerId) : undefined;
  const humanPool = humanPlayer?.squad
    .filter((pick) => pick.slotPosition !== "GK" && pick.position !== "GK")
    .sort((a, b) => scorerWeight(b.slotPosition ?? b.position) - scorerWeight(a.slotPosition ?? a.position) || (b.effectiveRating ?? b.overall) - (a.effectiveRating ?? a.overall));
  if (humanPool?.length) return humanPool[goalIndex % humanPool.length]!.name;

  const season = clubSeasonData.find((item) => teamSeasonLabelLocal(item.clubName, item.season) === teamName || sameText(item.clubName, teamName));
  const seasonPool = playerData
    .filter((player) => player.isActive && player.clubSeasonId === season?.id && player.primaryPosition !== "GK")
    .sort((a, b) => scorerWeight(b.primaryPosition) - scorerWeight(a.primaryPosition) || b.overall - a.overall);
  return seasonPool[goalIndex % Math.max(1, seasonPool.length)]?.name ?? "Coletivo";
}

function tacticalRoomSummary(match: RoomMatch) {
  const labels = { ofensivo: "Ofensivo", equilibrado: "Equilibrado", defensivo: "Defensivo", pressao: "Pressao alta" };
  return `${labels[match.homeStyle ?? "equilibrado"]} x ${labels[match.awayStyle ?? "equilibrado"]} · forca ${Math.round(match.homeStrength ?? 80)} x ${Math.round(match.awayStrength ?? 80)}`;
}

function scorerWeight(position: string) {
  if (["ST", "CF", "LW", "RW"].includes(position)) return 4;
  if (["MEI", "LM", "RM", "CM"].includes(position)) return 3;
  if (["DM", "LWB", "RWB", "LB", "RB"].includes(position)) return 2;
  return 1;
}

function teamSeasonLabelLocal(name: string, season: string) {
  const years = season.match(/^(\d{4})\/(\d{2})$/);
  return years ? `${name} ${years[1].slice(2)}/${years[2]}` : name;
}

function spreadGoalMinutes(total: number) {
  const base = [12, 23, 34, 41, 52, 64, 73, 81, 88];
  return Array.from({ length: total }, (_, index) => base[index] ?? Math.min(89, 8 + index * 7));
}

function goalTextOrder(text: string) {
  if (text === "Bola rolando") return 0;
  if (text === "Intervalo") return 2;
  if (text === "Fim de jogo") return 3;
  return 1;
}

function RoomInvite({ room }: { room: FriendRoom }) {
  const [copied, setCopied] = useState(false);
  const code = room.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase();

  async function copyInvite() {
    const invite = `${window.location.origin}/salas?sala=${room.id}`;
    await navigator.clipboard.writeText(invite);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 border border-black bg-[var(--surface-muted)] px-3 py-2 text-black">
      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Convite <strong className="ml-2 font-mono text-sm text-black">{code}</strong></span>
      <button type="button" className="inline-flex items-center gap-2 border border-black bg-[var(--success)] px-3 py-2 text-[10px] font-black uppercase text-white" onClick={() => void copyInvite()}>
        <Copy size={14} /> {copied ? "Link copiado" : "Copiar link"}
      </button>
    </div>
  );
}

function PlayerLobbyList({
  room,
  players,
  now,
  currentPlayerId,
  isHost,
  connectionStatus,
  onKickPlayer
}: {
  room: FriendRoom;
  players: RoomPlayer[];
  now: number;
  currentPlayerId?: string;
  isHost: boolean;
  connectionStatus: RoomConnectionStatus;
  onKickPlayer: (playerId: string) => void;
}) {
  return (
    <div className="mt-4 overflow-hidden border border-black/20 bg-white">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 bg-[var(--surface-muted)] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">
        <span>ID</span>
        <span>Jogador e time</span>
        <span>Status</span>
      </div>
      <div>
        {players.map((player, index) => {
          const lastSeen = room.lastSeenAt?.[player.id] ?? 0;
          const age = lastSeen ? now - lastSeen : Number.POSITIVE_INFINITY;
          const syncing = player.id === currentPlayerId && connectionStatus === "syncing";
          const disconnected = age > 30_000;
          const away = !disconnected && age > 12_000;
          const status = player.ready ? "Pronto" : syncing ? "Sincronizando" : disconnected ? "Desconectado" : away ? "Ausente" : "Aguardando";
          const canKick = isHost && player.id !== currentPlayerId && (away || disconnected);
          return (
          <div key={player.id} className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-t border-black/15 px-3 py-3", disconnected && "bg-black/5 opacity-60")}>
            <span className="font-mono text-[11px] font-black text-[var(--accent-strong)]">
              #{index + 1}
              <span className="mt-0.5 block text-[9px] text-[var(--muted)]">{shortPlayerId(player.id)}</span>
            </span>
            <span className="min-w-0">
              <strong className="block truncate text-sm text-black">{player.userName}</strong>
              <span className="block truncate text-xs text-[var(--muted)]">{player.teamName}</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
                {player.formation} · {tacticalStyleLabel(player.tacticalStyle)}
              </span>
            </span>
            <span className="grid justify-items-end gap-1">
              <span className={cn("w-fit whitespace-nowrap border px-2.5 py-1 text-[10px] font-black", player.ready ? "border-black bg-[var(--success)] text-white" : disconnected ? "border-red-700 bg-red-700 text-white" : away || syncing ? "border-black bg-[var(--warning)] text-black" : "border-black/20 text-[var(--muted)]")}>
                {status}
              </span>
              {canKick && (
                <button type="button" className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-red-700 underline" onClick={() => onKickPlayer(player.id)}>
                  <UserX size={12} /> Expulsar
                </button>
              )}
            </span>
          </div>
        );})}
      </div>
    </div>
  );
}

function ConnectionStateBadge({ status }: { status: RoomConnectionStatus }) {
  const label = status === "syncing" ? "Sincronizando" : status === "connected" ? "Conectado" : "Reconectando";
  return (
    <span className={cn(
      "inline-flex items-center gap-2 border border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]",
      status === "connected" ? "bg-[var(--success)] text-white" : status === "syncing" ? "bg-[var(--warning)] text-black" : "bg-red-700 text-white"
    )}>
      <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  );
}

function PlayerSetupPanel({ player, onReady, onSetup }: { player: RoomPlayer; onReady: (playerId: string, ready: boolean) => void; onSetup: (playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) => void }) {
  return (
    <article className="border border-black bg-white p-4">
      <div className="grid gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[var(--success)]">Sua preparacao</p>
          <h3 className="mt-1 text-2xl font-black">{player.teamName}</h3>
          <p className="text-sm text-[var(--muted)]">{player.userName}</p>
        </div>
        <Button variant={player.ready ? "secondary" : "primary"} onClick={() => onReady(player.id, !player.ready)}>
          {player.ready ? "Alterar preparacao" : "Confirmar pronto"}
        </Button>
      </div>
      <ControlBlock label="Formacao">
        {formationOptions.map((formation) => (
          <SegmentButton key={formation} active={player.formation === formation} onClick={() => onSetup(player.id, { formation })}>{formation}</SegmentButton>
        ))}
      </ControlBlock>
      <ControlBlock label="Estilo tatico">
        {tacticalStyleOptions.map((style) => (
          <SegmentButton key={style.value} active={player.tacticalStyle === style.value} onClick={() => onSetup(player.id, { tacticalStyle: style.value })}>{style.label}</SegmentButton>
        ))}
      </ControlBlock>
    </article>
  );
}

function RoomFormationPreview({ formation, tacticalStyle }: { formation: string; tacticalStyle: TacticalStyle }) {
  const slots = getFormationSlots(formation, tacticalStyle);
  return (
    <div className="border border-black bg-[var(--surface-muted)] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--success)]">Previa da escalação</p>
        <span className="text-xs font-black text-slate-300">{formation} - {tacticalStyleLabel(tacticalStyle)}</span>
      </div>
      <div className="relative mx-auto aspect-[7/10] max-h-[520px] min-h-[360px] overflow-hidden border border-black field-lines">
        <SoccerFieldMarkings />
        {slots.map((slot) => (
          <span
            key={slot.id}
            className="absolute z-10 grid h-9 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded border border-dashed border-emerald-300/45 bg-night/70 text-[9px] font-black text-emerald-100"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            {slot.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function HostSettingsPanel({ room, onChange }: { room: FriendRoom; onChange: (settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) => void }) {
  return (
    <article className="border border-black bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Configuracoes do criador</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
        <input className={inputClass} value={room.name} placeholder="Nome do torneio" onChange={(event) => onChange({ name: event.target.value })} />
        <div className="flex flex-wrap gap-2">
          <SegmentButton active={room.visibility === "publica"} onClick={() => onChange({ visibility: "publica" })}>Publica</SegmentButton>
          <SegmentButton active={room.visibility === "privada"} onClick={() => onChange({ visibility: "privada" })}>Privada</SegmentButton>
        </div>
      </div>
      {room.visibility === "privada" && (
        <input className={cn(inputClass, "mt-3")} value={room.password ?? ""} type="password" placeholder="Senha da sala" onChange={(event) => onChange({ password: event.target.value })} />
      )}
      <ControlBlock label="Modo">
        <SegmentButton active={room.difficulty === "classico"} onClick={() => onChange({ difficulty: "classico" })}>Classico</SegmentButton>
        <SegmentButton active={room.difficulty === "almanaque"} onClick={() => onChange({ difficulty: "almanaque" })}>De almanaque</SegmentButton>
      </ControlBlock>
      <ControlBlock label="Tempo por escolha">
        <SegmentButton active={room.draftMode === "turnos"} onClick={() => onChange({ draftMode: "turnos" })}>3 por vez</SegmentButton>
        <SegmentButton active={room.draftMode === "todos"} onClick={() => onChange({ draftMode: "todos" })}>Todos juntos</SegmentButton>
      </ControlBlock>
      {room.draftMode === "turnos" ? (
        <ControlBlock label="Cronometro por vez">
          {[20, 30, 45].map((value) => (
            <SegmentButton key={value} active={room.turnSeconds === value} onClick={() => onChange({ turnSeconds: value as 20 | 30 | 45 })}>{value}s</SegmentButton>
          ))}
        </ControlBlock>
      ) : (
        <ControlBlock label="Tempo total">
          {[2, 4, 6].map((value) => (
            <SegmentButton key={value} active={room.simultaneousMinutes === value} onClick={() => onChange({ simultaneousMinutes: value as 2 | 4 | 6 })}>{value} min</SegmentButton>
          ))}
        </ControlBlock>
      )}
    </article>
  );
}

function ControlBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-300/75">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SegmentButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      className={cn(
        "min-h-10 rounded-full border px-3 py-2 text-sm font-black transition",
        active ? "border-[var(--success)] bg-[var(--success)] text-white" : "border-black/20 bg-white text-black hover:border-[var(--success)]"
      )}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function StatusPill({ status }: { status: FriendRoom["status"] }) {
  return (
    <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
      {roomStatusLabel(status)}
    </span>
  );
}

function tabButtonClass(active: boolean) {
  return cn(
    "rounded-none px-3 py-3 text-sm font-black transition",
    active ? "bg-electric text-night" : "text-slate-200 hover:bg-white/10"
  );
}

function TimerPill({ seconds, icon }: { seconds: number; icon: ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-4 py-2 font-mono text-xl font-black text-gold">
      {icon}
      {formatSeconds(seconds)}
    </div>
  );
}

function bracketRowStart(phase: string, index: number) {
  if (phase === "Oitavas de final") return index * 2 + 1;
  if (phase === "Quartas de final") return index * 4 + 2;
  if (phase === "Semifinal") return index * 8 + 4;
  return 8;
}

function formatSeconds(total: number) {
  const clean = Math.max(0, total);
  const minutes = Math.floor(clean / 60).toString();
  const seconds = (clean % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function draftModeLabel(mode: RoomDraftMode) {
  return mode === "todos" ? "todos juntos" : "por turnos";
}

function tacticalStyleLabel(style: TacticalStyle) {
  return tacticalStyleOptions.find((item) => item.value === style)?.label ?? "Equilibrado";
}

function shortPlayerId(id: string) {
  return id.replace(/^(player|bot)-/i, "").slice(-5).toUpperCase();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "FC";
}

function isFreshRoom(room: FriendRoom) {
  if (!room.players.some((player) => !player.isBot)) return false;
  const seenValues = Object.values(room.lastSeenAt ?? {});
  if (seenValues.length) return seenValues.some((value) => Date.now() - value < 5 * 60_000);
  const reference = Date.parse(room.updatedAt || room.createdAt);
  if (!Number.isFinite(reference)) return true;
  return Date.now() - reference < 5 * 60_000;
}

function samePlayer(player: RoomPlayer, userName: string, teamName: string) {
  return sameText(player.userName, userName) || sameText(player.teamName, teamName);
}

function autoPickKey(room: FriendRoom, playerId: string) {
  const player = room.players.find((item) => item.id === playerId);
  if (room.draftMode === "todos") return `${room.id}:todos:${playerId}:${room.draftEndsAt ?? 0}:${player?.squad.length ?? 0}`;
  return `${room.id}:turnos:${room.turnIndex}:${room.turnStartedAt ?? 0}:${playerId}`;
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function roomStatusLabel(status: FriendRoom["status"]) {
  return {
    lobby: "Lobby",
    drafting: "Draft",
    challenge: "Desafio 99",
    reviewing: "Ajustes",
    coach: "Tecnico",
    cards: "Cartas secretas",
    bracket: "Chave",
    finished: "Finalizada"
  }[status];
}

function shortSeason(season: string) {
  const match = season.match(/^(\d{4})\/(\d{2})$/);
  return match ? `${match[1].slice(2)}/${match[2]}` : season;
}

function playTurnSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.14);
    gain.gain.setValueAtTime(0.001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.24);
  } catch {
    // Audio can be blocked before a user gesture.
  }
}
