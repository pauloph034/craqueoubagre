"use client";

import { AdBanner } from "@/components/AdBanner";
import { EditorialPageHeader, EmptyState } from "@/components/ui/editorial";
import { useGameStore } from "@/stores/game-store";
import Image from "next/image";
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
      <EditorialPageHeader chapter="Arquivo do clube" title="Galeria de taças" description="Uma estante para cada clube que levantou a Liga dos Craques." />

      <section className="mt-5 border-y border-black py-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {gallery.map((item) => (
            <article key={`${item.userName}-${item.teamName}`} className="border border-black bg-white">
              <div className="flex min-h-24 items-start justify-between gap-4 border-b border-black/20 p-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{item.userName}</p>
                  <h2 className="mt-1 truncate font-display text-2xl font-black uppercase">{item.teamName}</h2>
                  <p className="mt-2 text-xs text-[var(--muted)]">{item.campaigns} campanha(s) registrada(s)</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-4xl font-black text-[var(--accent)]">{item.trophies}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.12em]">{item.trophies === 1 ? "Taça" : "Taças"}</p>
                </div>
              </div>

              <div className="px-4 pb-4 pt-5">
                {item.trophies > 0 ? (
                  <div className="relative flex min-h-28 flex-wrap items-end gap-x-1 gap-y-5 border-b-[6px] border-black px-2 pb-1 shadow-[0_5px_0_rgba(24,167,112,0.28)]">
                    {Array.from({ length: item.trophies }, (_, index) => (
                      <div key={index} className="group relative w-16 shrink-0 text-center sm:w-[4.5rem]">
                        <Image
                          src="/images/liga-dos-craques-trophy.png"
                          alt={`Taça ${index + 1} de ${item.teamName}`}
                          width={2560}
                          height={2560}
                          sizes="72px"
                          className="mx-auto h-24 w-full object-contain drop-shadow-[0_7px_5px_rgba(0,0,0,0.22)] transition-transform group-hover:-translate-y-1"
                        />
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black uppercase tracking-[0.08em] text-black/55">
                          #{String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid min-h-28 place-items-center border-b-[6px] border-black text-center text-xs font-black uppercase tracking-[0.12em] text-black/40">
                    Prateleira sem títulos
                  </div>
                )}
              </div>
            </article>
          ))}
          {gallery.length === 0 && <div className="lg:col-span-2"><EmptyState title="Estante vazia" description="Nenhuma taça conquistada ainda." /></div>}
        </div>
      </section>

      <div className="mt-6">
        <AdBanner />
      </div>
    </main>
  );
}
