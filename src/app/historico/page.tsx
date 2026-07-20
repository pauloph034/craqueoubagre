"use client";

import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { useEffect, useMemo } from "react";

export default function HistoryPage() {
  const { history, loadHistory, deleteHistory } = useGameStore();
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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-4xl font-black">Galeria e historico</h1>

      <section className="mt-6 rounded-lg border border-white/12 bg-white/[0.06] p-5 shadow-card">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Galeria de tacas</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {gallery.map((item) => (
            <article key={`${item.userName}-${item.teamName}`} className="rounded-md border border-white/10 bg-night/65 p-4">
              <p className="text-sm text-slate-400">{item.userName}</p>
              <h2 className="text-xl font-black">{item.teamName}</h2>
              <p className="mt-3 font-mono text-4xl font-black text-gold">{item.trophies}</p>
              <p className="text-sm text-slate-300">Champions em {item.campaigns} campanha(s)</p>
            </article>
          ))}
          {gallery.length === 0 && <p className="text-slate-300">Nenhuma taca conquistada ainda.</p>}
        </div>
      </section>

      <div className="mt-6 grid gap-3">
        {history.map((item) => (
          <article key={item.id} className="rounded-lg border border-white/12 bg-white/[0.06] p-4">
            <h2 className="font-black">{item.config.teamName} - {item.stageReached} - {item.score} pts</h2>
            <p className="text-sm text-slate-300">{item.config.userName ?? "Jogador"} - {new Date(item.date).toLocaleString("pt-BR")} - {item.config.formation} - {item.config.difficulty}</p>
            <Button className="mt-3" variant="danger" onClick={() => deleteHistory(item.id)}>Excluir</Button>
          </article>
        ))}
        {history.length === 0 && <p className="text-slate-300">Nenhuma campanha salva ainda.</p>}
      </div>
      <div className="mt-6">
        <AdBanner />
      </div>
    </main>
  );
}
