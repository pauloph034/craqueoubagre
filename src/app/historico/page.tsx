"use client";

import { AdBanner } from "@/components/AdBanner";
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
    <main className="mx-auto max-w-5xl px-4 py-7">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-mint">Clube</p>
      <h1 className="mt-1 text-3xl font-black">Galeria de taças</h1>

      <section className="mt-5 border-y border-white/[0.08] py-4">
        <div className="grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
          {gallery.map((item) => (
            <article key={`${item.userName}-${item.teamName}`} className="bg-night/90 p-4">
              <p className="text-sm text-slate-400">{item.userName}</p>
              <h2 className="text-xl font-black">{item.teamName}</h2>
              <p className="mt-3 font-mono text-4xl font-black text-gold">{item.trophies}</p>
              <p className="text-sm text-slate-300">Liga dos Craques em {item.campaigns} campanha(s)</p>
            </article>
          ))}
          {gallery.length === 0 && <p className="text-slate-300">Nenhuma taca conquistada ainda.</p>}
        </div>
      </section>

      <div className="mt-6">
        <AdBanner />
      </div>
    </main>
  );
}
