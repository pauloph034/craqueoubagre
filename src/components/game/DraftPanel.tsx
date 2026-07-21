"use client";

import { GenericBadge } from "@/components/game/GenericBadge";
import { Button } from "@/components/ui/button";
import { difficultyRules } from "@/config/game-balance";
import { clubSeasons } from "@/data/loaders";
import { positionLabel } from "@/game-engine/position-labels";
import { useGameStore } from "@/stores/game-store";
import type { Player } from "@/types/game";
import { Dices } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function DraftPanel() {
  const state = useGameStore();
  const pendingPlayer = state.currentDraw?.options.find((player) => player.id === state.pendingPlayerId);
  const canConfirm = state.squad.length === 11;
  const hidden = difficultyRules[state.config.difficulty].hideRatings;
  const [isDrawing, setIsDrawing] = useState(false);
  const [rollingIndex, setRollingIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const rollingClub = useMemo(() => clubSeasons[rollingIndex % clubSeasons.length], [rollingIndex]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  function runDrawAnimation(action: () => void) {
    if (isDrawing) return;
    setIsDrawing(true);
    setRollingIndex((value) => value + 1);
    intervalRef.current = window.setInterval(() => {
      setRollingIndex((value) => value + 1 + Math.floor(Math.random() * 3));
    }, 115);
    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      action();
      setIsDrawing(false);
    }, 1000);
  }

  if (canConfirm) {
    return (
      <aside className="space-y-4">
        <div className="rounded-2xl border border-gold/30 bg-gold/10 p-5 shadow-card">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Elenco completo</p>
          <p className="mt-2 text-sm text-slate-200">Os 11 jogadores ja foram escolhidos. Agora escolha o tecnico para iniciar a campanha.</p>
        </div>
        <Button className="w-full" onClick={state.confirmSquad}>
          Escolher tecnico
        </Button>
      </aside>
    );
  }

  return (
    <aside className="space-y-4 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-hidden">
      <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 shadow-card">
        <div className="grid gap-3">
          <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            <span>{state.config.formation}</span>
            <span>{state.config.difficulty}</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded border border-white/10 bg-night/60 px-3 py-2 text-xs text-slate-300">
            <span>Rerolls: <strong className="text-white">{state.rerollsLeft}</strong></span>
            <span>Trocas: <strong className="text-white">{state.swapsLeft}</strong></span>
          </div>
          <Button className="w-full" onClick={() => runDrawAnimation(() => (state.currentDraw ? state.reroll() : state.drawForSlot()))} disabled={isDrawing || Boolean(state.currentDraw && state.rerollsLeft <= 0)}>
            <Dices size={18} /> Sortear time
          </Button>
        </div>
      </div>

      {isDrawing && rollingClub ? (
        <div className="overflow-hidden rounded-lg border border-gold/40 bg-white/[0.07] shadow-card">
          <div
            className="flex min-h-32 items-center gap-4 border-b border-white/10 p-4"
            style={{
              background: `linear-gradient(135deg, ${rollingClub.primaryColor}44, rgba(7, 24, 50, .9) 48%, ${rollingClub.secondaryColor}30)`
            }}
          >
            <GenericBadge club={rollingClub} size={76} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gold">Sorteio em movimento</p>
              <h3 className="text-2xl font-black">{rollingClub.clubName} {rollingClub.season}</h3>
              <p className="text-sm text-slate-300">{rollingClub.country}</p>
            </div>
          </div>
        </div>
      ) : state.currentDraw ? (
        <div className="overflow-hidden rounded-2xl border border-white/12 bg-white/[0.07] shadow-card">
          <div
            className="flex items-center gap-4 border-b border-white/10 p-4"
            style={{
              background: `linear-gradient(135deg, ${state.currentDraw.clubSeason.primaryColor}33, rgba(7, 24, 50, .86) 48%, ${state.currentDraw.clubSeason.secondaryColor}24)`
            }}
          >
            <GenericBadge club={state.currentDraw.clubSeason} size={76} />
            <div>
              <p className="text-xs uppercase text-gold">{state.currentDraw.clubSeason.rarity}</p>
              <h3 className="text-xl font-black">{state.currentDraw.clubSeason.clubName} {state.currentDraw.clubSeason.season}</h3>
              <p className="text-sm text-slate-300">{state.currentDraw.clubSeason.competitionStage} - {state.currentDraw.clubSeason.country}</p>
            </div>
          </div>
          <p className="px-4 pt-3 text-sm text-mint">
            {state.currentDraw.options.length} jogadores disponiveis
          </p>
          {pendingPlayer && (
            <div className="mx-4 mt-4 rounded-md border border-gold/30 bg-gold/10 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-gold">Selecionado</p>
              <p className="mt-1 truncate text-lg font-black text-white">{pendingPlayer.name}</p>
            </div>
          )}
          <div className="m-4 rounded-2xl border border-emerald-400/25 bg-emerald-950/25">
            <div className="border-b border-emerald-400/20 px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Elenco</p>
            </div>
            <div className="game-scrollbar max-h-[min(430px,calc(100vh-25rem))] overflow-y-auto">
              {state.currentDraw.roster
                .slice()
                .sort((a, b) => Number(!state.currentDraw!.options.some((p) => p.id === a.id)) - Number(!state.currentDraw!.options.some((p) => p.id === b.id)) || positionOrder(a.primaryPosition) - positionOrder(b.primaryPosition) || (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99))
                .map((player) => (
                  <PlayerListRow
                    key={player.id}
                    player={player}
                    hidden={hidden}
                    active={state.pendingPlayerId === player.id}
                    eligible={state.currentDraw!.options.some((option) => option.id === player.id)}
                    alreadyPicked={state.squad.some((pick) => pick.player.canonicalPlayerId === player.canonicalPlayerId)}
                    onChoose={() => state.choosePlayer(player.id)}
                  />
                ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/12 bg-white/[0.05] p-6 text-slate-300">
          Nenhum time sorteado.
        </div>
      )}

    </aside>
  );
}

function positionOrder(position: Player["primaryPosition"]) {
  const order: Player["primaryPosition"][] = ["GK", "RB", "RWB", "CB", "LB", "LWB", "DM", "CM", "MEI", "RM", "LM", "RW", "LW", "CF", "ST"];
  return order.indexOf(position);
}

function PlayerListRow({
  player,
  hidden,
  active,
  eligible,
  alreadyPicked,
  onChoose
}: {
  player: Player;
  hidden?: boolean;
  active: boolean;
  eligible: boolean;
  alreadyPicked: boolean;
  onChoose: () => void;
}) {
  const blocked = !eligible || alreadyPicked;
  return (
    <div className={blocked ? "grid grid-cols-[3rem_minmax(0,1fr)_4.25rem_5.75rem] items-center gap-3 border-b border-emerald-400/10 px-4 py-3 text-sm opacity-45" : active ? "grid grid-cols-[3rem_minmax(0,1fr)_4.25rem_5.75rem] items-center gap-3 border-b border-gold bg-gold/15 px-4 py-3 text-sm" : "grid grid-cols-[3rem_minmax(0,1fr)_4.25rem_5.75rem] items-center gap-3 border-b border-emerald-400/10 bg-emerald-400/[0.06] px-4 py-3 text-sm"}>
      <span className="font-mono text-emerald-300">#{player.shirtNumber ?? "--"}</span>
      <div className="min-w-0">
        <p className="truncate font-black text-white">{player.name}</p>
        <p className="truncate text-xs text-slate-400">
          {player.nationality}
        </p>
      </div>
      <span className="justify-self-center rounded-full border border-emerald-300/15 bg-night/45 px-2 py-1 font-mono text-[11px] font-black text-emerald-300">{positionLabel(player.primaryPosition)}</span>
      <div className="flex items-center justify-end gap-2">
        <span className="w-10 text-right font-mono text-lg font-black text-gold tabular-nums">{hidden ? "--" : player.overall}</span>
        <Button data-testid="choose-player" className="min-h-9 px-3 py-1 text-xs" variant={blocked ? "secondary" : "primary"} onClick={onChoose} disabled={blocked}>
          {alreadyPicked ? "XI" : eligible ? "Escolher" : "--"}
        </Button>
      </div>
    </div>
  );
}
