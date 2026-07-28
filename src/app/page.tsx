"use client";

import Link from "next/link";
import Image from "next/image";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { Trophy, Shuffle, Users, Crown, Medal, BarChart3, Flame, ArrowRight } from "lucide-react";
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
    <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 lg:py-10">
      <section className="grid min-h-[510px] items-center gap-8 border-b border-white/[0.08] pb-10 lg:grid-cols-[minmax(0,.88fr)_minmax(420px,.72fr)]">
        <div className="relative z-10 max-w-[560px]">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.26em] text-mint">Draft historico de futebol</p>
          <Image
            src="/assets/logo-craque-ou-bagre.png"
            alt="Craque ou Bagre"
            width={760}
            height={373}
            className="w-full max-w-[510px] object-contain drop-shadow-[0_0_18px_rgba(40,184,255,.14)]"
            priority
          />
          <p className="mt-4 max-w-lg text-base font-light leading-7 text-slate-300 md:text-lg">
            <span className="font-semibold text-gold">Monte seu onze historico,</span>
            <br />
            sobreviva ao mata-mata e descubra se seu time nasceu para levantar taca.
          </p>
          {currentUser && <p className="mt-3 text-slate-300">Logado como <strong className="text-white">{currentUser.playerName?.trim() || currentUser.username}</strong></p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={currentUser ? "/jogar" : "/conta"}><Button className="min-w-40 px-7">{currentUser ? "Jogar agora" : "Entrar"} <ArrowRight size={16} /></Button></Link>
            <Link href="/salas"><Button className="min-w-40 px-7" variant="secondary">Jogar com amigos</Button></Link>
          </div>
        </div>
        <HeroPreview />
      </section>
      <section className="grid border-b border-white/[0.08] md:grid-cols-3">
        <Step icon={<Shuffle />} title="Sorteie" text="Um clube e uma temporada por rodada." number="01" />
        <Step icon={<Users />} title="Escale" text="Escolha o craque e encaixe na formacao." number="02" />
        <Step icon={<Trophy />} title="Dispute" text="Acompanhe cada minuto ate a final." number="03" />
      </section>
      <section className="grid grid-cols-2 border-b border-white/[0.08] py-5 md:grid-cols-4">
        <Metric icon={<BarChart3 size={18} />} label="Campanhas" value={userHistory.length} />
        <Metric icon={<Crown size={18} />} label="Titulos" value={titles} />
        <Metric icon={<Medal size={18} />} label="Recorde" value={bestScore} />
        <Metric icon={<Flame size={18} />} label="Perfeitas" value={perfect} />
      </section>
      <div className="mt-5">
        <AdBanner variant="house-ad" />
      </div>
    </main>
  );
}

function HeroPreview() {
  const players = [
    ["PE", "Ronaldo", "97"],
    ["ATA", "Rooney", "91"],
    ["PD", "Dembele", "87"],
    ["MC", "Xavi", "96"],
    ["VOL", "Busquets", "92"],
    ["GOL", "Valdes", "88"]
  ];
  return (
    <div className="overflow-hidden">
      <div className="relative aspect-[7/8] max-h-[430px] min-h-[350px] border border-emerald-200/10 field-lines">
        {players.map(([pos, name, rating], index) => {
          const coords = [
            [24, 20],
            [50, 13],
            [76, 20],
            [34, 48],
            [58, 52],
            [50, 84]
          ][index]!;
          return (
            <div key={name} className="absolute grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-electric bg-night/90 text-center shadow-glow" style={{ left: `${coords[0]}%`, top: `${coords[1]}%` }}>
              <span className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-gold font-mono text-[11px] font-black text-night">{rating}</span>
              <span className="max-w-[3.7rem] truncate text-[10px] font-black text-white">{name}</span>
              <span className="absolute -bottom-3 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-black text-sky-100">{pos}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 border-r border-white/[0.08] px-4 py-2 last:border-0">
      <span className="shrink-0 text-electric">{icon}</span>
      <div>
        <p className="text-2xl font-black leading-none text-white">{value}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      </div>
    </div>
  );
}

function Step({ icon, title, text, number }: { icon: ReactNode; title: string; text: string; number: string }) {
  return (
    <article className="grid min-h-24 grid-cols-[2.4rem_2.5rem_minmax(0,1fr)] items-center gap-3 border-r border-white/[0.08] px-4 py-5 last:border-0">
      <span className="font-mono text-xl text-electric">{number}</span>
      <div className="grid h-9 w-9 shrink-0 place-items-center border border-electric/20 text-electric">{icon}</div>
      <div>
        <h2 className="text-base font-black">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
      </div>
    </article>
  );
}
