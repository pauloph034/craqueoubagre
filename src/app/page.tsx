"use client";

import { AdBanner } from "@/components/AdBanner";
import { HomeIntroLoader } from "@/components/AppLoadingScreen";
import { NationalityFlag } from "@/components/game/NationalityFlag";
import { SoccerFieldMarkings } from "@/components/game/SoccerFieldMarkings";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import { ArrowRight, BarChart3, Crown, Flame, Medal, Shuffle, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, type ReactNode } from "react";

export default function HomePage() {
  const currentUser = useGameStore((state) => state.currentUser);
  const history = useGameStore((state) => state.history);
  const resetSolo = useGameStore((state) => state.reset);
  const userHistory = currentUser ? history.filter((item) => (item.config.userName ?? "Jogador") === currentUser.username) : history;
  const titles = userHistory.filter((item) => item.champion).length;
  const perfect = userHistory.filter((item) => item.achievements.includes("campanha-perfeita")).length;
  const bestScore = userHistory.reduce((best, item) => Math.max(best, item.score), 0);

  useEffect(() => {
    resetSolo();
  }, [resetSolo]);

  return (
    <>
      <HomeIntroLoader />
      <main className="editorial-shell py-5 sm:py-7">
      <section className="grid min-h-[calc(100dvh-8rem)] items-center gap-8 py-5 lg:grid-cols-[1fr_.9fr] lg:gap-14 lg:py-10">
        <div className="flex min-h-[400px] flex-col justify-center">
          <p className="editorial-kicker mb-6">Liga dos Craques · Temporada aberta</p>
          <div>
            <h1 className="brand-display flex flex-col gap-4 text-[4.8rem] uppercase leading-[0.86] text-black sm:text-[6rem] lg:text-[7.5rem]">
              <span>Craque</span>
              <span className="whitespace-nowrap text-[0.72em] text-[var(--accent)]">ou Bagre?</span>
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-[var(--muted)] sm:text-base">
              Monte um onze histórico, sobreviva ao mata-mata e prove que suas escolhas levantam taça.
            </p>
            {currentUser && <p className="mt-3 text-xs font-bold uppercase">Em campo: {currentUser.playerName?.trim() || currentUser.username}</p>}
            <div className="mt-5 flex flex-col gap-2 min-[430px]:flex-row">
              <Link className="w-full min-[430px]:w-auto" href={currentUser ? "/jogar" : "/conta"}>
                <Button className="hero-play-button w-full min-[430px]:min-w-40">{currentUser ? "Jogar agora" : "Entrar"} <ArrowRight size={15} /></Button>
              </Link>
              <Link className="w-full min-[430px]:w-auto" href="/salas">
                <Button className="w-full min-[430px]:min-w-40" variant="secondary">Jogar com amigos</Button>
              </Link>
            </div>
          </div>
        </div>
        <HeroPreview />
      </section>

      <section className="mt-5 grid border-l border-t border-black md:grid-cols-3">
        <Step icon={<Shuffle size={18} />} title="Sorteie" text="Um clube e uma temporada por rodada." number="01" />
        <Step icon={<Users size={18} />} title="Escale" text="Escolha o craque e encaixe na formação." number="02" />
        <Step icon={<Trophy size={18} />} title="Dispute" text="Acompanhe cada minuto até a final." number="03" />
      </section>

      <section className="grid grid-cols-2 border-x border-b border-black bg-black py-4 text-white md:grid-cols-4">
        <Metric icon={<BarChart3 size={16} />} label="Campanhas" value={userHistory.length} />
        <Metric icon={<Crown size={16} />} label="Títulos" value={titles} />
        <Metric icon={<Medal size={16} />} label="Recorde" value={bestScore} />
        <Metric icon={<Flame size={16} />} label="Perfeitas" value={perfect} />
      </section>

      <div className="mt-5"><AdBanner variant="house-ad" /></div>
      </main>
    </>
  );
}

function HeroPreview() {
  const players = [
    { position: "PE", name: "C. Ronaldo", rating: "97", nationality: "Portugal" },
    { position: "ATA", name: "Rooney", rating: "91", nationality: "Inglaterra" },
    { position: "PD", name: "Dembélé", rating: "87", nationality: "Franca" },
    { position: "MC", name: "Xavi", rating: "96", nationality: "Espanha" },
    { position: "VOL", name: "Busquets", rating: "92", nationality: "Espanha" },
    { position: "GOL", name: "Valdés", rating: "88", nationality: "Espanha" }
  ];
  const coords = [[22, 23], [50, 17], [78, 23], [36, 54], [64, 54], [50, 82]];

  return (
    <div className="flex min-h-[330px] items-center justify-center lg:min-h-[430px]">
      <div
        className="relative mx-auto aspect-[8/5] w-full max-w-[560px] overflow-hidden border border-black bg-[#153b2e]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0, rgba(255,255,255,.035) 11.11%, transparent 11.11%, transparent 22.22%)" }}
      >
        <SoccerFieldMarkings variant="attacking-half" className="inset-[3%] text-[#efe6d2]" />
        {players.map((player, index) => (
          <div key={player.name} className="absolute z-10 grid h-[3.75rem] w-[3.75rem] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white bg-black text-center" style={{ left: `${coords[index]![0]}%`, top: `${coords[index]![1]}%` }}>
            <NationalityFlag nationality={player.nationality} className="absolute -left-1 -top-1 w-6 border-black" />
            <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full border border-black bg-[var(--background)] font-display text-xs font-black text-black">{player.rating}</span>
            <span className="mt-2 max-w-[3.4rem] px-1 text-[7px] font-black leading-[0.9] text-white">{player.name}</span>
            <span className="absolute -bottom-3 border border-black bg-[var(--background)] px-1.5 py-0.5 text-[8px] font-black text-black">{player.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 border-r border-white/25 px-4 last:border-0">
      <span className="text-[var(--accent)]">{icon}</span>
      <p className="font-display text-2xl font-black leading-none text-white">{value}</p>
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-white/60">{label}</p>
    </div>
  );
}

function Step({ icon, title, text, number }: { icon: ReactNode; title: string; text: string; number: string }) {
  return (
    <article className="grid min-h-24 grid-cols-[2.5rem_2rem_minmax(0,1fr)] items-center gap-3 border-b border-r border-black bg-[var(--surface)] px-4 py-5">
      <span className="editorial-number">{number}</span>
      <span className="text-[var(--accent)]">{icon}</span>
      <div>
        <h2 className="text-sm font-black uppercase">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{text}</p>
      </div>
    </article>
  );
}
