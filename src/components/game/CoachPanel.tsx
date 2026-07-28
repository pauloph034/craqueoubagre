"use client";

import { TeamCrest } from "@/components/game/TeamCrest";
import { Button } from "@/components/ui/button";
import { getFootballTeamByName } from "@/data/football-clubs";
import { useGameStore } from "@/stores/game-store";
import { Shuffle, UserCheck } from "lucide-react";

export function CoachPanel() {
  const options = useGameStore((state) => state.coachOptions);
  const drawCoach = useGameStore((state) => state.drawCoach);
  const coachDrawCount = useGameStore((state) => state.coachDrawCount);
  const confirmCoach = useGameStore((state) => state.confirmCoach);
  const hasOptions = options.length > 0;

  return (
    <section className="editorial-panel p-4 sm:p-5">
      <p className="editorial-kicker">02 · Última escolha</p>
      <h1 className="editorial-page-title mt-2">Escolha o técnico</h1>
      <p className="editorial-muted mt-2">Sorteie uma vez e escolha 1 entre 3 técnicos históricos.</p>

      {hasOptions ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {options.map((coach) => (
            <article key={coach.id} className="flex min-h-[210px] flex-col border border-black/20 bg-white p-3 transition hover:border-[var(--accent)]">
              <div className="flex items-center justify-between gap-4">
                <TeamCrest src={getFootballTeamByName(coach.clubName)?.logo} teamName={coach.clubName} pixelSize={44} />
                <div className="grid h-10 min-w-10 shrink-0 place-items-center border border-black bg-[var(--background)] px-2 font-display text-lg font-black text-black">{coach.rating}</div>
              </div>
              <div className="mt-4 min-w-0">
                <h2 className="font-display text-xl font-black uppercase leading-tight text-black">{coach.name}</h2>
                <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{coach.clubName} {coach.season}</p>
              </div>
              <p className="mt-3 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{coach.description}</p>
              <Button className="mt-auto min-h-9 w-full" onClick={() => confirmCoach(coach.id)}>
                <UserCheck size={18} /> Escolher tecnico
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-black/35 p-5 text-[var(--muted)]">
          Nenhum técnico sorteado ainda.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={drawCoach} disabled={coachDrawCount >= 1}>
          <Shuffle size={18} /> {coachDrawCount >= 1 ? "Sorteio usado" : "Sortear 3 tecnicos"}
        </Button>
      </div>
    </section>
  );
}
