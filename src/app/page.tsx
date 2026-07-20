"use client";

import Link from "next/link";
import Image from "next/image";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { SoccerBallHero } from "@/components/game/SoccerBallHero";
import { Trophy, Shuffle, Users, Crown, Medal, BarChart3, Flame } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useGameStore } from "@/stores/game-store";

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
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
      <section className="grid min-h-[68vh] items-center gap-3 py-4 lg:grid-cols-[minmax(0,.98fr)_minmax(320px,.72fr)] lg:gap-0">
        <div className="relative z-10 max-w-[620px]">
          <Image
            src="/assets/logo-craque-ou-bagre.png"
            alt="Craque ou Bagre"
            width={760}
            height={373}
            className="w-full max-w-[590px] object-contain drop-shadow-[0_0_24px_rgba(40,184,255,.18)]"
            priority
          />
          <p className="mt-4 max-w-xl text-lg font-light leading-relaxed text-slate-200 md:text-xl">
            <span className="font-semibold text-gold">Monte seu onze historico,</span>
            <br />
            sobreviva ao mata-mata
            <br />
            e descubra se seu time nasceu para levantar taca.
          </p>
          {currentUser && <p className="mt-3 text-slate-300">Logado como <strong className="text-white">{currentUser.playerName?.trim() || currentUser.username}</strong></p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={currentUser ? "/jogar" : "/conta"}><Button className="px-7">{currentUser ? "Jogar" : "Entrar"}</Button></Link>
            <Link href="/salas"><Button className="px-7" variant="secondary">Jogar com amigos</Button></Link>
          </div>
        </div>
        <SoccerBallHero />
      </section>
      <section className="mt-2 grid gap-3 md:grid-cols-3">
        <Step icon={<Shuffle />} title="1. Sorteie" text="Receba clube, temporada e raridade a cada rodada." />
        <Step icon={<Users />} title="2. Escale" text="Escolha jogadores reais para encaixar no seu esquema." />
        <Step icon={<Trophy />} title="3. Dispute" text="Avance jogo a jogo ate sair o campeao." />
      </section>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<BarChart3 size={18} />} label="Campanhas" value={userHistory.length} />
        <Metric icon={<Crown size={18} />} label="Titulos" value={titles} />
        <Metric icon={<Medal size={18} />} label="Recorde" value={bestScore} />
        <Metric icon={<Flame size={18} />} label="Perfeitas" value={perfect} />
      </section>
      <div className="mt-6">
        <AdBanner />
      </div>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.045] px-4 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-electric/30 bg-electric/10 text-electric">{icon}</span>
      <div>
        <p className="text-2xl font-black leading-none text-white">{value}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function Step({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-md border border-white/10 bg-white/[0.045] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-electric/25 bg-electric/10 text-electric">{icon}</div>
      <div>
        <h2 className="text-base font-black">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
      </div>
    </article>
  );
}
