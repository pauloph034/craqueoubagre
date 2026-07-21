"use client";

import { DraftPanel } from "@/components/game/DraftPanel";
import { CoachPanel } from "@/components/game/CoachPanel";
import { SetupForm } from "@/components/game/SetupForm";
import { SquadField } from "@/components/game/SquadField";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { GamePanel, StatPill } from "@/components/ui/surface";
import { difficultyRules, tacticalStyles } from "@/config/game-balance";
import { useGameStore } from "@/stores/game-store";
import { useTeamMetrics } from "@/stores/game-store";
import Link from "next/link";
import { useEffect } from "react";

export default function PlayPage() {
  const phase = useGameStore((state) => state.phase);
  const loadActiveCampaign = useGameStore((state) => state.loadActiveCampaign);
  useEffect(() => {
    loadActiveCampaign();
  }, [loadActiveCampaign]);

  if (phase === "setup") {
    return <main className="mx-auto max-w-6xl px-4 py-8"><SetupForm /><div className="mt-6"><AdBanner variant="leaderboard" /></div></main>;
  }
  if (phase === "campaignReady") {
    return (
      <main className="mx-auto grid max-w-[1480px] gap-6 px-4 py-8 lg:grid-cols-[minmax(420px,.92fr)_1fr]">
        <SquadField />
        <section className="rounded-2xl border border-white/12 bg-white/[0.07] p-6">
          <h1 className="text-3xl font-black">Elenco confirmado</h1>
          <p className="mt-2 text-slate-300">Elenco e tecnico confirmados. A campanha sera simulada partida por partida.</p>
          <div className="mt-5 flex gap-3">
            <Link href="/campanha"><Button>Ir para campanha</Button></Link>
          </div>
        </section>
        <div className="lg:col-span-2"><AdBanner compact /></div>
      </main>
    );
  }
  if (phase === "coachSelection") {
    return (
      <main className="mx-auto grid max-w-[1480px] gap-6 px-4 py-8 lg:grid-cols-[minmax(420px,.92fr)_1fr]">
        <SquadField />
        <CoachPanel />
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-[1480px] px-4 py-6">
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(430px,1fr)_390px]">
        <DraftStatusPanel />
        <SquadField />
        <DraftPanel />
      </div>
      <div className="mt-6">
        <AdBanner variant="leaderboard" />
      </div>
    </main>
  );
}

function DraftStatusPanel() {
  const config = useGameStore((state) => state.config);
  const squad = useGameStore((state) => state.squad);
  const rerollsLeft = useGameStore((state) => state.rerollsLeft);
  const swapsLeft = useGameStore((state) => state.swapsLeft);
  const metrics = useTeamMetrics();
  const rules = difficultyRules[config.difficulty];
  return (
    <GamePanel className="h-fit p-4">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-mint">Campanha</p>
      <h1 className="mt-2 font-display text-3xl leading-none text-white">{config.teamName}</h1>
      <div className="mt-5 grid gap-3">
        <StatPill label="Formacao" value={config.formation} />
        <StatPill label="Tatica" value={tacticalStyles[config.tacticalStyle].label} />
        <StatPill label="Dificuldade" value={config.difficulty === "classico" ? "Classico" : config.difficulty === "casual" ? "Casual" : "Lenda"} />
      </div>
      <div className="mt-5 rounded-2xl border border-white/10 bg-night/55 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Elenco</span>
          <span className="font-mono text-xl font-black text-white">{squad.length}/11</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-mint via-electric to-gold" style={{ width: `${Math.round((squad.length / 11) * 100)}%` }} />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <StatPill label="Rating" value={rules.hideRatings && squad.length < 11 ? "--" : metrics.rating} />
        <StatPill label="Entros." value={`${metrics.chemistry}%`} />
        <StatPill label="Rerolls" value={rerollsLeft} />
        <StatPill label="Trocas" value={swapsLeft} />
      </div>
    </GamePanel>
  );
}
