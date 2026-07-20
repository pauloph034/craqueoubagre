"use client";

import { achievements } from "@/data/loaders";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import {
  BadgeCheck,
  Castle,
  Crown,
  Flame,
  Gem,
  Medal,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  type LucideIcon
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const tierRank = {
  special: 0,
  gold: 1,
  silver: 2,
  bronze: 3
};

const tierStyles = {
  special: {
    card: "border-cyan-300/45 bg-cyan-500/[0.08] shadow-[0_0_35px_rgba(34,211,238,0.15)]",
    icon: "border-cyan-200/55 bg-cyan-300/15 text-cyan-100",
    glint: "from-cyan-300/25 via-emerald-300/10 to-transparent"
  },
  gold: {
    card: "border-gold/50 bg-gold/[0.08] shadow-[0_0_28px_rgba(255,210,70,0.12)]",
    icon: "border-gold/60 bg-gold/15 text-gold",
    glint: "from-gold/25 via-yellow-200/10 to-transparent"
  },
  silver: {
    card: "border-slate-200/45 bg-slate-100/[0.07] shadow-[0_0_24px_rgba(226,232,240,0.08)]",
    icon: "border-slate-200/55 bg-slate-100/15 text-slate-100",
    glint: "from-slate-100/22 via-cyan-100/8 to-transparent"
  },
  bronze: {
    card: "border-orange-400/45 bg-orange-600/[0.08] shadow-[0_0_22px_rgba(251,146,60,0.1)]",
    icon: "border-orange-300/55 bg-orange-500/15 text-orange-200",
    glint: "from-orange-300/20 via-amber-400/8 to-transparent"
  }
};

const iconByAchievement: Record<string, LucideIcon> = {
  "primeiro-titulo": Trophy,
  "campeao-invicto": ShieldCheck,
  "sete-vitorias": Crown,
  "defesa-de-ferro": Shield,
  "ataque-historico": Target,
  "zebra-europeia": Star,
  "sem-lendas": BadgeCheck,
  "clube-fiel": Castle,
  "torre-de-babel": Gem,
  "modo-lenda": Flame,
  "sem-mudancas": Medal,
  "rei-dos-penaltis": Target,
  "campanha-perfeita": Sparkles,
  "final-dramatica": Crown,
  "artilheiro-lendario": Flame,
  "rolo-compressor": Trophy
};

export default function AchievementsPage() {
  const history = useGameStore((state) => state.history);
  const loadHistory = useGameStore((state) => state.loadHistory);
  const [tab, setTab] = useState<"unlocked" | "locked">("unlocked");
  const unlockedIds = useMemo(() => new Set(history.flatMap((campaign) => campaign.achievements)), [history]);
  const orderedAchievements = [...achievements].sort((a, b) => tierRank[a.tier] - tierRank[b.tier] || a.name.localeCompare(b.name));
  const visibleAchievements = orderedAchievements.filter((item) => (tab === "unlocked" ? unlockedIds.has(item.id) : !unlockedIds.has(item.id)));

  useEffect(() => loadHistory(), [loadHistory]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-2xl border border-white/15 bg-night/70 p-6 shadow-2xl backdrop-blur md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-gold">Galeria</p>
        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black md:text-5xl">Conquistas</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Uma vitrine limpa para as campanhas memoraveis: titulos, defesas historicas, ataques absurdos e feitos raros.
            </p>
          </div>
          <div className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-5 py-3 text-sm font-black text-cyan-100">
            {unlockedIds.size}/{orderedAchievements.length} emblemas
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-night/70 p-2 backdrop-blur md:max-w-xl">
        <button
          className={cn("rounded-xl px-4 py-3 text-sm font-black transition", tab === "unlocked" ? "bg-electric text-night" : "text-slate-300 hover:bg-white/10")}
          type="button"
          onClick={() => setTab("unlocked")}
        >
          Na estante ({unlockedIds.size})
        </button>
        <button
          className={cn("rounded-xl px-4 py-3 text-sm font-black transition", tab === "locked" ? "bg-electric text-night" : "text-slate-300 hover:bg-white/10")}
          type="button"
          onClick={() => setTab("locked")}
        >
          Na mira ({orderedAchievements.length - unlockedIds.size})
        </button>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleAchievements.map((item) => {
          const Icon = iconByAchievement[item.id] ?? Trophy;
          const style = tierStyles[item.tier];
          const unlocked = unlockedIds.has(item.id);

          return (
            <article key={item.id} className={cn("relative overflow-hidden rounded-2xl border p-5 backdrop-blur", style.card, !unlocked && "opacity-70 grayscale")}>
              <div className={cn("absolute inset-x-0 top-0 h-24 bg-gradient-to-br", style.glint)} />
              <div className="relative flex items-start gap-4">
                <div className={cn("grid h-14 w-14 shrink-0 place-items-center rounded-2xl border shadow-lg", style.icon)}>
                  <Icon className="h-7 w-7" aria-hidden />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-black leading-tight text-white">{item.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                </div>
              </div>
            </article>
          );
        })}
        {visibleAchievements.length === 0 && (
          <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-6 text-slate-300">
            {tab === "unlocked" ? "Nenhuma conquista na estante ainda. Jogue uma campanha para comecar a colecao." : "Tudo conquistado. Painel completo."}
          </div>
        )}
      </section>
    </main>
  );
}
