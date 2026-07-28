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
    <section className="border border-sky-300/12 bg-black/30 p-4 sm:p-5">
      <p className="text-sm font-black uppercase tracking-[0.2em] text-gold">Ultima escolha</p>
      <h1 className="mt-1 text-2xl font-black">Escolha o tecnico</h1>
      <p className="mt-2 text-slate-300">Sorteie uma vez e escolha 1 entre 3 tecnicos historicos.</p>

      {hasOptions ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {options.map((coach) => (
            <article key={coach.id} className="flex min-h-[250px] flex-col border border-white/[0.09] bg-white/[0.025] p-4 transition hover:border-gold/35">
              <div className="flex items-center justify-between gap-4">
                <TeamCrest src={getFootballTeamByName(coach.clubName)?.logo} teamName={coach.clubName} pixelSize={44} />
                <div className="grid h-10 min-w-10 shrink-0 place-items-center border border-gold/35 bg-gold/10 px-2 font-mono text-lg font-black text-gold">{coach.rating}</div>
              </div>
              <div className="mt-4 min-w-0">
                <h2 className="text-xl font-black leading-tight text-white">{coach.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{coach.clubName} {coach.season}</p>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{coach.description}</p>
              <Button className="mt-auto min-h-11 w-full" onClick={() => confirmCoach(coach.id)}>
                <UserCheck size={18} /> Escolher tecnico
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 border border-dashed border-white/15 p-5 text-slate-300">
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
