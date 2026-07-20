"use client";

import { Button } from "@/components/ui/button";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { positionLabel } from "@/game-engine/position-labels";
import type { Player, Position } from "@/types/game";

export function PlayerCard({ player, slot, hidden, selected, onChoose }: { player: Player; slot: Position; hidden?: boolean; selected?: boolean; onChoose: () => void }) {
  const fit = calculatePositionFit(player, slot);
  return (
    <article className="min-w-64 rounded-lg border border-white/12 bg-white/[0.07] p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-slate-400">{player.nationality} - {positionLabel(player.primaryPosition)}</p>
          <h3 className="text-lg font-black text-white">{player.name}</h3>
          <p className="text-sm text-slate-300">{player.description}</p>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-night text-xl font-black text-electric">{player.shortName.slice(-2)}</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        {hidden ? (
          <div className="col-span-3 rounded bg-white/10 p-3 text-slate-300">Rating oculto no modo Lenda</div>
        ) : (
          <>
            <Stat label="GER" value={player.overall} />
            <Stat label="RIT" value={player.pace} />
            <Stat label="PAS" value={player.passing} />
            <Stat label="FIN" value={player.shooting} />
            <Stat label="DRI" value={player.dribbling} />
            <Stat label="DEF" value={player.defending} />
          </>
        )}
      </div>
      {!hidden && <p className="mt-3 text-sm text-mint">{fit.reason}: {fit.effectiveRating}</p>}
      <Button className="mt-4 w-full" onClick={onChoose} disabled={!fit.allowed || selected}>
        {selected ? "Ja escolhido" : "Confirmar escolha"}
      </Button>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-night/70 p-2">
      <div className="font-black text-white">{value}</div>
      <div className="text-slate-400">{label}</div>
    </div>
  );
}
