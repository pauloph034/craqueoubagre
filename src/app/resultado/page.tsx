"use client";

import { AdBanner } from "@/components/AdBanner";
import { TeamNameWithCrest } from "@/components/game/TeamNameWithCrest";
import { Button } from "@/components/ui/button";
import { achievements } from "@/data/loaders";
import { useGameStore } from "@/stores/game-store";
import type { BracketMatch, CampaignSummary, MatchEvent } from "@/types/game";
import Link from "next/link";

export default function ResultPage() {
  const summary = useGameStore((state) => state.lastSummary);
  const history = useGameStore((state) => state.history);
  const currentUser = useGameStore((state) => state.currentUser);
  const reset = useGameStore((state) => state.reset);

  if (!summary) return <main className="mx-auto max-w-4xl px-4 py-10"><p>Nenhum resultado carregado.</p><Link href="/jogar"><Button className="mt-4">Jogar</Button></Link></main>;

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
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-lg border border-white/12 bg-white/[0.07] p-6 shadow-card">
        <p className="text-sm uppercase text-gold">Resultado final</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black">{summary.champion ? "Campeao" : summary.stageReached}</h1>
            <p className="mt-2 text-slate-300">{summary.config.userName} comandou o {displayTeamName}</p>
            {summary.champion && <p className="mt-2 text-xl font-black text-gold">Seu clube levantou a Champions.</p>}
            {!summary.champion && summary.tournamentChampion && (
              <p className="mt-2 flex flex-wrap items-center gap-2 text-xl font-black text-gold">
                <span>Campeao da Champions:</span><TeamNameWithCrest name={displayTournamentChampion ?? summary.tournamentChampion} size="sm" textClassName="font-black" />
              </p>
            )}
          </div>
          <div className="rounded-md border border-gold/30 bg-gold/10 px-5 py-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Tacas Champions</p>
            <p className="font-mono text-5xl font-black text-white">{stats.trophies}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Metric label="Campanha" value={`${stats.wins}V ${stats.draws}E ${stats.losses}D`} />
          <Metric label="Gols marcados" value={stats.goalsFor} />
          <Metric label="Gols sofridos" value={stats.goalsAgainst} />
          <Metric label="Tecnico" value={summary.coach?.name ?? "Sem tecnico"} />
          <Metric label="Campeao da Champions" value={displayTournamentChampion ?? (summary.champion ? displayTeamName : "A definir")} />
          <Metric label={`Artilheiro ${displayTeamName}`} value={stats.teamTopScorer} />
          <Metric label="Melhor jogador" value={summary.matches.at(-1)?.bestPlayer ?? "Craque ou Bagre"} />
        </div>

        <div className="mt-6 rounded-lg border border-white/10 bg-night/70 p-5">
          <h2 className="text-xl font-black">Galeria do clube</h2>
          <p className="mt-2 text-slate-300">
            {displayTeamName} tem {stats.trophies} taca(s) da Champions no perfil de {summary.config.userName}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: Math.max(1, stats.trophies) }).map((_, index) => (
              <span key={index} className={index < stats.trophies ? "grid h-12 w-12 place-items-center rounded-full border border-gold bg-gold/20 text-2xl" : "grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl opacity-35"}>
                T
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={reset}>Jogar novamente</Button>
          <Button variant="secondary" onClick={() => navigator.clipboard?.writeText(`Craque ou Bagre - ${displayTeamName}: ${summary.score} pontos`)}>
            Compartilhar resultado
          </Button>
          <Link href="/historico"><Button variant="secondary">Ver galeria</Button></Link>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        {unlocked.map((item) => <article key={item.id} className="rounded-lg border border-white/12 bg-white/[0.06] p-4"><h3 className="font-black text-gold">{item.name}</h3><p className="mt-1 text-sm text-slate-300">{item.description}</p></article>)}
      </section>

      {displayBracket && displayBracket.length > 0 && (
        <KnockoutBracket bracket={displayBracket} champion={displayTournamentChampion} />
      )}

      <section className="mt-6 rounded-lg border border-white/12 bg-white/[0.06] p-5 shadow-card">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-200">Jogos realizados</p>
        <div className="mt-4 grid gap-3">
          {summary.matches.map((match) => (
            <article key={match.id} className="rounded-md border border-white/10 bg-night/55 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">{match.phase}</p>
                  <p className="flex min-w-0 flex-wrap items-center gap-2 font-black">
                    <span>{displayTeamName} x</span><TeamNameWithCrest name={displayTeamAlias(match.opponentName, summary.config.teamName, displayTeamName, summary.config.userName) ?? match.opponentName} size="sm" textClassName="font-black" />
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

function KnockoutBracket({ bracket, champion }: { bracket: BracketMatch[]; champion?: string }) {
  const phases = [
    { name: "Oitavas de final", label: "Oitavas" },
    { name: "Quartas de final", label: "Quartas" },
    { name: "Semifinal", label: "Semifinal" },
    { name: "Final", label: "Final" }
  ];
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-emerald-300/20 bg-[radial-gradient(circle_at_86%_18%,rgba(17,255,184,.16),transparent_24%),radial-gradient(circle_at_12%_80%,rgba(40,184,255,.12),transparent_28%),linear-gradient(135deg,rgba(4,18,43,.98),rgba(3,46,52,.88)_58%,rgba(5,10,32,.98))] p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Chaveamento da Champions</p>
          <h2 className="mt-1 text-3xl font-black">Mata-mata ate o campeao</h2>
        </div>
        {champion && (
          <div className="rounded-lg border border-gold/35 bg-gold/10 px-4 py-3 shadow-[0_0_24px_rgba(248,198,48,.12)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gold">Campeao</p>
            <p className="max-w-[220px] truncate font-black"><TeamNameWithCrest name={champion} size="sm" /></p>
          </div>
        )}
      </div>
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[920px] grid-cols-[1.15fr_.95fr_.85fr_.75fr] items-start gap-4">
          {phases.map((phase) => (
            <div key={phase.name} className="rounded-lg border border-emerald-300/10 bg-night/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-sky-200">{phase.label}</p>
              <div className="grid min-h-[650px]" style={{ gridTemplateRows: "repeat(16, minmax(0, 1fr))" }}>
                {bracket.filter((match) => match.phase === phase.name).map((match, index) => (
                  <div key={match.id} style={{ gridRow: `${bracketRowStart(phase.name, index)} / span 2` }}>
                    <FinalBracketMatch match={match} />
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

function FinalBracketMatch({ match }: { match: BracketMatch }) {
  return (
    <article className="rounded-md border border-emerald-300/14 bg-white/[0.055] px-3 py-2 text-sm shadow-[0_0_18px_rgba(17,255,184,.08)]">
      <div className={`grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 border-b border-white/10 pb-1.5 ${match.winnerName === match.homeName ? "text-white" : "text-slate-400"}`}>
        <TeamNameWithCrest name={match.homeName} size="sm" textClassName="font-black" />
        <span className="text-right font-mono font-black text-gold">{match.homeGoals}</span>
      </div>
      <div className={`grid grid-cols-[minmax(0,1fr)_2rem] items-center gap-2 pt-1.5 ${match.winnerName === match.awayName ? "text-white" : "text-slate-400"}`}>
        <TeamNameWithCrest name={match.awayName} size="sm" textClassName="font-black" />
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
  return <div className="rounded bg-night/75 p-4"><p className="break-words text-2xl font-black">{value}</p><p className="text-sm text-slate-400">{label}</p></div>;
}
