"use client";

import { AdBanner } from "@/components/AdBanner";
import { TeamCrest } from "@/components/game/TeamCrest";
import { getFormationSlots } from "@/config/formations";
import { getFootballTeamByClubId, getFootballTeamByName } from "@/data/football-clubs";
import { useGameStore, useTeamMetrics } from "@/stores/game-store";
import { cn } from "@/lib/utils";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { positionLabel } from "@/game-engine/position-labels";

export function SquadField() {
  const formation = useGameStore((state) => state.config.formation);
  const tacticalStyle = useGameStore((state) => state.config.tacticalStyle);
  const squad = useGameStore((state) => state.squad);
  const selectedSlotId = useGameStore((state) => state.selectedSlotId);
  const selectSlot = useGameStore((state) => state.selectSlot);
  const swapSlot = useGameStore((state) => state.swapSlot);
  const placePendingPlayer = useGameStore((state) => state.placePendingPlayer);
  const phase = useGameStore((state) => state.phase);
  const hidden = useGameStore((state) => state.config.difficulty === "lenda" && state.phase === "drafting");
  const pendingPlayer = useGameStore((state) => state.currentDraw?.options.find((player) => player.id === state.pendingPlayerId));
  const metrics = useTeamMetrics();
  const ratingValue = hidden && squad.length < 11 ? "--" : metrics.rating;
  const slots = getFormationSlots(formation, tacticalStyle);
  return (
    <section className="rounded-lg border border-white/12 bg-emerald-950/35 p-3 shadow-card">
      <div className="mb-3 rounded-md border border-white/10 bg-night/65 px-4 py-3 shadow-glow">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex items-baseline gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gold">Rating</span>
            <span className="font-mono text-4xl font-black leading-none text-white drop-shadow-[0_0_12px_rgba(247,201,72,.28)]">{ratingValue}</span>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Entrosamento</span>
              <span className="font-mono text-sm font-black text-white">{metrics.chemistry}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-electric to-gold transition-all" style={{ width: `${metrics.chemistry}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-full border border-electric/25 bg-electric/10 px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-electric">Elenco</span>
            <span className="font-mono text-xl font-black text-white">{squad.length}<span className="text-sm text-slate-400">/11</span></span>
          </div>
        </div>
      </div>
      <div className="relative mx-auto aspect-[7/10] max-h-[680px] min-h-[480px] overflow-hidden rounded-md border border-white/20 field-lines">
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
        {slots.map((slot) => {
          const pick = squad.find((item) => item.slotId === slot.id);
          const pickTeam = pick ? getFootballTeamByClubId(pick.clubSeason.clubId) ?? getFootballTeamByName(pick.clubSeason.clubName) : undefined;
          const pendingFit = pendingPlayer && !pick ? calculatePositionFit(pendingPlayer, slot.position) : undefined;
          const canPlacePending = Boolean(pendingFit?.allowed);
          return (
            <button
              key={slot.id}
              data-testid={canPlacePending ? "field-position-option" : undefined}
              type="button"
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 border text-center text-[11px] font-bold shadow-card transition",
                pick ? "grid h-[4.5rem] w-[4.5rem] place-items-center rounded-full border-electric bg-night/95 px-2 text-white ring-1 ring-electric/35" : "grid h-12 w-16 place-items-center rounded-md border-dashed border-white/40 bg-white/10 px-2 text-slate-200",
                canPlacePending && "border-gold bg-gold/20 text-white ring-2 ring-gold hover:bg-gold/30",
                pendingPlayer && !canPlacePending && !pick && "opacity-35",
                selectedSlotId === slot.id && "ring-2 ring-gold"
              )}
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              onClick={() => {
                if (pendingPlayer && canPlacePending) placePendingPlayer(slot.id);
                else if (pick && phase === "drafting") swapSlot(slot.id);
              }}
              aria-label={pick ? `${pick.player.name} em ${slot.label}` : canPlacePending ? `Colocar ${pendingPlayer?.name} em ${slot.label}` : `Vaga ${slot.label}`}
            >
              {pick ? (
                <>
                  {pickTeam && (
                    <span className="absolute left-1 top-0">
                      <TeamCrest src={pickTeam.logo} teamName={pickTeam.name} pixelSize={31} />
                    </span>
                  )}
                  <span className="mt-6 max-w-[4.15rem] truncate text-[10px] leading-tight">{pick.player.shortName}</span>
                  <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full border border-gold/80 bg-gold font-mono text-[11px] font-black text-night shadow-[0_0_16px_rgba(248,198,48,.35)]">
                    {hidden ? "--" : pick.effectiveRating}
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
      <div className="mt-4">
        <AdBanner compact />
      </div>
      <div className="mt-4 grid gap-2 md:hidden">
        {slots.map((slot) => {
          const pick = squad.find((item) => item.slotId === slot.id);
          const pendingFit = pendingPlayer && !pick ? calculatePositionFit(pendingPlayer, slot.position) : undefined;
          const canPlacePending = Boolean(pendingFit?.allowed);
          return <button key={slot.id} className={cn("rounded border border-white/10 p-2 text-left text-sm", canPlacePending && "border-gold bg-gold/15")} onClick={() => (canPlacePending ? placePendingPlayer(slot.id) : pick ? selectSlot(slot.id) : undefined)}>{slot.label}: {pick?.player.name ?? (canPlacePending ? `Disponivel (${positionLabel(slot.position)})` : "Vazio")}</button>;
        })}
      </div>
    </section>
  );
}
