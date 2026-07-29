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

export function DraftPanel({
  onComplete,
  completeLabel = "Escolher técnico",
  completeDescription = "Os 11 jogadores já foram escolhidos. Agora escolha o técnico para iniciar a campanha.",
  completing = false
}: {
  onComplete?: () => void;
  completeLabel?: string;
  completeDescription?: string;
  completing?: boolean;
} = {}) {
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
      <aside className="editorial-panel space-y-3 p-4">
        <div className="border-b border-black/20 pb-4">
          <p className="editorial-kicker">Elenco completo</p>
          <p className="editorial-muted mt-2">{completeDescription}</p>
        </div>
        <Button className="min-h-14 w-full text-base" onClick={onComplete ?? state.confirmSquad} disabled={completing}>
          {completing ? "Preparando temporada..." : completeLabel}
        </Button>
      </aside>
    );
  }

  return (
    <aside className="space-y-3 xl:sticky xl:top-[70px]">
      <div className="border border-black bg-[var(--surface)] p-2.5">
        <div className="flex items-center gap-3">
          <span className="whitespace-nowrap px-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
            {state.rerollsLeft} de 3 restantes
          </span>
          <Button className="min-h-10 flex-1 text-xs" onClick={() => runDrawAnimation(() => (state.currentDraw ? state.reroll() : state.drawForSlot()))} disabled={isDrawing || Boolean(state.currentDraw && state.rerollsLeft <= 0)}>
            <Dices size={18} /> Sortear time
          </Button>
        </div>
      </div>

      {isDrawing && rollingClub ? (
        <div className="overflow-hidden border border-black bg-[var(--surface)]">
          <div
            className="flex min-h-24 items-center gap-4 border-b border-black bg-[var(--accent)] p-4"
          >
            <GenericBadge club={rollingClub} size={62} />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black">Sorteio em movimento</p>
              <h3 className="font-display text-2xl font-black uppercase text-black">{rollingClub.clubName} {rollingClub.season}</h3>
              <p className="text-xs text-black/70">{rollingClub.country}</p>
            </div>
          </div>
        </div>
      ) : state.currentDraw ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-black bg-[var(--surface)]">
          <div
            className="flex items-center gap-4 border-b border-black bg-[var(--surface-muted)] p-3"
          >
            <GenericBadge club={state.currentDraw.clubSeason} size={56} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gold">{state.currentDraw.clubSeason.rarity}</p>
              <h3 className="truncate font-display text-xl font-black uppercase text-black">{state.currentDraw.clubSeason.clubName} {state.currentDraw.clubSeason.season}</h3>
              <p className="truncate text-[11px] text-[var(--muted)]">{state.currentDraw.clubSeason.competitionStage} · {state.currentDraw.clubSeason.country}</p>
            </div>
          </div>
          <p className="border-b border-black/15 px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--success)]">
            {state.currentDraw.options.length} jogadores disponíveis
          </p>
          {pendingPlayer && (
            <div className="draft-selection-banner mx-3 mt-3 border border-black bg-black px-3 py-2.5">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--success)]">Selecionado</p>
              <p className="mt-1 truncate text-sm font-black text-white">{pendingPlayer.name}</p>
            </div>
          )}
          <div className="m-3 min-h-0 flex-1 border border-black/20 bg-transparent">
            <div className="border-b border-black/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black">Elenco</p>
            </div>
            <div className="game-scrollbar min-h-[240px] max-h-[min(560px,65dvh)] touch-pan-y overflow-y-auto overscroll-contain">
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
        <div className="border border-dashed border-black/40 bg-white p-6 text-[var(--muted)]">
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
    <div className={blocked ? "grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_3.25rem_2.5rem_4.8rem] items-center gap-2 border-b border-black/10 px-3 py-1.5 text-xs opacity-35" : active ? "grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_3.25rem_2.5rem_4.8rem] items-center gap-2 border-b border-[var(--accent)] bg-[var(--accent)]/10 px-3 py-1.5 text-xs" : "grid min-h-14 grid-cols-[2rem_minmax(0,1fr)_3.25rem_2.5rem_4.8rem] items-center gap-2 border-b border-black/10 px-3 py-1.5 text-xs hover:bg-black/[0.035]"}>
      <span className="font-mono text-[var(--success)]">#{player.shirtNumber ?? "--"}</span>
      <div className="min-w-0">
        <p className="truncate font-black text-black">{player.name}</p>
        <p className="truncate text-[10px] text-[var(--muted)]">
          {player.nationality}
        </p>
      </div>
      <span className="justify-self-center border border-black/20 bg-white px-1.5 py-1 font-mono text-[9px] font-black text-[var(--success)]">{positionLabel(player.primaryPosition)}</span>
      <span className="justify-self-end font-display text-lg font-black text-[var(--warning)] tabular-nums">{hidden ? "--" : player.overall}</span>
      <div className="flex justify-end">
        <Button data-testid="choose-player" className="min-h-8 w-full px-2 py-1 text-[11px]" variant={blocked ? "secondary" : "primary"} onClick={onChoose} disabled={blocked}>
          {alreadyPicked ? "XI" : eligible ? "Escolher" : "--"}
        </Button>
      </div>
    </div>
  );
}
