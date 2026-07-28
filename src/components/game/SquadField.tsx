"use client";

import { getFormationSlots } from "@/config/formations";
import { useGameStore, useTeamMetrics } from "@/stores/game-store";
import { cn } from "@/lib/utils";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { positionLabel } from "@/game-engine/position-labels";
import { NationalityFlag } from "@/components/game/NationalityFlag";
import { SoccerFieldMarkings } from "@/components/game/SoccerFieldMarkings";

export function SquadField({ showMetrics = true }: { showMetrics?: boolean }) {
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
    <section className="border border-black bg-[var(--surface)] p-3">
      {showMetrics && <div className="mb-3 border border-black/20 bg-[var(--surface-muted)] px-3 py-2">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr_auto]">
          <div className="flex items-baseline gap-3">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Rating</span>
            <span className="font-display text-3xl font-black leading-none text-black">{ratingValue}</span>
          </div>
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Entrosamento</span>
              <span className="font-display text-sm font-black text-black">{metrics.chemistry}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden bg-black/10">
              <div className="h-full bg-[var(--success)] transition-all" style={{ width: `${metrics.chemistry}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-l border-black/20 px-3 py-1">
            <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">Elenco</span>
            <span className="font-display text-xl font-black text-black">{squad.length}<span className="text-sm text-[var(--muted)]">/11</span></span>
          </div>
        </div>
      </div>}
      <div className="relative mx-auto aspect-[7/10] max-h-[calc(100dvh-7.8rem)] min-h-[390px] overflow-hidden border border-black field-lines sm:min-h-[500px] xl:min-h-0">
        <SoccerFieldMarkings />
        {slots.map((slot) => {
          const pick = squad.find((item) => item.slotId === slot.id);
          const pendingFit = pendingPlayer && !pick ? calculatePositionFit(pendingPlayer, slot.position) : undefined;
          const canPlacePending = Boolean(pendingFit?.allowed);
          return (
            <button
              key={slot.id}
              data-testid={canPlacePending ? "field-position-option" : undefined}
              type="button"
              className={cn(
                "absolute z-10 -translate-x-1/2 -translate-y-1/2 border text-center text-[11px] font-bold shadow-card transition",
                pick ? "grid h-[4rem] w-[4rem] place-items-center rounded-full border-white bg-black/95 px-2 text-white" : "grid h-10 w-14 place-items-center rounded-sm border-dashed border-white/55 bg-black/30 px-2 text-white",
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
                  <NationalityFlag
                    nationality={pick.player.nationality}
                    className="absolute left-1/2 top-1.5 w-6 -translate-x-1/2"
                  />
                  <span className="mt-5 max-w-[3.5rem] truncate px-0.5 text-[9px] leading-tight">{pick.player.shortName}</span>
                  <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-black bg-[var(--background)] font-display text-[11px] font-black text-black">
                    {hidden ? "--" : pick.effectiveRating}
                  </span>
                  <span className="absolute -bottom-3 border border-black bg-[var(--background)] px-2 py-0.5 text-[8px] font-black text-black">{slot.label}</span>
                </>
              ) : (
                <span>{slot.label}</span>
              )}
            </button>
          );
        })}
      </div>
      <details className="mt-3 border border-black/20 md:hidden">
        <summary className="cursor-pointer px-3 py-2 text-xs font-black uppercase">Lista da escalação</summary>
        <div className="grid gap-px border-t border-black/20 bg-black/20">
        {slots.map((slot) => {
          const pick = squad.find((item) => item.slotId === slot.id);
          const pendingFit = pendingPlayer && !pick ? calculatePositionFit(pendingPlayer, slot.position) : undefined;
          const canPlacePending = Boolean(pendingFit?.allowed);
          return <button key={slot.id} className={cn("bg-white p-2 text-left text-xs", canPlacePending && "bg-[var(--accent)] text-white")} onClick={() => (canPlacePending ? placePendingPlayer(slot.id) : pick ? selectSlot(slot.id) : undefined)}>{slot.label}: {pick?.player.name ?? (canPlacePending ? `Disponível (${positionLabel(slot.position)})` : "Vazio")}</button>;
        })}
        </div>
      </details>
    </section>
  );
}
