"use client";

import { TeamEmblem } from "@/components/game/TeamEmblem";
import { EditorialPageHeader, EmptyState } from "@/components/ui/editorial";
import type { RankingEntry } from "@/types/game";
import { Award, Star, Trophy } from "lucide-react";
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
    <main className="editorial-shell max-w-5xl py-6">
      <EditorialPageHeader chapter="Competição" title="Ranking dos jogadores" description="Classificação geral por taças conquistadas e experiência acumulada." />

      <section className="mt-4 overflow-hidden border border-black bg-white">
        {loading && <p className="p-6 text-sm text-[var(--muted)]">Carregando classificação...</p>}
        {!loading && entries.length === 0 && <div className="p-4"><EmptyState title="Tabela vazia" description="Ainda não existem campanhas classificadas." /></div>}
        {entries.map((entry, index) => (
          <article key={`${entry.username}-${entry.teamName}-${index}`} className="grid min-h-16 grid-cols-[32px_44px_minmax(0,1fr)_auto] items-center gap-3 border-b border-black/15 px-4 py-2 last:border-0">
            <div
              className={`grid h-8 w-8 place-items-center border border-black text-sm font-black ${
                index === 0
                  ? "bg-[var(--accent)] text-white"
                  : index === 1
                    ? "bg-[#d8d5cc] text-black"
                    : index === 2
                      ? "bg-[#c88a55] text-black"
                      : "border-transparent text-[var(--muted)]"
              }`}
            >
              {index + 1}
            </div>
            <TeamEmblem emblemId={entry.emblemId} teamName={entry.teamName} size={42} />
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-black uppercase text-black">{entry.teamName}</p>
              <p className="truncate text-[10px] text-[var(--muted)]">Usuário {entry.username} · Nível {entry.progression.level} {entry.progression.levelName}</p>
            </div>
            <div className="flex min-w-[112px] justify-end gap-4 text-right">
              <RankingValue icon={Trophy} value={entry.progression.trophies} label="taças" />
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
      <p className="flex items-center justify-end gap-1 font-display text-base font-black text-black"><Icon className="h-3.5 w-3.5 text-[var(--accent)]" /> {value.toLocaleString("pt-BR")}</p>
      <p className="mt-0.5 text-[9px] uppercase tracking-wide text-[var(--muted)]">{label}</p>
    </div>
  );
}
