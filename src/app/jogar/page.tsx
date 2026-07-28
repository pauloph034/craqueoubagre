"use client";

import { DraftPanel } from "@/components/game/DraftPanel";
import { CoachPanel } from "@/components/game/CoachPanel";
import { SetupForm } from "@/components/game/SetupForm";
import { SquadField } from "@/components/game/SquadField";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { GamePanel } from "@/components/ui/surface";
import { difficultyRules } from "@/config/game-balance";
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
      <main className="mx-auto grid max-w-[1240px] gap-4 px-4 py-6 lg:grid-cols-[minmax(420px,.92fr)_1fr]">
        <SquadField />
        <section className="border border-white/10 bg-black/25 p-5">
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
      <main className="mx-auto grid max-w-[1240px] gap-4 px-4 py-6 lg:grid-cols-[minmax(420px,.92fr)_1fr]">
        <SquadField />
        <CoachPanel />
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <div className="grid gap-3 xl:grid-cols-[190px_minmax(430px,.9fr)_minmax(430px,1.1fr)] xl:items-start">
        <DraftStatusPanel />
        <SquadField showMetrics={false} />
        <DraftPanel />
      </div>
      <div className="mt-4">
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
    <GamePanel className="border-white/[0.08] bg-black/25 p-4 xl:sticky xl:top-16">
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-mint">Seu time</p>
        <h1 className="mt-1 break-words font-display text-xl leading-tight text-white">{config.teamName}</h1>
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Elenco</span>
            <span className="font-mono text-sm font-black text-white">{squad.length}/11</span>
          </div>
          <div className="mt-2 h-1 bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-mint via-electric to-gold" style={{ width: `${Math.round((squad.length / 11) * 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-white/[0.08] py-3">
          <CompactStat label="Rating" value={rules.hideRatings && squad.length < 11 ? "--" : metrics.rating} />
          <CompactStat label="Entros." value={`${metrics.chemistry}%`} />
          <CompactStat label="Rerolls" value={rerollsLeft} />
          <CompactStat label="Trocas" value={swapsLeft} />
        </div>
      </div>
    </GamePanel>
  );
}

function CompactStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-black text-slate-100">{value}</p>
    </div>
  );
}
