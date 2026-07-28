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
    return <main className="editorial-shell py-5"><SetupForm /><div className="mt-4"><AdBanner variant="leaderboard" /></div></main>;
  }
  if (phase === "campaignReady") {
    return (
      <main className="editorial-shell grid gap-4 py-5 lg:grid-cols-[minmax(390px,.9fr)_1fr]">
        <SquadField />
        <section className="editorial-panel p-5">
          <p className="editorial-kicker">03 · Campanha</p>
          <h1 className="editorial-page-title mt-2">Elenco confirmado</h1>
          <p className="editorial-muted mt-2">Elenco e técnico confirmados. A campanha será simulada partida por partida.</p>
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
      <main className="editorial-shell grid gap-4 py-5 lg:grid-cols-[minmax(380px,.8fr)_1.2fr]">
        <SquadField />
        <CoachPanel />
      </main>
    );
  }
  return (
    <main className="editorial-shell game-workspace py-3">
      <div className="grid h-full gap-3 lg:grid-cols-[minmax(380px,.86fr)_minmax(420px,1fr)] xl:grid-cols-[minmax(410px,.92fr)_minmax(440px,1fr)_180px] xl:items-start">
        <SquadField showMetrics={false} />
        <DraftPanel />
        <DraftStatusPanel />
      </div>
      <div className="mt-3 xl:hidden">
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
    <GamePanel className="border-black bg-[var(--surface)] p-4 xl:sticky xl:top-[70px]">
      <div className="min-w-0">
        <p className="editorial-kicker">Seu time</p>
        <h1 className="mt-1 break-words font-display text-xl font-black uppercase leading-tight text-black">{config.teamName}</h1>
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Elenco</span>
            <span className="font-mono text-sm font-black text-white">{squad.length}/11</span>
          </div>
          <div className="mt-2 h-1 bg-black/10">
            <div className="h-full bg-[var(--accent)]" style={{ width: `${Math.round((squad.length / 11) * 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-black/20 py-3">
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
      <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 font-display text-lg font-black text-black">{value}</p>
    </div>
  );
}
