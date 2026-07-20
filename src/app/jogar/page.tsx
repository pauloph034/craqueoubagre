"use client";

import { DraftPanel } from "@/components/game/DraftPanel";
import { CoachPanel } from "@/components/game/CoachPanel";
import { SetupForm } from "@/components/game/SetupForm";
import { SquadField } from "@/components/game/SquadField";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import Link from "next/link";

export default function PlayPage() {
  const phase = useGameStore((state) => state.phase);
  if (phase === "setup") {
    return <main className="mx-auto max-w-5xl px-4 py-10"><SetupForm /><div className="mt-6"><AdBanner compact /></div></main>;
  }
  if (phase === "campaignReady") {
    return (
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[.92fr_1fr]">
        <SquadField />
        <section className="rounded-lg border border-white/12 bg-white/[0.07] p-6">
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
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[.92fr_1fr]">
        <SquadField />
        <CoachPanel />
      </main>
    );
  }
  return (
    <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[.92fr_1.08fr]">
      <SquadField />
      <DraftPanel />
    </main>
  );
}
