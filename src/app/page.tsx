"use client";

import Link from "next/link";
import Image from "next/image";
import { AdBanner } from "@/components/AdBanner";
import { Button } from "@/components/ui/button";
import { GamePanel, SectionHeader } from "@/components/ui/surface";
import { Trophy, Shuffle, Users, Crown, Medal, BarChart3, Flame, ShieldCheck } from "lucide-react";
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
    <main className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-8">
      <section className="grid min-h-[560px] items-center gap-8 py-4 lg:grid-cols-[minmax(0,.92fr)_minmax(420px,.78fr)]">
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
            sobreviva ao mata-mata e descubra se seu time nasceu para levantar taca.
          </p>
          {currentUser && <p className="mt-3 text-slate-300">Logado como <strong className="text-white">{currentUser.playerName?.trim() || currentUser.username}</strong></p>}
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href={currentUser ? "/jogar" : "/conta"}><Button className="px-7">{currentUser ? "Jogar agora" : "Entrar"}</Button></Link>
            <Link href="/salas"><Button className="px-7" variant="secondary">Jogar com amigos</Button></Link>
          </div>
        </div>
        <HeroPreview />
      </section>
      <SectionHeader eyebrow="Como funciona" title="Sorteie, escale e dispute" description="Rodadas curtas, escolhas claras e campanha progressiva do primeiro sorteio ate a final." />
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
    <GamePanel className="overflow-hidden p-4">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-mint">Preview do draft</p>
          <h2 className="mt-1 font-display text-2xl text-white">Barcelona 10/11</h2>
        </div>
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-gold/30 bg-gold/15 font-mono text-xl font-black text-gold">92</div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_.72fr]">
        <div className="relative aspect-[7/8] min-h-[360px] rounded-2xl border border-emerald-200/15 field-lines">
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
        <div className="space-y-3">
          <MiniCard icon={<ShieldCheck size={16} />} label="Elenco" value="6/11" />
          <MiniCard icon={<BarChart3 size={16} />} label="Entrosamento" value="74%" />
          <MiniCard icon={<Trophy size={16} />} label="Proximo passo" value="Escolher técnico" />
        </div>
      </div>
    </GamePanel>
  );
}

function MiniCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-electric/10 text-electric">{icon}</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-3">
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
    <article className="grid min-h-24 grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] p-4">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-electric/25 bg-electric/10 text-electric">{icon}</div>
      <div>
        <h2 className="text-base font-black">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
      </div>
    </article>
  );
}
