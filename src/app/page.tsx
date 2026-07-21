"use client";

import { TeamNameWithCrest } from "@/components/game/TeamNameWithCrest";
import { GenericBadge } from "@/components/game/GenericBadge";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { getFormationSlots } from "@/config/formations";
import { clubSeasons as clubSeasonData, players as playerData } from "@/data/loaders";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { positionLabel } from "@/game-engine/position-labels";
import {
  autoPickRoomTurn,
  chooseRoomCoach,
  createFriendRoom,
  currentPlayerRoomMatch,
  drawRoomCoaches,
  drawRoomTeam,
  hasPendingHumanRoomMatches,
  joinRoom,
  loadFriendRooms,
  moveRoomPick,
  playPlayerRoomMatch,
  placeRoomPlayer,
  previewPlayerRoomMatch,
  progressRoomRound,
  replaceRoomPick,
  resetRoomToLobby,
  saveFriendRooms,
  selectRoomPlayer,
  setRoomPlayerReady,
  startRoomCoachStage,
  startRoomDraft,
  touchRoomPlayer,
  updateRoomPlayerSetup,
  updateRoomSettings,
  type FriendRoom,
  type RoomCoach,
  type RoomDraftMode,
  type RoomDraw,
  type RoomMatch,
  type RoomPick,
  type RoomPlayer,
  type RoomVisibility
} from "@/lib/friend-rooms";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import type { Position, TacticalStyle } from "@/types/game";
import { Check, Clock, Dices, Lock, Play, Plus, ShieldCheck, Users, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const inputClass =
  "min-h-11 w-full rounded-2xl border border-white/12 bg-night/70 px-4 py-2 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-electric";

const phases = [
  { name: "Oitavas de final", label: "Oitavas" },
  { name: "Quartas de final", label: "Quartas" },
  { name: "Semifinal", label: "Semi" },
  { name: "Final", label: "Final" }
] as const;

type RoomTimelineEvent = {
  minute: number;
  teamName: string;
  text: string;
  homeGoals: number;
  awayGoals: number;
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

async function persistSharedRooms(rooms: FriendRoom[]) {
  const response = await fetch("/api/friend-rooms", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rooms })
  });
  if (!response.ok) throw new Error("Nao foi possivel salvar as salas.");
  const payload = (await response.json()) as { rooms?: FriendRoom[] };
  return Array.isArray(payload.rooms) ? payload.rooms : rooms;
}

function mergeRoomLists(primary: FriendRoom[], secondary: FriendRoom[]) {
  const byId = new Map<string, FriendRoom>();
  for (const room of primary) byId.set(room.id, room);
  for (const room of secondary) {
    if (!byId.has(room.id)) byId.set(room.id, room);
  }
  return Array.from(byId.values()).slice(0, 40);
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
    simultaneousMinutes: 2 as 2 | 3,
    turnSeconds: 30 as 20 | 30 | 45
  });
  const lastTurnSignature = useRef("");
  const roomsRef = useRef<FriendRoom[]>([]);

  const applyRooms = useCallback((nextRooms: FriendRoom[], activeId?: string) => {
    const cleanRooms = nextRooms.filter(isFreshRoom).slice(0, 40);
    roomsRef.current = cleanRooms;
    setRooms(cleanRooms);
    saveFriendRooms(cleanRooms);
    setActiveRoomId((current) => activeId ?? (current && cleanRooms.some((room) => room.id === current) ? current : cleanRooms[0]?.id));
  }, []);

  const refreshRooms = useCallback(
    async (migrateLocal = false) => {
      try {
        const sharedRooms = await fetchSharedRooms();
        let nextRooms = sharedRooms;
        if (migrateLocal) {
          const localRooms = loadFriendRooms();
          const missingLocalRooms = localRooms.filter((localRoom) => !sharedRooms.some((sharedRoom) => sharedRoom.id === localRoom.id));
          if (missingLocalRooms.length) {
            nextRooms = await persistSharedRooms(mergeRoomLists(sharedRooms, missingLocalRooms));
          }
        }
        applyRooms(nextRooms);
      } catch {
        applyRooms(loadFriendRooms());
      }
    },
    [applyRooms]
  );

  useEffect(() => {
    if (!currentUser) void loadAccount();
    setAccountChecked(true);
  }, [currentUser, loadAccount]);

  useEffect(() => {
    void refreshRooms(true);
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
    document.body.classList.toggle("room-focus-mode", roomFocusMode);
    return () => document.body.classList.remove("room-focus-mode");
  }, [roomFocusMode]);

  const commitRooms = useCallback(
    (nextRooms: FriendRoom[], activeId?: string) => {
      const cleanRooms = nextRooms.slice(0, 40);
      applyRooms(cleanRooms, activeId);
      void persistSharedRooms(cleanRooms)
        .then((sharedRooms) => applyRooms(sharedRooms, activeId))
        .catch(() => setMessage("Sala salva neste navegador, mas ainda nao sincronizou com as outras abas."));
    },
    [applyRooms]
  );

  const commitRoom = useCallback((room: FriendRoom) => {
    const touchedRoom = { ...room, updatedAt: new Date().toISOString() };
    const currentRooms = roomsRef.current;
    const nextRooms = currentRooms.some((item) => item.id === touchedRoom.id) ? currentRooms.map((item) => (item.id === touchedRoom.id ? touchedRoom : item)) : [touchedRoom, ...currentRooms];
    commitRooms(nextRooms, touchedRoom.id);
  }, [commitRooms]);

  useEffect(() => {
    if (!currentUser || !activeRoomId || roomScreen !== "room") return;
    const userName = currentUser.playerName?.trim() || currentUser.username;
    const teamName = currentUser.teamName ?? `${userName} FC`;
    const touch = () => {
      const latest = roomsRef.current.find((room) => room.id === activeRoomId);
      const player = latest?.players.find((item) => samePlayer(item, userName, teamName));
      if (!latest || !player) return;
      commitRoom(touchRoomPlayer(latest, player.id));
    };
    touch();
    const timer = window.setInterval(touch, 10_000);
    return () => window.clearInterval(timer);
  }, [activeRoomId, commitRoom, currentUser, roomScreen]);

  function handleCreateRoom() {
    if (!currentUser) {
      setMessage("Entre com uma conta para criar sala.");
      return;
    }
    if (form.visibility === "privada" && form.password.trim().length < 3) {
      setMessage("Sala privada precisa de senha com pelo menos 3 caracteres.");
      return;
    }
    const room = createFriendRoom({
      ...form,
      hostName: currentUser.playerName?.trim() || currentUser.username,
      hostTeamName: currentUser.teamName ?? `${currentUser.playerName?.trim() || currentUser.username} FC`
    });
    commitRooms([room, ...roomsRef.current], room.id);
    setRoomScreen("room");
    setMessage("Sala criada.");
  }

  function handleJoin(room: FriendRoom) {
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
    commitRoom(joinRoom(room, userName, teamName));
    setRoomScreen("room");
    setMessage("Voce entrou na sala.");
  }

  function updateActiveRoom(updater: (room: FriendRoom) => FriendRoom) {
    if (!activeRoom) return;
    commitRoom(updater(activeRoom));
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
    updateActiveRoom((room) => setRoomPlayerReady(room, playerId, ready));
  }

  function handlePlayerSetup(playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) {
    updateActiveRoom((room) => updateRoomPlayerSetup(room, playerId, setup));
  }

  function handleRoomSettings(settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) {
    updateActiveRoom((room) => updateRoomSettings(room, settings));
  }

  const turnRemaining =
    activeRoom?.status === "drafting" && activeRoom.turnStartedAt
      ? Math.max(0, activeRoom.turnSeconds - Math.floor((now - activeRoom.turnStartedAt) / 1000))
      : undefined;
  const reviewRemaining =
    activeRoom?.status === "reviewing" && activeRoom.reviewEndsAt
      ? Math.max(0, Math.ceil((activeRoom.reviewEndsAt - now) / 1000))
      : undefined;

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "drafting" || turnRemaining !== 0) return;
    commitRoom(autoPickRoomTurn(activeRoom));
  }, [activeRoom, commitRoom, turnRemaining]);

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "reviewing" || reviewRemaining !== 0) return;
    setReviewSlotId(undefined);
    commitRoom(startRoomCoachStage(activeRoom));
  }, [activeRoom, commitRoom, reviewRemaining]);

  useEffect(() => {
    if (!activeRoom || activeRoom.status !== "drafting" || activeRoom.draftMode !== "turnos") return;
    const signature = `${activeRoom.id}-${activeRoom.turnIndex}-${activeRoom.turnStartedAt}`;
    if (signature === lastTurnSignature.current) return;
    lastTurnSignature.current = signature;
    playTurnSound();
  }, [activeRoom]);

  if (!accountChecked) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(4,18,43,.94),rgba(3,46,52,.7))] p-8 text-center shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Jogar com amigos</p>
          <h1 className="mt-3 text-4xl font-black">Carregando sua conta</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">So um instante para validar seu acesso local.</p>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(4,18,43,.94),rgba(3,46,52,.7))] p-8 text-center shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Jogar com amigos</p>
          <h1 className="mt-3 text-4xl font-black">Entre para criar ou acessar salas</h1>
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
      <main className={cn("mx-auto px-4", gameStarted ? "max-w-7xl py-5" : "max-w-6xl py-8")}>
        {message && (
          <div className="mb-4 rounded-md border border-electric/30 bg-electric/10 px-4 py-3 text-sm font-bold text-sky-100">
            {message}
          </div>
        )}
        <ActiveRoomPanel
          room={focusedRoom}
          turnRemaining={turnRemaining}
          reviewRemaining={reviewRemaining}
          accountPlayerName={accountPlayerName}
          accountTeamName={accountTeamName}
          focused={gameStarted}
          onBackToRooms={() => setRoomScreen("rooms")}
          onStartDraft={handleStartDraft}
          onDrawTeam={(playerId) => updateActiveRoom((room) => drawRoomTeam(room, playerId))}
          onSelectPick={(playerId, pickId) => updateActiveRoom((room) => selectRoomPlayer(room, playerId, pickId))}
          onPlacePick={(playerId, slotId) => updateActiveRoom((room) => placeRoomPlayer(room, playerId, slotId))}
          reviewSlotId={reviewSlotId}
          onReviewSlotChange={setReviewSlotId}
          onMovePick={(playerId, fromSlotId, toSlotId) => updateActiveRoom((room) => moveRoomPick(room, playerId, fromSlotId, toSlotId))}
          onReplacePick={(playerId, slotId, replacementId) => updateActiveRoom((room) => replaceRoomPick(room, playerId, slotId, replacementId))}
          onDrawCoaches={(playerId) => updateActiveRoom((room) => drawRoomCoaches(room, playerId))}
          onChooseCoach={(playerId, coachId) => updateActiveRoom((room) => chooseRoomCoach(room, playerId, coachId))}
          onPlayerReady={handlePlayerReady}
          onPlayerSetup={handlePlayerSetup}
          onRoomSettings={handleRoomSettings}
          onPlayMatch={(playerId) => updateActiveRoom((room) => playPlayerRoomMatch(room, playerId))}
          onProgressRound={() => updateActiveRoom(progressRoomRound)}
          onResetLobby={() => updateActiveRoom(resetRoomToLobby)}
        />
        {!gameStarted && <div className="mt-6"><AdBanner variant="leaderboard" /></div>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-7">
      <section className="rounded-2xl border border-emerald-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(17,255,184,.12),transparent_26rem),linear-gradient(135deg,rgba(4,18,43,.96),rgba(3,46,52,.7))] p-6 shadow-card">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Jogar com amigos</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-white md:text-5xl">Salas mata-mata</h1>
            <p className="mt-2 max-w-2xl text-slate-300">Oitavas com amigos, times aleatorios completando a chave e draft com tempo.</p>
            <p className="mt-2 text-sm text-slate-400">Jogando como <strong className="text-white">{accountPlayerName}</strong> - {accountTeamName}</p>
          </div>
          <Link href="/jogar"><Button variant="secondary">Voltar ao solo</Button></Link>
        </div>
      </section>

      {message && (
        <div className="mt-4 rounded-2xl border border-electric/30 bg-electric/10 px-4 py-3 text-sm font-bold text-sky-100">
          {message}
        </div>
      )}

      <section className="mt-6">
        <div className="mx-auto max-w-3xl space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-night/70 p-2">
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
            <CreateRoomPanel form={form} accountUserName={accountPlayerName} accountTeamName={accountTeamName} onChange={setForm} onCreate={handleCreateRoom} />
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
  onChange,
  onCreate
}: {
  form: {
    name: string;
    visibility: RoomVisibility;
    password: string;
    difficulty: "classico" | "almanaque";
    draftMode: RoomDraftMode;
    simultaneousMinutes: 2 | 3;
    turnSeconds: 20 | 30 | 45;
  };
  accountUserName: string;
  accountTeamName: string;
  onChange: (form: {
    name: string;
    visibility: RoomVisibility;
    password: string;
    difficulty: "classico" | "almanaque";
    draftMode: RoomDraftMode;
    simultaneousMinutes: 2 | 3;
    turnSeconds: 20 | 30 | 45;
  }) => void;
  onCreate: () => void;
}) {
  return (
    <article className="rounded-xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(2,12,28,.92),rgba(3,35,40,.72))] p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-3xl font-black text-red-400">02</p>
          <h2 className="-mt-1 text-2xl font-black uppercase text-white">Final de Copa</h2>
        </div>
        <Users className="mt-1 text-emerald-300" />
      </div>

      <div className="mt-5 grid gap-3">
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

      <ControlBlock label="Tempo por jogada">
        {[20, 30, 45].map((value) => (
          <SegmentButton key={value} active={form.turnSeconds === value} onClick={() => onChange({ ...form, turnSeconds: value as 20 | 30 | 45 })}>{value}s</SegmentButton>
        ))}
      </ControlBlock>

      <div className="mt-4 rounded-md border border-emerald-300/15 bg-night/55 px-3 py-2 text-sm text-slate-300">
        Draft por turnos: cada jogador escolhe 3 atletas por vez e fecha o time com 2 escolhas finais.
      </div>

      <Button className="mt-5 w-full bg-danger text-white hover:bg-red-400" onClick={onCreate}>
        <Plus size={18} /> Criar sala
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
    <article className="rounded-xl border border-white/12 bg-white/[0.055] p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Salas criadas</p>
          <h2 className="text-2xl font-black">Disponiveis</h2>
        </div>
        <ShieldCheck className="text-electric" />
      </div>
      <RoomSection title="Publicas" rooms={publicRooms} activeRoomId={activeRoomId} joinPasswords={joinPasswords} onPasswordChange={onPasswordChange} onSelect={onSelect} onJoin={onJoin} />
      <RoomSection title="Privadas" rooms={privateRooms} activeRoomId={activeRoomId} joinPasswords={joinPasswords} onPasswordChange={onPasswordChange} onSelect={onSelect} onJoin={onJoin} />
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
      <div className="mt-2 space-y-2">
        {rooms.length === 0 && <div className="rounded-md border border-dashed border-white/12 p-3 text-sm text-slate-400">Nenhuma sala.</div>}
        {rooms.map((room) => (
          <article key={room.id} className={cn("rounded-md border p-3", room.id === activeRoomId ? "border-gold bg-gold/10" : "border-white/10 bg-night/55")}>
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
            <Button variant="secondary" className="mt-3 min-h-9 w-full text-xs" onClick={() => onJoin(room)}>
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
  accountPlayerName,
  accountTeamName,
  focused = false,
  onBackToRooms,
  onStartDraft,
  onDrawTeam,
  onSelectPick,
  onPlacePick,
  reviewSlotId,
  onReviewSlotChange,
  onMovePick,
  onReplacePick,
  onDrawCoaches,
  onChooseCoach,
  onPlayerReady,
  onPlayerSetup,
  onRoomSettings,
  onPlayMatch,
  onProgressRound,
  onResetLobby
}: {
  room?: FriendRoom;
  turnRemaining?: number;
  reviewRemaining?: number;
  accountPlayerName: string;
  accountTeamName: string;
  focused?: boolean;
  onBackToRooms?: () => void;
  onStartDraft: () => void;
  onDrawTeam: (playerId: string) => void;
  onSelectPick: (playerId: string, pickId: string) => void;
  onPlacePick: (playerId: string, slotId: string) => void;
  reviewSlotId?: string;
  onReviewSlotChange: (slotId?: string) => void;
  onMovePick: (playerId: string, fromSlotId: string, toSlotId: string) => void;
  onReplacePick: (playerId: string, slotId: string, replacementId: string) => void;
  onDrawCoaches: (playerId: string) => void;
  onChooseCoach: (playerId: string, coachId: string) => void;
  onPlayerReady: (playerId: string, ready: boolean) => void;
  onPlayerSetup: (playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) => void;
  onRoomSettings: (settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) => void;
  onPlayMatch: (playerId: string) => void;
  onProgressRound: () => void;
  onResetLobby: () => void;
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

      {room.status === "reviewing" && (
        <ReviewPanel
          room={room}
          currentPlayer={currentPlayer}
          reviewRemaining={reviewRemaining ?? 0}
          selectedSlotId={reviewSlotId}
          onSelectSlot={onReviewSlotChange}
          onMovePick={onMovePick}
          onReplacePick={onReplacePick}
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

      {(room.status === "bracket" || room.status === "finished") && (
        <RoomBracket room={room} currentPlayer={currentPlayer} isHost={isHost} onPlayMatch={onPlayMatch} onProgressRound={onProgressRound} onResetLobby={onResetLobby} />
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
  onRoomSettings
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  isHost: boolean;
  onStartDraft: () => void;
  onPlayerReady: (playerId: string, ready: boolean) => void;
  onPlayerSetup: (playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) => void;
  onRoomSettings: (settings: Partial<Pick<FriendRoom, "name" | "visibility" | "password" | "difficulty" | "draftMode" | "simultaneousMinutes" | "turnSeconds">>) => void;
}) {
  const realPlayers = room.players.filter((player) => !player.isBot);
  const readyCount = realPlayers.filter((player) => player.ready).length;
  const autoTeams = Math.max(0, 16 - realPlayers.length);
  const canStart = realPlayers.length > 0 && readyCount === realPlayers.length;

  return (
    <div className="mt-5 grid gap-5">
      <div className="rounded-lg border border-white/10 bg-night/50 p-4">
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
        <PlayerLobbyList players={realPlayers} />
      </div>
      {currentPlayer ? (
        <PlayerSetupPanel player={currentPlayer} onReady={onPlayerReady} onSetup={onPlayerSetup} />
      ) : (
        <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.04] p-4 text-sm text-slate-300">
          Entre nessa sala pela lista para configurar seu time e confirmar pronto.
        </div>
      )}
      {isHost && <HostSettingsPanel room={room} onChange={onRoomSettings} />}
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
  const turnPlayer = room.players[room.turnIndex];
  const currentPlayerId = currentPlayer?.id;
  const isMyTurn = Boolean(currentPlayerId && turnPlayer?.id === currentPlayerId);
  const fieldPlayer = isMyTurn ? currentPlayer : turnPlayer ?? currentPlayer ?? room.players[0];
  const pendingPick = isMyTurn ? room.currentDraw?.roster.find((pick) => pick.id === room.pendingPickId) : undefined;
  const rerollsUsed = turnPlayer ? room.rerollsByPlayer?.[turnPlayer.id] ?? 0 : 0;
  const rerollsLeft = Math.max(0, 3 - rerollsUsed);
  const batchStartSize = Math.max(0, (turnPlayer?.squad.length ?? 0) - room.picksInTurn);
  const batchLimit = batchStartSize >= 9 ? 2 : 3;
  const batchRemaining = Math.max(1, batchLimit - room.picksInTurn);
  const turnText = batchLimit === 2 ? "Rodada final: escolha 2 jogadores" : "Escolha 3 jogadores nesta vez";
  const [isDrawing, setIsDrawing] = useState(false);
  const [isRevealingDraw, setIsRevealingDraw] = useState(false);
  const [rollingIndex, setRollingIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<number | null>(null);
  const previousDrawKeyRef = useRef<string>("");
  const skipNextRevealRef = useRef(false);
  const rollingClub = useMemo(() => clubSeasonData[rollingIndex % clubSeasonData.length], [rollingIndex]);
  const drawKey = room.currentDraw ? `${turnPlayer?.id ?? "player"}:${turnPlayer?.squad.length ?? 0}:${room.picksInTurn}:${room.currentDraw.clubSeasonId}` : "";

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
    if (!currentPlayerId || isDrawing || !isMyTurn) return;
    setIsDrawing(true);
    setRollingIndex((value) => value + 1);
    intervalRef.current = window.setInterval(() => {
      setRollingIndex((value) => value + 1 + Math.floor(Math.random() * 3));
    }, 115);
    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      skipNextRevealRef.current = true;
      onDrawTeam(currentPlayerId);
      setIsDrawing(false);
    }, 1000);
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(420px,.95fr)_minmax(380px,1.05fr)]">
      <RoomSquadField
        player={fieldPlayer}
        pendingPick={pendingPick}
        interactive={isMyTurn}
        onPlace={(slotId) => currentPlayerId && onPlacePick(currentPlayerId, slotId)}
      />
      <aside className="space-y-4 xl:sticky xl:top-20">
        <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.065] shadow-card">
          <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,.16),rgba(7,24,50,.88))] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Vez de escolher</p>
                <h3 className="mt-1 truncate text-2xl font-black">{turnPlayer?.teamName ?? "Jogador"}</h3>
              </div>
              <TimerPill seconds={turnRemaining ?? room.turnSeconds} icon={<Volume2 size={16} />} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">
              <span className="rounded-full border border-white/10 bg-night/60 px-3 py-1.5">{fieldPlayer?.formation ?? "4-3-3"}</span>
              <span className="rounded-full border border-white/10 bg-night/60 px-3 py-1.5">{room.difficulty === "almanaque" ? "De almanaque" : "Classico"}</span>
              <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1.5 text-gold">{turnText} - faltam {batchRemaining}</span>
            </div>
            <p className="mt-3 text-sm text-slate-300">
              {isMyTurn ? (pendingPick ? "Clique em uma posicao destacada no campo ou troque o jogador na lista." : "Sorteie um time, escolha um jogador e depois a posicao.") : "Aguardando esse jogador escolher."}
            </p>
          </div>
          <div className="p-4">
            {(isDrawing || isRevealingDraw) && rollingClub ? (
              <RollingTeamCard club={rollingClub} />
            ) : !room.currentDraw ? (
              <div className="rounded-2xl border border-dashed border-white/14 bg-white/[0.04] p-5 text-center">
                <p className="text-sm font-semibold text-slate-300">{isMyTurn ? "Nenhum time sorteado para esta escolha." : "O jogador da vez ainda nao sorteou o time."}</p>
                <Button className="mt-4 w-full" disabled={!isMyTurn || isDrawing} onClick={runDrawAnimation}>
                  <Dices size={18} /> Sortear time
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night/55 px-3 py-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">Rerolls: <strong className="text-gold">{rerollsLeft}</strong>/3</span>
                  <Button variant="secondary" disabled={!isMyTurn || isDrawing || rerollsLeft <= 0} onClick={runDrawAnimation}>
                    <Dices size={18} /> Sortear novamente
                  </Button>
                </div>
                <DrawnTeamRoster
                  draw={room.currentDraw}
                  player={turnPlayer}
                  selectedPickId={room.pendingPickId}
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
    <div className="overflow-hidden rounded-2xl border border-emerald-400/25 bg-emerald-950/25">
      <div
        className="flex items-center gap-4 border-b border-emerald-400/20 px-4 py-4"
        style={{
          background: `linear-gradient(135deg, ${draw.primaryColor}44, rgba(7,24,50,.88) 52%, ${draw.secondaryColor}33)`
        }}
      >
        <GenericBadge club={draw} size={68} />
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">{draw.rarity}</p>
          <h4 className="mt-1 truncate text-xl font-black text-white">{draw.clubName} {draw.season}</h4>
          <p className="text-sm text-slate-300">{draw.country}</p>
        </div>
      </div>
      <div className="game-scrollbar max-h-[min(430px,calc(100vh-25rem))] overflow-y-auto">
      {orderedRoster.map((pick) => {
        const alreadyPicked = Boolean(player?.squad.some((item) => item.canonicalPlayerId === pick.canonicalPlayerId));
        const eligible = isRoomPickEligible(player, pick);
        const blocked = disabled || alreadyPicked || !eligible;
        return (
        <button
          key={pick.id}
          className={cn(
            "grid w-full grid-cols-[3.5rem_minmax(0,1fr)_4.25rem_5.25rem] items-center gap-3 border-b border-emerald-400/10 px-4 py-3 text-left text-sm transition last:border-b-0",
            selectedPickId === pick.id && "bg-gold/15 ring-1 ring-inset ring-gold/70",
            blocked ? "cursor-not-allowed opacity-45" : "bg-emerald-400/[0.06] hover:bg-electric/10"
          )}
          disabled={blocked}
          onClick={() => onPick(pick.id)}
        >
          <span className="font-mono text-xs font-black text-emerald-300">#{pick.shirtNumber ?? "--"}</span>
          <div className="min-w-0">
            <p className="truncate font-black text-white">{pick.name}</p>
            <p className="truncate text-xs text-slate-400">{pick.nationality ?? pick.clubName}</p>
          </div>
          <span className="justify-self-center rounded-full border border-emerald-300/15 bg-night/45 px-2 py-1 font-mono text-[11px] font-black text-emerald-300">{positionLabel(pick.position)}</span>
          <span className="text-right font-mono text-lg font-black text-gold tabular-nums">{alreadyPicked ? "XI" : pick.overall}</span>
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
    <section className="rounded-2xl border border-white/12 bg-emerald-950/30 p-3 shadow-card">
      <div className="mb-3 rounded-2xl border border-white/10 bg-night/65 px-4 py-3 shadow-glow">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
          <div className="rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-gold">Rating</span>
            <span className="font-mono text-2xl font-black leading-none text-white">{rating}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Elenco</span>
              <span className="font-mono text-sm font-black text-white">{player?.squad.length ?? 0}/11</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-electric to-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="rounded-full border border-electric/25 bg-electric/10 px-3 py-2 text-center">
            <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-electric">Time</span>
            <span className="block max-w-40 truncate text-sm font-black text-white">{player?.teamName ?? "Aguardando"}</span>
          </div>
        </div>
      </div>
      <div className="relative mx-auto aspect-[7/10] max-h-[680px] min-h-[430px] overflow-hidden rounded-2xl border border-white/20 field-lines sm:min-h-[500px]">
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
        {slots.map((slot) => {
          const pick = assigned[slot.id];
          const pickClub = pick ? clubSeasonData.find((season) => season.id === pick.clubSeasonId) : undefined;
          const pendingFit = pendingPick && !pick ? roomPickFit(pendingPick, slot.position) : undefined;
          const canPlacePending = Boolean(interactive && pendingFit?.allowed);
          const reviewMode = Boolean(onReviewSlotClick);
          const selectedForReview = reviewSelectionSlotId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 border text-center text-[11px] font-bold shadow-card transition",
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
                  {pickClub && (
                    <span className="absolute left-1 top-0">
                      <GenericBadge club={pickClub} size={31} />
                    </span>
                  )}
                  <span className="mt-6 max-w-[4.15rem] truncate text-[10px] leading-tight">{shortName(pick.name)}</span>
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
    <div className="rounded-2xl border border-white/10 bg-night/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Jogadores</p>
        <span className="text-xs font-bold text-slate-400">{players.length}/16</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {players.map((player) => (
          <div key={player.id} className={cn("grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border px-3 py-2 text-sm", player.id === currentPlayerId ? "border-gold bg-gold/10" : "border-white/10 bg-white/[0.035]")}>
            <span className="min-w-0">
              <span className="block truncate font-black text-white">{player.teamName}</span>
              <span className="block truncate text-xs text-slate-400">{player.ready ? "Pronto" : "Montando elenco"}</span>
            </span>
            <span className="font-mono text-xs font-black text-gold">{player.squad.length}/11</span>
          </div>
        ))}
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
  onReplacePick
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  reviewRemaining: number;
  selectedSlotId?: string;
  onSelectSlot: (slotId?: string) => void;
  onMovePick: (playerId: string, fromSlotId: string, toSlotId: string) => void;
  onReplacePick: (playerId: string, slotId: string, replacementId: string) => void;
}) {
  const fieldPlayer = currentPlayer ?? room.players[0];
  const selectedPick = currentPlayer?.squad.find((pick) => pick.slotId === selectedSlotId);
  const selectedSlot = selectedSlotId ? getFormationSlots(fieldPlayer?.formation ?? "4-3-3", fieldPlayer?.tacticalStyle ?? "equilibrado").find((slot) => slot.id === selectedSlotId) : undefined;
  const replacementOptions = useMemo(() => {
    if (!currentPlayer || !selectedSlot) return [];
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
  }, [currentPlayer, room.id, room.reviewEndsAt, selectedSlot]);

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
    if (!currentPlayer || !selectedSlotId) return;
    onReplacePick(currentPlayer.id, selectedSlotId, replacementId);
    onSelectSlot(undefined);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
      <RoomSquadField player={fieldPlayer} reviewSelectionSlotId={selectedSlotId} onReviewSlotClick={handleReviewSlot} />
      <aside className="space-y-4">
        <div className="rounded-lg border border-gold/25 bg-gold/10 p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Ajuste final</p>
          <h3 className="mt-2 text-3xl font-black">30 segundos para trocar</h3>
          <p className="mt-2 text-sm text-slate-300">Clique em um jogador na previa da escalacao. A lateral mostra ate 10 substitutos compativeis para aquela posicao.</p>
          <div className="mt-4">
            <TimerPill seconds={reviewRemaining} icon={<Clock size={16} />} />
          </div>
        </div>
        {currentPlayer && selectedSlot && (
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
        {currentPlayer && !selectedSlot && (
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
    <div className="grid gap-6 lg:grid-cols-[.92fr_1.08fr]">
      <RoomSquadField player={currentPlayer ?? room.players[0]} />
      <aside className="space-y-4">
        <div className="rounded-lg border border-white/12 bg-white/[0.07] p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Tecnico</p>
          <h3 className="mt-2 text-3xl font-black">{currentPlayer?.teamName ?? "Aguardando"}</h3>
          <p className="mt-2 text-sm text-slate-300">Sorteie 3 tecnicos e escolha 1 para comandar seu time no mata-mata.</p>
          {currentPlayer && options.length === 0 && (
            <Button className="mt-4 w-full" onClick={() => onDrawCoaches(currentPlayer.id)}>
              <Dices size={18} /> Sortear 3 tecnicos
            </Button>
          )}
          {selectedCoach && (
            <div className="mt-4 rounded-md border border-emerald-300/25 bg-emerald-300/10 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Escolhido</p>
              <p className="mt-1 font-black text-white">{selectedCoach.name} - {selectedCoach.clubName} {shortSeason(selectedCoach.season)}</p>
            </div>
          )}
        </div>
        {options.length > 0 && (
          <div className="grid gap-3">
            {options.map((coach) => (
              <CoachCard
                key={coach.id}
                coach={coach}
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

function CoachCard({ coach, selected, disabled, onChoose }: { coach: RoomCoach; selected: boolean; disabled: boolean; onChoose: () => void }) {
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
        "rounded-lg border p-4 text-left shadow-card transition",
        selected ? "border-gold bg-gold/15" : disabled ? "border-white/10 bg-white/[0.04] opacity-55" : "border-emerald-300/20 bg-emerald-950/25 hover:border-electric"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <GenericBadge club={badgeClub} size={52} />
        <span className="grid h-12 min-w-12 shrink-0 place-items-center rounded-xl border border-gold/45 bg-gold/15 px-3 font-mono text-xl font-black text-gold">{coach.rating}</span>
      </div>
      <div className="mt-4 min-w-0">
        <p className="text-2xl font-black leading-tight text-white">{coach.name}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{coach.clubName} {shortSeason(coach.season)} - {tacticalStyleLabel(coach.style)}</p>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-400">{coach.description}</p>
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

function RoomBracket({
  room,
  currentPlayer,
  isHost,
  onPlayMatch,
  onProgressRound,
  onResetLobby
}: {
  room: FriendRoom;
  currentPlayer?: RoomPlayer;
  isHost: boolean;
  onPlayMatch: (playerId: string) => void;
  onProgressRound: () => void;
  onResetLobby: () => void;
}) {
  const playerMatch = currentPlayer ? currentPlayerRoomMatch(room, currentPlayer.id) : undefined;
  const pendingHumans = hasPendingHumanRoomMatches(room);
  const currentPhase = phases[room.bracketRound]?.label ?? "Mata-mata";
  const canProgressRound = room.status === "bracket" && !playerMatch && !pendingHumans;
  const [presentation, setPresentation] = useState<{ playerId: string; match: RoomMatch; events: RoomTimelineEvent[]; visible: number }>();
  const onPlayMatchRef = useRef(onPlayMatch);
  const visibleEvents = presentation?.events.slice(0, presentation.visible) ?? [];
  const lastVisibleEvent = visibleEvents.at(-1);
  const presentationHomeGoals = lastVisibleEvent?.homeGoals ?? 0;
  const presentationAwayGoals = lastVisibleEvent?.awayGoals ?? 0;

  useEffect(() => {
    if (!presentation) return;
    if (!playerMatch || playerMatch.id !== presentation.match.id) {
      setPresentation(undefined);
    }
  }, [playerMatch, presentation]);

  useEffect(() => {
    onPlayMatchRef.current = onPlayMatch;
  }, [onPlayMatch]);

  useEffect(() => {
    if (!presentation) return;
    if (presentation.visible < presentation.events.length) {
      const timer = window.setTimeout(() => {
        setPresentation((current) => (current ? { ...current, visible: current.visible + 1 } : current));
      }, 1100);
      return () => window.clearTimeout(timer);
    }
    const finish = window.setTimeout(() => {
      onPlayMatchRef.current(presentation.playerId);
      setPresentation(undefined);
    }, 900);
    return () => window.clearTimeout(finish);
  }, [presentation]);

  function startMatchPresentation() {
    if (!currentPlayer || !playerMatch || presentation) return;
    const preview = previewPlayerRoomMatch(room, currentPlayer.id);
    if (!preview) {
      onPlayMatch(currentPlayer.id);
      return;
    }
    setPresentation({ playerId: currentPlayer.id, match: preview, events: buildRoomMatchTimeline(room, preview), visible: 1 });
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Chaveamento</p>
          <h3 className="text-3xl font-black">Mata-mata da sala</h3>
        </div>
        {room.champion && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-lg border border-gold/40 bg-gold/10 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Campeao</p>
              <p className="font-black">{room.champion}</p>
            </div>
            {isHost && <Button onClick={onResetLobby}>Voltar ao lobby</Button>}
          </div>
        )}
      </div>
      {room.status === "bracket" && (
        <div className="mt-4 rounded-lg border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(4,18,43,.82),rgba(3,46,52,.5))] p-4">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Rodada atual: {currentPhase}</p>
          {presentation ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-electric/25 bg-night/70">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-xl font-black text-white">{presentation.match.homeName} x {presentation.match.awayName}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300">Simulando partida</p>
                </div>
                <span className="font-mono text-4xl font-black text-gold">{presentationHomeGoals} - {presentationAwayGoals}</span>
              </div>
              <div className="h-1.5 bg-white/10">
                <div className="h-full rounded-r-full bg-gradient-to-r from-electric to-gold transition-all" style={{ width: `${Math.min(100, (visibleEvents.at(-1)?.minute ?? 0) / 90 * 100)}%` }} />
              </div>
              <div className="grid gap-2 p-4">
                {visibleEvents.map((event, index) => (
                  <div key={`${event.minute}-${index}`} className={cn("grid grid-cols-[3rem_1fr] items-center gap-3 rounded-md border px-3 py-2 text-sm", event.text.startsWith("Gol") ? "border-gold/45 bg-gold/12 text-white" : "border-white/10 bg-white/[0.04] text-slate-300")}>
                    <span className="font-mono font-black text-sky-200">{event.minute}&apos;</span>
                    <span className="font-semibold">{event.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : playerMatch ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-2xl font-black">
                  {playerMatch.homeName} x {playerMatch.awayName}
                </p>
                <p className="mt-1 text-sm text-slate-300">A partida vai rodar minuto a minuto. Quem terminar antes aguarda os outros jogadores da rodada.</p>
              </div>
              <Button onClick={startMatchPresentation}>
                <Play size={18} /> Iniciar partida
              </Button>
            </div>
          ) : pendingHumans ? (
            <p className="mt-3 text-sm font-semibold text-slate-300">Sua partida desta rodada ja terminou ou voce foi eliminado. Aguardando os outros jogadores terminarem.</p>
          ) : canProgressRound ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-300">Todos os jogadores humanos terminaram. Prossiga para resolver os jogos restantes e abrir a proxima rodada.</p>
              <Button onClick={onProgressRound}>Prosseguir rodada</Button>
            </div>
          ) : null}
        </div>
      )}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[980px] grid-cols-[1.15fr_.95fr_.85fr_.72fr] gap-4">
          {phases.map((phase) => (
            <div key={phase.name} className="rounded-lg border border-emerald-300/10 bg-night/55 p-3">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-sky-200">{phase.label}</p>
              <div className="grid min-h-[660px]" style={{ gridTemplateRows: "repeat(16, minmax(0, 1fr))" }}>
                {room.bracket.filter((match) => match.phase === phase.name).map((match, index) => (
                  <div key={match.id} style={{ gridRow: `${bracketRowStart(phase.name, index)} / span 2` }}>
                    <RoomBracketMatch match={match} />
                  </div>
                ))}
                {room.bracket.filter((match) => match.phase === phase.name).length === 0 && (
                  <div style={{ gridRow: `${bracketRowStart(phase.name, 0)} / span 2` }}>
                    <article className="rounded-md border border-dashed border-white/12 bg-white/[0.035] px-3 py-2 text-sm font-black text-slate-500">A definir</article>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RoomBracketMatch({ match }: { match: RoomMatch }) {
  const done = match.status === "done";
  return (
    <article className={cn("rounded-md border px-3 py-2 text-sm", done ? "border-emerald-300/16 bg-white/[0.055]" : "border-gold/25 bg-gold/[0.06]")}>
      <BracketTeam name={match.homeName} goals={match.homeGoals} winner={done && match.winnerName === match.homeName} />
      <BracketTeam name={match.awayName} goals={match.awayGoals} winner={done && match.winnerName === match.awayName} last />
    </article>
  );
}

function BracketTeam({ name, goals, winner, last = false }: { name: string; goals?: number; winner: boolean; last?: boolean }) {
  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2", !last && "border-b border-white/10 pb-1.5", last && "pt-1.5", winner ? "text-white" : "text-slate-400")}>
      <TeamNameWithCrest name={name} size="sm" textClassName="font-black" showUnknown />
      <span className="text-right font-mono font-black text-gold">{typeof goals === "number" ? goals : "-"}</span>
    </div>
  );
}

function buildRoomMatchTimeline(room: FriendRoom, match: RoomMatch): RoomTimelineEvent[] {
  const timelineItems: Array<{ minute: number; teamName: string; text: string; side?: "home" | "away" }> = [
    { minute: 0, teamName: "", text: "Bola rolando" }
  ];
  let homeGoals = 0;
  let awayGoals = 0;
  const goalEvents = [
    ...Array.from({ length: match.homeGoals ?? 0 }, (_, index) => ({ teamName: match.homeName, order: index, side: "home" as const })),
    ...Array.from({ length: match.awayGoals ?? 0 }, (_, index) => ({ teamName: match.awayName, order: index, side: "away" as const }))
  ].sort((a, b) => `${a.teamName}-${a.order}`.localeCompare(`${b.teamName}-${b.order}`));
  const goalMinutes = spreadGoalMinutes(goalEvents.length);
  goalEvents.forEach((goal, index) => {
    const scorerName = roomGoalScorer(room, match, goal.side, goal.order);
    timelineItems.push({
      minute: goalMinutes[index] ?? 88,
      teamName: goal.teamName,
      text: `Gol do ${goal.teamName}: ${scorerName}`,
      side: goal.side
    });
  });
  timelineItems.push({ minute: 45, teamName: "", text: "Intervalo" });
  timelineItems.push({ minute: 90, teamName: "", text: "Fim de jogo" });

  return timelineItems
    .sort((a, b) => a.minute - b.minute || goalTextOrder(a.text) - goalTextOrder(b.text))
    .map((event) => {
      if (event.side === "home") homeGoals += 1;
      if (event.side === "away") awayGoals += 1;
      return {
        minute: event.minute,
        teamName: event.teamName,
        text: event.text,
        homeGoals,
        awayGoals
      };
    });
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

function PlayerLobbyList({ players }: { players: RoomPlayer[] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <div className="min-w-[780px] overflow-hidden rounded-lg border border-white/10">
        <div className="grid grid-cols-[5.5rem_1fr_1.2fr_7rem_8rem_7rem] bg-white/[0.06] px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          <span>ID</span>
          <span>Nome</span>
          <span>Time</span>
          <span>Formacao</span>
          <span>Tatica</span>
          <span>Status</span>
        </div>
        {players.map((player, index) => (
          <div key={player.id} className="grid grid-cols-[5.5rem_1fr_1.2fr_7rem_8rem_7rem] items-center border-t border-white/10 px-3 py-3 text-sm">
            <span className="font-mono font-black text-gold">#{index + 1} {shortPlayerId(player.id)}</span>
            <span className="truncate font-black text-white">{player.userName}</span>
            <span className="truncate text-slate-200">{player.teamName}</span>
            <span className="font-bold text-slate-300">{player.formation}</span>
            <span className="font-bold text-slate-300">{tacticalStyleLabel(player.tacticalStyle)}</span>
            <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-black", player.ready ? "bg-emerald-300 text-night" : "border border-white/15 text-slate-300")}>
              {player.ready ? "Pronto" : "Aguardando"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerSetupPanel({ player, onReady, onSetup }: { player: RoomPlayer; onReady: (playerId: string, ready: boolean) => void; onSetup: (playerId: string, setup: { formation?: string; tacticalStyle?: TacticalStyle }) => void }) {
  return (
    <article className="rounded-lg border border-emerald-300/16 bg-[linear-gradient(135deg,rgba(4,18,43,.78),rgba(3,46,52,.42))] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Sua preparacao</p>
          <h3 className="mt-1 text-2xl font-black">{player.teamName}</h3>
          <p className="text-sm text-slate-400">{player.userName}</p>
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
      <RoomFormationPreview formation={player.formation} tacticalStyle={player.tacticalStyle} />
    </article>
  );
}

function RoomFormationPreview({ formation, tacticalStyle }: { formation: string; tacticalStyle: TacticalStyle }) {
  const slots = getFormationSlots(formation, tacticalStyle);
  return (
    <div className="mt-4 rounded-lg border border-emerald-300/18 bg-emerald-950/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-300/80">Previa da escalação</p>
        <span className="text-xs font-black text-slate-300">{formation} - {tacticalStyleLabel(tacticalStyle)}</span>
      </div>
      <div className="relative mx-auto aspect-[7/10] max-h-[360px] min-h-[280px] overflow-hidden rounded-md border border-white/15 field-lines">
        <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        {slots.map((slot) => (
          <span
            key={slot.id}
            className="absolute grid h-9 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded border border-dashed border-emerald-300/45 bg-night/70 text-[9px] font-black text-emerald-100"
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
    <article className="rounded-lg border border-gold/20 bg-gold/10 p-4">
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
        {[20, 30, 45].map((value) => (
          <SegmentButton key={value} active={room.turnSeconds === value} onClick={() => onChange({ turnSeconds: value as 20 | 30 | 45, draftMode: "turnos" })}>{value}s</SegmentButton>
        ))}
      </ControlBlock>
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
        active ? "border-danger bg-danger text-white shadow-[0_0_18px_rgba(239,68,68,.18)]" : "border-emerald-300/20 bg-night/70 text-white hover:border-electric"
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
    "rounded-full px-3 py-3 text-sm font-black transition",
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
  return mode === "todos" ? "por turnos" : "por turnos";
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
  const reference = Date.parse(room.updatedAt || room.createdAt);
  if (!Number.isFinite(reference)) return true;
  return Date.now() - reference < 60 * 60 * 1000;
}

function samePlayer(player: RoomPlayer, userName: string, teamName: string) {
  return sameText(player.userName, userName) || sameText(player.teamName, teamName);
}

function sameText(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function roomStatusLabel(status: FriendRoom["status"]) {
  return {
    lobby: "Lobby",
    drafting: "Draft",
    reviewing: "Ajustes",
    coach: "Tecnico",
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
