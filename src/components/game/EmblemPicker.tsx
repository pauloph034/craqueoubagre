"use client";

import { TeamEmblem } from "@/components/game/TeamEmblem";
import { teamEmblems } from "@/data/team-emblems";
import { cn } from "@/lib/utils";

export function EmblemPicker({ value, teamName, onChange }: { value: string; teamName: string; onChange: (id: string) => void }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-200">Escudo do time</legend>
      <p className="mt-1 text-xs text-slate-400">Escolha uma identidade para aparecer nas partidas e no chaveamento.</p>
      <div className="game-scrollbar mt-3 grid max-h-52 grid-cols-5 gap-2 overflow-y-auto pr-1 sm:grid-cols-6">
        {teamEmblems.map((emblem, index) => (
          <button
            key={emblem.id}
            type="button"
            aria-label={`Escolher escudo ${index + 1}`}
            aria-pressed={value === emblem.id}
            className={cn("grid min-h-14 place-items-center border bg-white/[0.025] transition", value === emblem.id ? "border-electric bg-electric/12 ring-2 ring-electric/35" : "border-white/10 hover:border-white/30")}
            onClick={() => onChange(emblem.id)}
          >
            <TeamEmblem emblemId={emblem.id} teamName={teamName || "Meu time"} size={38} />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
