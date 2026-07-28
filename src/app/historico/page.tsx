"use client";

import { AdBanner } from "@/components/AdBanner";
import { EditorialPageHeader, EmptyState } from "@/components/ui/editorial";
import { useGameStore } from "@/stores/game-store";
import { useEffect, useMemo } from "react";

export default function HistoryPage() {
  const { history, loadHistory } = useGameStore();
  useEffect(() => loadHistory(), [loadHistory]);

  const gallery = useMemo(() => {
    const rows = history.reduce<Record<string, { userName: string; teamName: string; trophies: number; campaigns: number }>>((acc, item) => {
      const userName = item.config.userName ?? "Jogador";
      const key = `${userName}__${item.config.teamName}`;
      acc[key] ??= { userName, teamName: item.config.teamName, trophies: 0, campaigns: 0 };
      acc[key].campaigns += 1;
      if (item.champion) acc[key].trophies += 1;
      return acc;
    }, {});
    return Object.values(rows).sort((a, b) => b.trophies - a.trophies || b.campaigns - a.campaigns);
  }, [history]);

  return (
    <main className="editorial-shell py-6">
      <EditorialPageHeader chapter="Arquivo do clube" title="Galeria de taças" description="Os clubes com campanhas registradas e títulos conquistados." />

      <section className="mt-5 border-y border-black py-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item) => (
            <article key={`${item.userName}-${item.teamName}`} className="grid min-h-32 grid-cols-[1fr_auto] border border-black bg-white p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{item.userName}</p>
                <h2 className="mt-1 font-display text-xl font-black uppercase">{item.teamName}</h2>
                <p className="mt-4 text-xs text-[var(--muted)]">{item.campaigns} campanha(s)</p>
              </div>
              <div className="border-l border-black/20 pl-4 text-right">
                <p className="font-display text-4xl font-black text-[var(--accent)]">{item.trophies}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.12em]">Taças</p>
              </div>
            </article>
          ))}
          {gallery.length === 0 && <div className="sm:col-span-2 lg:col-span-3"><EmptyState title="Estante vazia" description="Nenhuma taça conquistada ainda." /></div>}
        </div>
      </section>

      <div className="mt-6">
        <AdBanner />
      </div>
    </main>
  );
}
