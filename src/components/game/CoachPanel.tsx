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
    <section className="rounded-lg border border-white/12 bg-white/[0.07] p-6 shadow-card">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-gold">Ultima escolha</p>
      <h1 className="mt-2 text-3xl font-black">Escolha o tecnico</h1>
      <p className="mt-2 text-slate-300">Sorteie uma vez e escolha 1 entre 3 tecnicos historicos.</p>

      {hasOptions ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {options.map((coach) => (
            <article key={coach.id} className="flex min-h-[278px] flex-col rounded-lg border border-gold/25 bg-night/70 p-5 shadow-card">
              <div className="flex items-center justify-between gap-4">
                <TeamCrest src={getFootballTeamByName(coach.clubName)?.logo} teamName={coach.clubName} pixelSize={44} />
                <div className="grid h-12 min-w-12 shrink-0 place-items-center rounded-xl border border-gold/45 bg-gold/15 px-3 font-mono text-xl font-black text-gold">{coach.rating}</div>
              </div>
              <div className="mt-4 min-w-0">
                <h2 className="text-2xl font-black leading-tight text-white">{coach.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{coach.clubName} {coach.season}</p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{coach.description}</p>
              <Button className="mt-auto w-full" onClick={() => confirmCoach(coach.id)}>
                <UserCheck size={18} /> Escolher tecnico
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-md border border-dashed border-white/15 p-5 text-slate-300">
          Nenhum tecnico sorteado ainda.
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
