"use client";

import { achievements } from "@/data/loaders";
import { CompactTabs, EditorialPageHeader, EmptyState } from "@/components/ui/editorial";
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
    card: "border-[var(--success)] bg-emerald-50",
    icon: "border-[var(--success)] bg-[var(--success)] text-white"
  },
  gold: {
    card: "border-amber-500 bg-amber-50",
    icon: "border-amber-600 bg-amber-400 text-black"
  },
  silver: {
    card: "border-slate-500 bg-slate-100",
    icon: "border-slate-600 bg-slate-300 text-black"
  },
  bronze: {
    card: "border-orange-700 bg-orange-50",
    icon: "border-orange-800 bg-orange-700 text-white"
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
    <main className="editorial-shell max-w-6xl py-6">
      <EditorialPageHeader
        chapter="Galeria do clube"
        title="Conquistas"
        description="Títulos, campanhas marcantes e feitos raros."
        action={<div className="border border-black px-3 py-2 text-xs font-black">{unlockedIds.size}/{orderedAchievements.length} emblemas</div>}
      />

      <CompactTabs
        className="mt-4 max-w-lg"
        value={tab}
        onChange={(value) => setTab(value as "unlocked" | "locked")}
        items={[
          { value: "unlocked", label: "Na estante", count: unlockedIds.size },
          { value: "locked", label: "Na mira", count: orderedAchievements.length - unlockedIds.size }
        ]}
      />

      <section className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleAchievements.map((item) => {
          const Icon = iconByAchievement[item.id] ?? Trophy;
          const style = tierStyles[item.tier];
          const unlocked = unlockedIds.has(item.id);

          return (
            <article key={item.id} className={cn("relative flex min-h-52 flex-col items-center justify-center overflow-hidden border px-5 py-6 text-center", style.card, !unlocked && "opacity-55 grayscale")}>
              <span className="absolute right-3 top-3 text-[9px] font-black uppercase tracking-[0.14em] text-black/45">{unlocked ? "Conquistada" : "Bloqueada"}</span>
              <div className="flex w-full flex-col items-center">
                <div className={cn("achievement-emblem grid h-14 w-14 place-items-center border-2", style.icon)}>
                  <Icon className="h-7 w-7" strokeWidth={2.25} aria-hidden />
                </div>
                <div className="mt-4 min-w-0">
                  <h2 className="font-display text-lg font-black uppercase leading-tight text-black">{item.name}</h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.description}</p>
                </div>
              </div>
            </article>
          );
        })}
        {visibleAchievements.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-4"><EmptyState title={tab === "unlocked" ? "Estante vazia" : "Painel completo"} description={tab === "unlocked" ? "Jogue uma campanha para começar a coleção." : "Todas as conquistas foram desbloqueadas."} /></div>
        )}
      </section>
    </main>
  );
}
