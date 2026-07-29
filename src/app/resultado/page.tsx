"use client";

import { AdBanner } from "@/components/AdBanner";
import { TeamNameWithCrest } from "@/components/game/TeamNameWithCrest";
import { Button } from "@/components/ui/button";
import { achievements } from "@/data/loaders";
import { positionLabel } from "@/game-engine/position-labels";
import { useGameStore } from "@/stores/game-store";
import type { BracketMatch, CampaignSummary, MatchEvent } from "@/types/game";
import { Trophy } from "lucide-react";
import Link from "next/link";

export default function ResultPage() {
  const summary = useGameStore((state) => state.lastSummary);
  const history = useGameStore((state) => state.history);
  const currentUser = useGameStore((state) => state.currentUser);
  const reset = useGameStore((state) => state.reset);

  if (!summary) return <main className="editorial-shell py-8"><section className="editorial-panel max-w-3xl p-6"><p>Nenhum resultado carregado.</p><Link href="/jogar"><Button className="mt-4">Jogar</Button></Link></section></main>;

  const stats = campaignStats(summary, history);
  const unlocked = achievements.filter((item) => summary.achievements.includes(item.id));
  const displayTeamName =
    currentUser?.role === "player" && summary.config.teamName === currentUser.username
      ? currentUser.teamName ?? `${currentUser.username} FC`
      : summary.config.teamName;
  const displayTournamentChampion = displayTeamAlias(summary.tournamentChampion, summary.config.teamName, displayTeamName, summary.config.userName);
  const displayBracket = summary.tournamentBracket?.map((match) => ({
    ...match,
    homeName: displayTeamAlias(match.homeName, summary.config.teamName, displayTeamName, summary.config.userName) ?? match.homeName,
    awayName: displayTeamAlias(match.awayName, summary.config.teamName, displayTeamName, summary.config.userName) ?? match.awayName,
    winnerName: displayTeamAlias(match.winnerName, summary.config.teamName, displayTeamName, summary.config.userName) ?? match.winnerName
  }));

  return (
    <main className="editorial-shell py-6">
      <section className="border-b border-black pb-5">
        <p className="editorial-kicker">Resultado final</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="editorial-page-title">{summary.champion ? "Campeao" : summary.stageReached}</h1>
            <p className="mt-2 text-slate-300">{summary.config.userName} comandou o {displayTeamName}</p>
            {summary.champion && <p className="mt-2 text-xl font-black text-gold">Seu clube levantou a Liga dos Craques.</p>}
            {!summary.champion && summary.tournamentChampion && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xl font-black text-gold">
                <span>Campeao da Liga dos Craques:</span><TeamNameWithCrest showCrest={false} name={displayTournamentChampion ?? summary.tournamentChampion} size="sm" textClassName="font-black" />
              </p>
            )}
          </div>
          <div className="border-l border-gold/30 px-5 py-2 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Taças da Liga</p>
            <p className="font-display text-4xl font-black">{stats.trophies}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-4">
          <Metric label="Campanha" value={`${stats.wins}V ${stats.draws}E ${stats.losses}D`} />
          <Metric label="Gols marcados" value={stats.goalsFor} />
          <Metric label="Gols sofridos" value={stats.goalsAgainst} />
          <Metric label="Tecnico" value={summary.coach?.name ?? "Sem tecnico"} />
          <Metric label="Campeao da Liga dos Craques" value={displayTournamentChampion ?? (summary.champion ? displayTeamName : "A definir")} />
          <Metric label={`Artilheiro ${displayTeamName}`} value={stats.teamTopScorer} />
          <Metric label="Melhor jogador" value={summary.matches.at(-1)?.bestPlayer ?? "Craque ou Bagre"} />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/jogar" onClick={reset}><Button>Jogar novamente</Button></Link>
          <Link href="/historico"><Button variant="secondary">Ver galeria</Button></Link>
        </div>
      </section>

      <SquadResultCard summary={summary} teamName={displayTeamName} wins={stats.wins} draws={stats.draws} losses={stats.losses} />

      <section className="mt-5 grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] md:grid-cols-3">
        {unlocked.map((item) => <article key={item.id} className="bg-night/90 p-4"><h3 className="font-black text-gold">{item.name}</h3><p className="mt-1 text-sm text-slate-300">{item.description}</p></article>)}
      </section>

      {displayBracket && displayBracket.length > 0 && (
        <KnockoutBracket bracket={displayBracket} champion={displayTournamentChampion} customTeamName={displayTeamName} emblemId={currentUser?.emblemId} />
      )}

      <section className="mt-6 border border-black bg-white p-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">Jogos realizados</p>
        <div className="mt-4 grid gap-3">
          {summary.matches.map((match) => (
            <article key={match.id} className="rounded-md border border-white/10 bg-night/55 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">{match.phase}</p>
                  <p className="flex min-w-0 flex-wrap items-center gap-2 font-black">
                    <span>{displayTeamName} x</span><TeamNameWithCrest showCrest={false} name={displayTeamAlias(match.opponentName, summary.config.teamName, displayTeamName, summary.config.userName) ?? match.opponentName} size="sm" textClassName="font-black" />
                  </p>
                </div>
                <p className="font-mono text-2xl font-black text-gold">{match.userGoals}-{match.opponentGoals}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-6">
        <AdBanner />
      </div>
    </main>
  );
}

function KnockoutBracket({ bracket, champion, customTeamName, emblemId }: { bracket: BracketMatch[]; champion?: string; customTeamName: string; emblemId?: string }) {
  const phases = [
    { name: "Oitavas de final", label: "Oitavas" },
    { name: "Quartas de final", label: "Quartas" },
    { name: "Semifinal", label: "Semifinal" },
    { name: "Final", label: "Final" }
  ];
  return (
    <section className="mt-6 overflow-hidden border border-black bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Chaveamento da Liga dos Craques</p>
          <h2 className="mt-1 text-3xl font-black">Mata-mata ate o campeao</h2>
        </div>
        {champion && (
          <div className="border border-black bg-[var(--accent)] px-4 py-3 text-black">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black">Campeao</p>
            <div className="max-w-[260px] text-sm font-black text-black"><TeamNameWithCrest showCrest={false} name={champion} emblemId={champion === customTeamName ? emblemId : undefined} size="sm" textClassName="!text-black" showUnknown allowWrap /></div>
          </div>
        )}
      </div>
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[920px] grid-cols-[1.15fr_.95fr_.85fr_.75fr] items-start gap-4">
          {phases.map((phase) => (
            <div key={phase.name} className="border border-black bg-[var(--background)] p-3">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-black">{phase.label}</p>
              <div className="grid min-h-[650px]" style={{ gridTemplateRows: "repeat(16, minmax(0, 1fr))" }}>
                {bracket.filter((match) => match.phase === phase.name).map((match, index) => (
                  <div key={match.id} style={{ gridRow: `${bracketRowStart(phase.name, index)} / span 2` }}>
                    <FinalBracketMatch match={match} customTeamName={customTeamName} emblemId={emblemId} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function bracketRowStart(phase: string, index: number) {
  if (phase === "Oitavas de final") return index * 2 + 1;
  if (phase === "Quartas de final") return index * 4 + 2;
  if (phase === "Semifinal") return index * 8 + 4;
  return 8;
}

function FinalBracketMatch({ match, customTeamName, emblemId }: { match: BracketMatch; customTeamName: string; emblemId?: string }) {
  return (
    <article className="border border-black bg-white px-3 py-2 text-sm">
      <div className={`grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 border-b border-white/10 pb-1.5 ${match.winnerName === match.homeName ? "text-white" : "text-slate-400"}`}>
        <TeamNameWithCrest showCrest={false} name={match.homeName} emblemId={match.homeName === customTeamName ? emblemId : undefined} size="sm" textClassName="text-[11px] font-black" showUnknown allowWrap />
        <span className="text-right font-mono font-black text-gold">{match.homeGoals}</span>
      </div>
      <div className={`grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 pt-1.5 ${match.winnerName === match.awayName ? "text-white" : "text-slate-400"}`}>
        <TeamNameWithCrest showCrest={false} name={match.awayName} emblemId={match.awayName === customTeamName ? emblemId : undefined} size="sm" textClassName="text-[11px] font-black" showUnknown allowWrap />
        <span className="text-right font-mono font-black text-gold">{match.awayGoals}</span>
      </div>
    </article>
  );
}

function campaignStats(summary: CampaignSummary, history: CampaignSummary[]) {
  const wins = summary.matches.filter((match) => match.userGoals > match.opponentGoals).length;
  const draws = summary.matches.filter((match) => match.userGoals === match.opponentGoals).length;
  const losses = summary.matches.length - wins - draws;
  const goalsFor = summary.matches.reduce((sum, match) => sum + match.userGoals, 0);
  const goalsAgainst = summary.matches.reduce((sum, match) => sum + match.opponentGoals, 0);
  const teamScorers = scorerTable(summary.matches.flatMap((match) => match.events.filter((event) => event.team === "user")));
  const trophies = history.filter((item) => item.champion && item.config.userName === summary.config.userName && item.config.teamName === summary.config.teamName).length || (summary.champion ? 1 : 0);
  return {
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    trophies,
    teamTopScorer: teamScorers[0] ? `${teamScorers[0].name} (${teamScorers[0].goals})` : "Sem gols"
  };
}

function scorerTable(events: MatchEvent[]) {
  const table = events.reduce<Record<string, number>>((acc, event) => {
    if (event.type !== "goal") return acc;
    const name = event.playerName ?? "Coletivo";
    if (["Meia atacante", "Ponta direita", "Camisa 9", "Capitao"].includes(name)) return acc;
    acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(table)
    .map(([name, goals]) => ({ name, goals }))
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name));
}

function displayTeamAlias(name: string | undefined, storedTeamName: string, displayTeamName: string, userName: string) {
  if (!name) return undefined;
  return name === storedTeamName || name === userName ? displayTeamName : name;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="bg-white p-4"><p className="break-words font-display text-xl font-black uppercase leading-tight">{value}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p></div>;
}

function SquadResultCard({
  summary,
  teamName,
  wins,
  draws,
  losses
}: {
  summary: CampaignSummary;
  teamName: string;
  wins: number;
  draws: number;
  losses: number;
}) {
  return (
    <section className="mt-6 border border-black bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/20 pb-4">
        <div>
          <p className="editorial-kicker">Card final do elenco</p>
          <h2 className="mt-2 font-display text-3xl font-black uppercase">{teamName}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{summary.stageReached} · {wins}V {draws}E {losses}D</p>
        </div>
        <div className="grid h-12 w-12 place-items-center border border-black bg-[var(--accent)] text-white">
          <Trophy size={24} aria-hidden />
        </div>
      </div>
      <div className="mt-4 grid gap-px border border-black/20 bg-black/20 sm:grid-cols-2 lg:grid-cols-3">
        {summary.squad.map((pick) => (
          <article key={`${pick.slotId}-${pick.player.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-white px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{pick.player.name}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">{pick.clubSeason.clubName} {pick.clubSeason.season}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-lg font-black text-[var(--accent)]">{pick.effectiveRating}</p>
              <p className="text-[9px] font-black uppercase">{positionLabel(pick.slotPosition)}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
