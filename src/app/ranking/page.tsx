"use client";

import { TeamEmblem } from "@/components/game/TeamEmblem";
import type { RankingEntry } from "@/types/game";
import { Award, Shield, Star } from "lucide-react";
import { useEffect, useState } from "react";

export default function RankingPage() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rankings", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { rankings?: RankingEntry[] }) => setEntries(data.rankings ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="border-b border-white/10 pb-6">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Competicao</p>
        <h1 className="mt-2 text-3xl font-black md:text-4xl">Ranking dos jogadores</h1>
        <p className="mt-2 text-sm text-slate-400">A classificacao geral destaca desempenho, evolucao e conquistas do clube.</p>
      </header>

      <section className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-night/75">
        {loading && <p className="p-6 text-sm text-slate-400">Carregando classificacao...</p>}
        {!loading && entries.length === 0 && <p className="p-6 text-sm text-slate-400">Ainda nao existem campanhas classificadas.</p>}
        {entries.map((entry, index) => (
          <article key={`${entry.username}-${entry.teamName}-${index}`} className="grid grid-cols-[32px_48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-white/[0.07] px-4 py-4 last:border-0">
            <div className={`grid h-8 w-8 place-items-center rounded-full text-sm font-black ${index === 0 ? "bg-gold text-night" : index < 3 ? "bg-white/10 text-white" : "text-slate-500"}`}>
              {index + 1}
            </div>
            <TeamEmblem emblemId={entry.emblemId} teamName={entry.teamName} size={42} />
            <div className="min-w-0">
              <p className="truncate font-black text-white">{entry.teamName}</p>
              <p className="truncate text-xs text-slate-400">Usuario {entry.username} - Nivel {entry.progression.level} {entry.progression.levelName}</p>
            </div>
            <div className="flex min-w-[112px] justify-end gap-4 text-right">
              <RankingValue icon={Shield} value={entry.progression.competitiveRating} label="rating" />
              <RankingValue icon={Star} value={entry.progression.xp} label="XP" />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function RankingValue({ icon: Icon, value, label }: { icon: typeof Award; value: number; label: string }) {
  return (
    <div>
      <p className="flex items-center justify-end gap-1 font-mono text-sm font-black text-white"><Icon className="h-3.5 w-3.5 text-gold" /> {value.toLocaleString("pt-BR")}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}
