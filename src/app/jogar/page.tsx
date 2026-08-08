"use client";

import { DraftPanel } from "@/components/game/DraftPanel";
import { CoachPanel } from "@/components/game/CoachPanel";
import { SetupForm } from "@/components/game/SetupForm";
import { SquadField } from "@/components/game/SquadField";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
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
      <div className="grid h-full gap-3 lg:grid-cols-[minmax(380px,.86fr)_minmax(440px,1.14fr)] xl:grid-cols-[minmax(430px,.9fr)_minmax(540px,1.1fr)] xl:items-start">
        <SquadField />
        <DraftPanel />
      </div>
      <div className="mt-3">
        <AdBanner compact />
      </div>
    </main>
  );
}
