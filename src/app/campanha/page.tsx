"use client";

import { TeamNameWithCrest } from "@/components/game/TeamNameWithCrest";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import type { BracketMatch, GroupStanding, MatchEvent, MatchResult } from "@/types/game";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TimelineItem = {
  minute: number;
  label: string;
  kind: "kickoff" | "halftime" | "event" | "fulltime";
  event?: MatchEvent;
};

export default function CampaignPage() {
  const summary = useGameStore((state) => state.lastSummary);
  const config = useGameStore((state) => state.config);
  const currentUser = useGameStore((state) => state.currentUser);
  const selectedCoach = useGameStore((state) => state.selectedCoach);
  const loadActiveCampaign = useGameStore((state) => state.loadActiveCampaign);
  const startCampaign = useGameStore((state) => state.startCampaign);
  const simulateNextMatch = useGameStore((state) => state.simulateNextMatch);
  const revealGroupTable = useGameStore((state) => state.revealGroupTable);
  const continueAfterGroup = useGameStore((state) => state.continueAfterGroup);
  const schedule = useGameStore((state) => state.campaignSchedule);
  const matches = useGameStore((state) => state.campaignMatches);
  const step = useGameStore((state) => state.campaignStep);
  const showGroupTable = useGameStore((state) => state.showGroupTable);
  const groupTables = useGameStore((state) => state.groupTables);
  const qualifiedTeams = useGameStore((state) => state.qualifiedTeams);
  const phase = useGameStore((state) => state.phase);
  const [revealed, setRevealed] = useState(1);
  const [completedReplayIds, setCompletedReplayIds] = useState<string[]>([]);

  useEffect(() => {
    loadActiveCampaign();
  }, [loadActiveCampaign]);

  const rawDisplayMatches = phase === "campaignFinished" ? summary?.matches ?? matches : matches;
  const activeMatch = rawDisplayMatches.at(-1);
  const inKnockout = phase === "simulating" && !showGroupTable && qualifiedTeams.length > 0 && matches.length >= 3 && step >= 3;
  const activeKnockoutMatch = inKnockout ? rawDisplayMatches.filter((match) => isKnockoutPhase(match.phase)).at(-1) : undefined;
  const visibleMatch = inKnockout ? activeKnockoutMatch : activeMatch;
  const activeMatchId = visibleMatch?.id;
  const timeline = useMemo(() => (visibleMatch ? buildTimeline(visibleMatch) : []), [visibleMatch]);
  const replayFinished = Boolean(visibleMatch && revealed >= timeline.length);
  const replayPending = Boolean(visibleMatch && !completedReplayIds.includes(visibleMatch.id));
  const currentScheduleItem = schedule[step];
  const finishingKnockoutReplay = phase === "campaignFinished" && Boolean(activeMatch && replayPending && isKnockoutPhase(activeMatch.phase) && qualifiedTeams.length > 0);

  useEffect(() => {
    if (activeMatchId && !completedReplayIds.includes(activeMatchId)) setRevealed(1);
  }, [activeMatchId, completedReplayIds]);

  useEffect(() => {
    if (!replayPending || replayFinished || showGroupTable) return;
    const delay = 1000 + Math.round(Math.random() * 500);
    const timer = window.setTimeout(() => setRevealed((value) => Math.min(value + 1, timeline.length)), delay);
    return () => window.clearTimeout(timer);
  }, [replayPending, replayFinished, showGroupTable, timeline.length, revealed]);

  useEffect(() => {
    if (!activeMatch || !replayPending || !replayFinished) return;
    const timer = window.setTimeout(() => {
      setCompletedReplayIds((items) => (items.includes(activeMatch.id) ? items : [...items, activeMatch.id]));
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [activeMatch, replayPending, replayFinished]);

  useEffect(() => {
    if (phase === "simulating" && !showGroupTable && !replayPending && qualifiedTeams.length === 0 && matches.length === 3 && step === 3) {
      const timer = window.setTimeout(() => revealGroupTable(), 800);
      return () => window.clearTimeout(timer);
    }
  }, [matches.length, phase, qualifiedTeams.length, replayPending, revealGroupTable, showGroupTable, step]);

  const waitingForGroupTable = qualifiedTeams.length === 0 && matches.length === 3 && step === 3;
  const canStartNext = phase === "simulating" && !showGroupTable && !replayPending && Boolean(currentScheduleItem) && !waitingForGroupTable;
  const accountTeamName = currentUser?.role === "player" ? currentUser.teamName ?? `${currentUser.username} FC` : config.teamName;
  const displayTeamName = currentUser?.role === "player" && config.teamName === currentUser.username ? accountTeamName : config.teamName;
  const displayQualifiedTeams = qualifiedTeams.map((name) => displayTeamAlias(name, config.teamName, displayTeamName, config.userName) ?? name);
  const displaySchedule = schedule.map((item) => ({
    ...item,
    opponent: { ...item.opponent, name: displayTeamAlias(item.opponent.name, config.teamName, displayTeamName, config.userName) ?? item.opponent.name }
  }));
  const displayCurrentScheduleItem = currentScheduleItem
    ? {
        ...currentScheduleItem,
        opponent: { ...currentScheduleItem.opponent, name: displayTeamAlias(currentScheduleItem.opponent.name, config.teamName, displayTeamName, config.userName) ?? currentScheduleItem.opponent.name }
      }
    : undefined;
  const displayMatches = rawDisplayMatches.map((match) => ({
    ...match,
    opponentName: displayTeamAlias(match.opponentName, config.teamName, displayTeamName, config.userName) ?? match.opponentName
  }));
  const displayActiveMatch = displayMatches.at(-1);
  const displayActiveKnockoutMatch = inKnockout ? displayMatches.filter((match) => isKnockoutPhase(match.phase)).at(-1) : undefined;
  const displaySummaryBracket = summary?.tournamentBracket?.map((match) => ({
    ...match,
    homeName: displayTeamAlias(match.homeName, config.teamName, displayTeamName, config.userName) ?? match.homeName,
    awayName: displayTeamAlias(match.awayName, config.teamName, displayTeamName, config.userName) ?? match.awayName,
    winnerName: displayTeamAlias(match.winnerName, config.teamName, displayTeamName, config.userName) ?? match.winnerName
  }));
  const displayTournamentChampion = displayTeamAlias(summary?.tournamentChampion, config.teamName, displayTeamName, config.userName);

  if (phase !== "campaignReady" && phase !== "simulating" && phase !== "campaignFinished") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-white/12 bg-white/[0.07] p-6 shadow-card">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-gold">Campanha bloqueada</p>
          <h1 className="mt-2 text-3xl font-black">Monte o elenco antes de simular</h1>
          <p className="mt-2 text-slate-300">Escolha os 11 jogadores e confirme o tecnico para liberar a fase de grupos.</p>
          <Link href="/jogar"><Button className="mt-4">Voltar ao draft</Button></Link>
        </section>
      </main>
    );
  }

  if (!summary && phase === "campaignFinished") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        <section className="rounded-lg border border-white/12 bg-white/[0.07] p-6">
          <h1 className="text-3xl font-black">Campanha</h1>
          <p className="mt-2 text-slate-300">Nenhum resumo final encontrado.</p>
          <Link href="/jogar"><Button className="mt-4">Voltar ao draft</Button></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(5,22,49,.82),rgba(2,48,52,.56))] p-6 shadow-card">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Simulacao da campanha</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">{displayTeamName} em campo</h1>
            <p className="mt-1 text-slate-300">Tecnico: {selectedCoach ? `${selectedCoach.name} (${selectedCoach.clubName} ${selectedCoach.season})` : "nao definido"}</p>
          </div>
          {phase === "campaignReady" && (
            <Button disabled={!selectedCoach} onClick={startCampaign}>
              Iniciar campanha
            </Button>
          )}
          {phase === "campaignFinished" && !replayPending && (
            <Link href="/resultado"><Button>Ver resultado final</Button></Link>
          )}
        </div>
      </section>

      {showGroupTable ? (
        <GroupTable teamName={config.teamName} displayTeamName={displayTeamName} matches={matches.slice(0, 3)} groupTables={groupTables} qualifiedTeams={qualifiedTeams} onContinue={continueAfterGroup} />
      ) : finishingKnockoutReplay ? (
        <KnockoutRoad
          teamName={displayTeamName}
          qualifiedTeams={displayQualifiedTeams}
          schedule={displaySchedule}
          matches={displayMatches}
          currentScheduleItem={undefined}
          activeMatch={displayActiveMatch}
          timeline={timeline}
          revealed={revealed}
          replayPending={replayPending}
          canStartNext={false}
          onStartNext={simulateNextMatch}
        />
      ) : phase === "campaignFinished" && activeMatch && replayPending ? (
        <section className="mt-6">
          <LiveMatchCard match={displayActiveMatch ?? activeMatch} timeline={timeline} revealed={revealed} teamName={displayTeamName} />
        </section>
      ) : phase === "campaignFinished" && summary?.champion ? (
        <ChampionCelebration teamName={displayTeamName} />
      ) : phase === "campaignFinished" && displaySummaryBracket?.length ? (
        <KnockoutBracket bracket={displaySummaryBracket} champion={displayTournamentChampion} />
      ) : inKnockout ? (
        <KnockoutRoad
          teamName={displayTeamName}
          qualifiedTeams={displayQualifiedTeams}
          schedule={displaySchedule}
          matches={displayMatches}
          currentScheduleItem={displayCurrentScheduleItem}
          activeMatch={displayActiveKnockoutMatch}
          timeline={timeline}
          revealed={revealed}
          replayPending={replayPending}
          canStartNext={canStartNext}
          onStartNext={simulateNextMatch}
        />
      ) : (
        <section className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {activeMatch ? (
              <LiveMatchCard match={displayActiveMatch ?? activeMatch} timeline={timeline} revealed={revealed} teamName={displayTeamName} />
            ) : (
              <WaitingCard phase={displayCurrentScheduleItem?.phase ?? "Fase de grupos"} opponentName={displayCurrentScheduleItem?.opponent.name} teamName={displayTeamName} onStart={canStartNext ? simulateNextMatch : undefined} />
            )}
            {activeMatch && canStartNext && (
              <Button className="w-full sm:w-auto" onClick={simulateNextMatch}>Comecar proxima partida</Button>
            )}
          </div>
          <CampaignSidebar
            teamName={displayTeamName}
            schedule={displaySchedule}
            matches={displayMatches}
            activeMatchId={activeMatch?.id}
            completedReplayIds={completedReplayIds}
          />
        </section>
      )}
    </main>
  );
}

function ChampionCelebration({ teamName }: { teamName: string }) {
  return (
    <section className="mt-6 overflow-hidden rounded-lg border border-gold/40 bg-[radial-gradient(circle_at_top,_rgba(248,198,48,.28),_transparent_42%),rgba(255,255,255,.07)] p-8 text-center shadow-card">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-gold">Campeao da Liga dos Craques</p>
      <h2 className="mt-3 text-5xl font-black">{teamName}</h2>
      <div className="mx-auto mt-6 grid h-28 w-28 place-items-center rounded-full border border-gold bg-gold/20 text-6xl font-black text-gold shadow-[0_0_50px_rgba(248,198,48,.25)]">
        T
      </div>
      <p className="mt-5 text-slate-200">Campanha concluida. O titulo veio para sua galeria.</p>
      <Link href="/resultado"><Button className="mt-6">Ver resultado final</Button></Link>
    </section>
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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Chaveamento</p>
          <h2 className="mt-1 text-3xl font-black">Mata-mata simulado</h2>
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
      <Link href="/resultado"><Button className="mt-5">Ver resultado final</Button></Link>
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

function WaitingCard({ phase, opponentName, teamName, onStart }: { phase: string; opponentName?: string; teamName: string; onStart?: () => void }) {
  return (
    <article className="rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(5,22,49,.96),rgba(2,44,51,.9))] p-6 shadow-card">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{phase}</p>
      <h2 className="mt-2 flex flex-wrap items-center gap-2 text-3xl font-black">
        {opponentName ? <><span>{teamName} x</span><TeamNameWithCrest name={opponentName} size="md" textClassName="font-black" /></> : "Preparando tabela"}
      </h2>
      <p className="mt-4 text-slate-300">Clique para iniciar quando estiver pronto.</p>
      {onStart && <Button className="mt-5" onClick={onStart}>Comecar partida</Button>}
    </article>
  );
}

function CampaignSidebar({
  teamName,
  schedule,
  matches,
  activeMatchId,
  completedReplayIds
}: {
  teamName: string;
  schedule: ReturnType<typeof useGameStore.getState>["campaignSchedule"];
  matches: MatchResult[];
  activeMatchId?: string;
  completedReplayIds: string[];
}) {
  const rows = schedule.length > 0 ? schedule.slice(0, 3) : matches.slice(0, 3).map((match) => ({ phase: match.phase, opponent: { name: match.opponentName }, knockout: false }));
  return (
    <aside className="rounded-lg border border-emerald-300/18 bg-[linear-gradient(135deg,rgba(5,22,49,.78),rgba(2,48,52,.58))] p-4 shadow-card">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">Jogos da campanha</p>
      <div className="mt-4 space-y-2">
        {rows.map((item, index) => {
          const match = matches[index];
          const active = match?.id === activeMatchId;
          const completed = Boolean(match && completedReplayIds.includes(match.id));
          const hideFutureKnockout = !match && "knockout" in item && item.knockout && matches.length < 3;
          const opponentName = match?.opponentName ?? item.opponent.name;
          return (
            <div key={`${item.phase}-${index}`} className={`rounded-md border px-3 py-3 ${active ? "border-gold bg-gold/12" : "border-emerald-300/15 bg-night/55"} ${!match ? "opacity-60" : ""}`}>
              <div className="grid grid-cols-[minmax(0,1fr)_4.5rem] items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase text-slate-400">{item.phase}</p>
                  <p className="flex min-w-0 items-center gap-1 font-black">
                    {hideFutureKnockout ? "A definir" : <><span className="truncate">{teamName} x</span><TeamNameWithCrest name={opponentName} size="sm" textClassName="font-black" /></>}
                  </p>
                </div>
                <span className="whitespace-nowrap text-right font-mono text-xl font-black leading-none text-gold">
                  {completed && match ? `${match.userGoals}-${match.opponentGoals}` : active ? "ao vivo" : "--"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function KnockoutRoad({
  teamName,
  qualifiedTeams,
  schedule,
  matches,
  currentScheduleItem,
  activeMatch,
  timeline,
  revealed,
  replayPending,
  canStartNext,
  onStartNext
}: {
  teamName: string;
  qualifiedTeams: string[];
  schedule: ReturnType<typeof useGameStore.getState>["campaignSchedule"];
  matches: MatchResult[];
  currentScheduleItem?: ReturnType<typeof useGameStore.getState>["campaignSchedule"][number];
  activeMatch?: MatchResult;
  timeline: TimelineItem[];
  revealed: number;
  replayPending: boolean;
  canStartNext: boolean;
  onStartNext: () => void;
}) {
  const knockoutMatches = matches.filter((match) => isKnockoutPhase(match.phase) && (!replayPending || match.id !== activeMatch?.id));
  return (
    <section className="mt-6 space-y-4">
      <div className="rounded-xl border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(5,22,49,.92),rgba(2,48,52,.74))] p-4 shadow-card">
        {activeMatch ? (
          <CompactMatchPanel match={activeMatch} timeline={timeline} revealed={revealed} teamName={teamName} />
        ) : (
          <CompactWaitingPanel phase={currentScheduleItem?.phase ?? "Oitavas de final"} opponentName={currentScheduleItem?.opponent.name} teamName={teamName} onStart={onStartNext} />
        )}
        {activeMatch && !replayPending && canStartNext && (
          <Button className="mt-4 w-full sm:w-auto" onClick={onStartNext}>Prosseguir para {currentScheduleItem?.phase ?? "proxima fase"}</Button>
        )}
      </div>
      <LiveKnockoutBracket teamName={teamName} qualifiedTeams={qualifiedTeams} schedule={schedule} knockoutMatches={knockoutMatches} />
    </section>
  );
}

function CompactWaitingPanel({ phase, opponentName, teamName, onStart }: { phase: string; opponentName?: string; teamName: string; onStart: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{phase}</p>
        <h3 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-black">
          {opponentName ? <><span>{teamName} x</span><TeamNameWithCrest name={opponentName} size="sm" textClassName="font-black" /></> : "Proximo confronto"}
        </h3>
        <p className="mt-1 text-sm text-slate-300">Clique para iniciar. Os proximos confrontos ficam ocultos ate a classificacao.</p>
      </div>
      <Button className="w-full sm:w-auto" onClick={onStart}>Comecar partida</Button>
    </div>
  );
}

function CompactMatchPanel({ match, timeline, revealed, teamName }: { match: MatchResult; timeline: TimelineItem[]; revealed: number; teamName: string }) {
  const visible = timeline.slice(0, revealed);
  const finished = visible.some((item) => item.kind === "fulltime");
  const userGoals = finished ? match.userGoals : visible.filter((item) => item.event?.type === "goal" && item.event.team === "user").length;
  const opponentGoals = finished ? match.opponentGoals : visible.filter((item) => item.event?.type === "goal" && item.event.team === "opponent").length;
  const currentMinute = visible.at(-1)?.minute ?? 0;
  const currentItem = visible.at(-1);
  const currentGoalEvent = currentItem?.event?.type === "goal" ? currentItem.event : undefined;
  const currentLabel = currentGoalEvent
    ? formatEventLabel(currentGoalEvent, teamName, match.opponentName)
    : currentItem?.kind === "fulltime"
      ? "Fim de jogo"
      : currentItem?.kind === "halftime"
        ? "Intervalo"
        : currentItem?.label ?? "Bola rolando";
  const progress = Math.min(100, Math.round((currentMinute / (match.events.some((event) => event.minute > 90) ? 120 : 90)) * 100));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{match.phase}</p>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 text-lg font-black leading-tight">
            <span>{teamName} x</span><TeamNameWithCrest name={match.opponentName} size="sm" textClassName="font-black" />
          </h3>
        </div>
        <div className="flex items-end gap-3">
          <span className="font-mono text-sm font-black text-emerald-300">{currentMinute}'</span>
          <span className="whitespace-nowrap font-mono text-3xl font-black leading-none text-gold">{userGoals} - {opponentGoals}</span>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-electric to-gold transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className={`mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${currentGoalEvent ? "border-gold/50 bg-gold/12 text-white" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${currentGoalEvent ? "bg-gold shadow-[0_0_14px_rgba(248,198,48,.65)]" : "bg-emerald-300/70"}`} />
        <span className="font-mono text-xs text-emerald-200">{currentMinute}'</span>
        <span className="font-medium">{currentLabel}</span>
      </div>
    </div>
  );
}

function LiveKnockoutBracket({
  teamName,
  qualifiedTeams,
  schedule,
  knockoutMatches
}: {
  teamName: string;
  qualifiedTeams: string[];
  schedule: ReturnType<typeof useGameStore.getState>["campaignSchedule"];
  knockoutMatches: MatchResult[];
}) {
  const pairs = knockoutPairs(teamName, qualifiedTeams, schedule, knockoutMatches);
  const columns = [
    { title: "Oitavas", pairs: pairs.round16 },
    { title: "Quartas", pairs: pairs.quarters },
    { title: "Semi", pairs: pairs.semis },
    { title: "Final", pairs: pairs.final }
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-emerald-300/20 bg-[radial-gradient(circle_at_85%_25%,rgba(17,255,184,.16),transparent_22%),radial-gradient(circle_at_88%_62%,rgba(40,184,255,.14),transparent_24%),linear-gradient(135deg,rgba(4,18,43,.98),rgba(3,46,52,.92)_55%,rgba(5,10,32,.98))] p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Mata-mata</p>
          <h2 className="text-3xl font-black">Chaveamento da Liga dos Craques</h2>
        </div>
        <div className="rounded-full border border-gold/40 bg-gold/10 px-5 py-3 text-3xl text-gold shadow-[0_0_28px_rgba(248,198,48,.12)]">T</div>
      </div>
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="grid min-w-[920px] grid-cols-[1.15fr_.95fr_.85fr_.75fr] items-start gap-4">
          {columns.map((column) => (
            <div key={column.title} className="min-h-[440px] rounded-lg border border-emerald-300/10 bg-night/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-200">{column.title}</p>
              <div className={column.title === "Oitavas" ? "mt-3 space-y-2" : column.title === "Quartas" ? "mt-3 space-y-5 pt-5" : column.title === "Semi" ? "mt-3 space-y-12 pt-16" : "mt-3 pt-32"}>
                {column.pairs.map((pair, index) => (
                  <BracketPair key={`${column.title}-${index}`} pair={pair} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type KnockoutPairView = {
  home: string;
  away: string;
  homeGoals?: number;
  awayGoals?: number;
  winner?: string;
  live?: boolean;
};

function BracketPair({ pair }: { pair: KnockoutPairView }) {
  return (
    <article className={`relative rounded-md border p-2 text-[11px] font-black uppercase shadow-[0_0_18px_rgba(17,255,184,.1)] ${pair.live ? "border-gold/60 bg-gold/12" : "border-emerald-300/18 bg-white/[0.055]"}`}>
      <p className={`flex items-center justify-between gap-2 border-b border-white/10 pb-1 ${pair.winner === pair.home ? "text-white" : "text-slate-400"}`}>
        <TeamNameWithCrest name={pair.home} size="sm" textClassName="font-black" />
        {pair.homeGoals !== undefined && <span className="shrink-0 font-mono text-gold">{pair.homeGoals}</span>}
      </p>
      <p className={`flex items-center justify-between gap-2 pt-1 ${pair.winner === pair.away ? "text-white" : "text-slate-400"}`}>
        <TeamNameWithCrest name={pair.away} size="sm" textClassName="font-black" />
        {pair.awayGoals !== undefined && <span className="shrink-0 font-mono text-gold">{pair.awayGoals}</span>}
      </p>
      <span className="absolute -right-4 top-1/2 hidden h-px w-4 bg-emerald-300/45 sm:block" />
    </article>
  );
}

function knockoutPairs(
  teamName: string,
  qualifiedTeams: string[],
  schedule: ReturnType<typeof useGameStore.getState>["campaignSchedule"],
  knockoutMatches: MatchResult[]
) {
  const pathOpponents = schedule.slice(3).map((item) => item.opponent.name);
  const seeds = knockoutSeedOrder(teamName, qualifiedTeams, pathOpponents);
  const userResults = new Map(knockoutMatches.map((match) => [match.phase, match]));
  const round16Done = userResults.has("Oitavas de final");
  const round16Raw = chunkPairs(seeds);
  const round16 = round16Done ? makeRoundPairs("Oitavas de final", round16Raw, userResults.get("Oitavas de final"), [pathOpponents[1], pathOpponents[2], undefined, pathOpponents[3]]) : pendingPairs(round16Raw);
  const quarterTeams = round16Done ? pairWinners(round16) : [];
  const quartersDone = userResults.has("Quartas de final");
  const quarterRaw = chunkPairs(quarterTeams);
  const quarters = !round16Done ? emptyPairs(4) : quartersDone ? makeRoundPairs("Quartas de final", quarterRaw, userResults.get("Quartas de final"), [pathOpponents[2], pathOpponents[3]]) : pendingPairs(quarterRaw);
  const semiTeams = quartersDone ? pairWinners(quarters) : [];
  const semisDone = userResults.has("Semifinal");
  const semiRaw = chunkPairs(semiTeams);
  const semis = !quartersDone ? emptyPairs(2) : semisDone ? makeRoundPairs("Semifinal", semiRaw, userResults.get("Semifinal"), [pathOpponents[3]]) : pendingPairs(semiRaw);
  const finalTeams = semisDone ? pairWinners(semis) : [];
  const finalDone = userResults.has("Final");
  const finalRaw = chunkPairs(finalTeams);
  const final = !semisDone ? emptyPairs(1) : finalDone ? makeRoundPairs("Final", finalRaw, userResults.get("Final"), []) : pendingPairs(finalRaw);
  return { round16, quarters, semis, final };
}

function knockoutSeedOrder(teamName: string, qualifiedTeams: string[], pathOpponents: string[]) {
  const rest = qualifiedTeams.filter((name) => name !== teamName && !pathOpponents.includes(name));
  const order = [
    teamName,
    pathOpponents[0],
    pathOpponents[1],
    rest[0],
    pathOpponents[2],
    rest[1],
    rest[2],
    rest[3],
    pathOpponents[3],
    rest[4],
    rest[5],
    rest[6],
    rest[7],
    rest[8],
    rest[9],
    rest[10]
  ].filter(Boolean) as string[];
  for (const name of qualifiedTeams) {
    if (!order.includes(name)) order.push(name);
  }
  while (order.length < 16) order.push("A Definir");
  return order.slice(0, 16);
}

function makeRoundPairs(phase: string, rawPairs: [string, string][], userMatch?: MatchResult, forcedWinners: Array<string | undefined> = []): KnockoutPairView[] {
  return rawPairs.map(([home, away], index) => {
    if (index === 0 && userMatch) {
      const winner = userMatch.userGoals > userMatch.opponentGoals ? home : away;
      return { home, away, homeGoals: userMatch.userGoals, awayGoals: userMatch.opponentGoals, winner };
    }
    const forcedWinner = forcedWinners[index - 1];
    return simulatedPair(phase, index, home, away, forcedWinner);
  });
}

function pendingPairs(rawPairs: [string, string][]): KnockoutPairView[] {
  return rawPairs.map(([home, away]) => ({ home, away }));
}

function simulatedPair(phase: string, index: number, home: string, away: string, forcedWinner?: string): KnockoutPairView {
  if (home === "A Definir" || away === "A Definir") return { home, away };
  const base = stableNumber(`${phase}-${index}-${home}-${away}`);
  let homeGoals = base % 4;
  let awayGoals = Math.floor(base / 7) % 4;
  const desiredWinner = forcedWinner && [home, away].includes(forcedWinner) ? forcedWinner : homeGoals >= awayGoals ? home : away;
  if (homeGoals === awayGoals) {
    if (desiredWinner === home) homeGoals += 1;
    else awayGoals += 1;
  } else if (desiredWinner === home && homeGoals < awayGoals) {
    homeGoals = awayGoals + 1;
  } else if (desiredWinner === away && awayGoals < homeGoals) {
    awayGoals = homeGoals + 1;
  }
  return { home, away, homeGoals, awayGoals, winner: desiredWinner };
}

function stableNumber(value: string) {
  return value.split("").reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 9973, 7);
}

function pairWinners(pairs: KnockoutPairView[]) {
  return pairs.map((pair) => pair.winner ?? pair.home).filter((name) => name !== "A Definir");
}

function chunkPairs(items: string[]): [string, string][] {
  return Array.from({ length: Math.ceil(items.length / 2) }).map((_, index) => [items[index * 2] ?? "A Definir", items[index * 2 + 1] ?? "A Definir"]);
}

function emptyPairs(count: number): KnockoutPairView[] {
  return Array.from({ length: count }).map(() => ({ home: "A Definir", away: "A Definir" }));
}

function LiveMatchCard({ match, timeline, revealed, teamName }: { match: MatchResult; timeline: TimelineItem[]; revealed: number; teamName: string }) {
  const visible = timeline.slice(0, revealed);
  const finished = visible.some((item) => item.kind === "fulltime");
  const userGoals = finished ? match.userGoals : visible.filter((item) => item.event?.type === "goal" && item.event.team === "user").length;
  const opponentGoals = finished ? match.opponentGoals : visible.filter((item) => item.event?.type === "goal" && item.event.team === "opponent").length;
  const currentMinute = visible.at(-1)?.minute ?? 0;
  const progress = Math.min(100, Math.round((currentMinute / (match.events.some((event) => event.minute > 90) ? 120 : 90)) * 100));

  return (
    <article className="overflow-hidden rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(5,22,49,.96),rgba(2,44,51,.88))] shadow-card">
      <div className="border-b border-emerald-300/10 bg-[radial-gradient(circle_at_top,_rgba(17,255,184,.18),_transparent_38%),linear-gradient(135deg,_rgba(7,24,50,.98),_rgba(3,32,38,.98))] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">{match.phase}</p>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-3xl font-black">
              <span>{teamName} x</span><TeamNameWithCrest name={match.opponentName} size="md" textClassName="font-black" />
            </h2>
          </div>
          <div className="text-right">
            <p className="font-mono text-sm text-emerald-300">{currentMinute}'</p>
            <p className="font-mono text-6xl font-black text-gold drop-shadow-[0_0_18px_rgba(248,198,48,.35)]">{userGoals} - {opponentGoals}</p>
          </div>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-gradient-to-r from-emerald-300 via-electric to-gold transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="p-5">
        <ol className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
          {visible.map((item, index) => (
            <li key={`${item.minute}-${index}`} className={`flex gap-3 rounded-md border px-3 py-3 text-sm transition ${item.event?.type === "goal" ? "border-gold/50 bg-gold/12 text-white shadow-[0_0_18px_rgba(248,198,48,.12)]" : "border-white/10 bg-white/[0.04] text-slate-300"}`}>
              <span className="w-12 shrink-0 font-mono text-sky-200">{item.minute}'</span>
              <span className="font-medium">{item.event ? formatEventLabel(item.event, teamName, match.opponentName) : item.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}

function GroupTable({
  teamName,
  displayTeamName,
  matches,
  groupTables,
  qualifiedTeams,
  onContinue
}: {
  teamName: string;
  displayTeamName?: string;
  matches: MatchResult[];
  groupTables: GroupStanding[];
  qualifiedTeams: string[];
  onContinue: () => void;
}) {
  const fallbackRows = [
    {
      name: displayTeamName ?? teamName,
      pts: matches.reduce((sum, match) => sum + (match.userGoals > match.opponentGoals ? 3 : match.userGoals === match.opponentGoals ? 1 : 0), 0),
      gf: matches.reduce((sum, match) => sum + match.userGoals, 0),
      ga: matches.reduce((sum, match) => sum + match.opponentGoals, 0),
      qualified: false
    },
    ...matches.map((match) => ({ name: match.opponentName, pts: match.opponentGoals > match.userGoals ? 3 : match.opponentGoals === match.userGoals ? 1 : 0, gf: match.opponentGoals, ga: match.userGoals, qualified: false }))
  ].sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf).map((row, index) => ({ ...row, qualified: index < 2 }));
  const tables = groupTables.length ? groupTables : [{ groupName: "Grupo A", rows: fallbackRows }];
  const qualified = qualifiedTeams.length ? qualifiedTeams.includes(teamName) : fallbackRows.some((row) => row.name === (displayTeamName ?? teamName) && row.qualified);

  return (
    <section className="mt-6 rounded-lg border border-emerald-300/20 bg-[linear-gradient(135deg,rgba(5,22,49,.88),rgba(2,48,52,.62))] p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-300">Fim da fase de grupos</p>
          <h2 className="mt-2 text-3xl font-black">Classificados da Liga dos Craques</h2>
          <p className={qualified ? "mt-2 font-bold text-emerald-300" : "mt-2 font-bold text-red-200"}>
            {qualified ? "Classificado para o mata-mata" : "Eliminado na fase de grupos"}
          </p>
        </div>
        <Button onClick={onContinue}>{qualified ? "Prosseguir ao mata-mata" : "Ver campeao da Liga dos Craques"}</Button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tables.map((group) => (
          <article key={group.groupName} className="rounded-md border border-emerald-300/15 bg-night/55 p-3">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">{group.groupName}</p>
            <div className="mt-3 space-y-2">
              {group.rows.map((row, index) => (
                <div key={row.name} className={`grid grid-cols-[1.5rem_minmax(0,1fr)_2rem] items-center gap-2 rounded border px-2 py-2 text-sm ${row.name === teamName || row.name === displayTeamName ? "border-gold/60 bg-gold/10" : row.qualified ? "border-emerald-300/35 bg-emerald-300/10" : "border-white/10 bg-white/[0.03]"}`}>
                  <span className="font-mono text-xs text-slate-400">{index + 1}</span>
                  <TeamNameWithCrest name={row.name === teamName ? displayTeamName ?? row.name : row.name} size="sm" textClassName="font-bold" />
                  <span className="text-right font-mono font-black text-gold">{row.pts}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function buildTimeline(match: MatchResult): TimelineItem[] {
  const endMinute = match.events.some((event) => event.minute > 90) ? 120 : 90;
  return [
    { minute: 0, label: "Bola rolando", kind: "kickoff" as const },
    ...match.events.map((event) => ({ minute: event.minute, label: event.text, kind: "event" as const, event })),
    { minute: 45, label: "Intervalo", kind: "halftime" as const },
    { minute: endMinute, label: "Fim de jogo", kind: "fulltime" as const }
  ].sort((a, b) => a.minute - b.minute || timelineOrder(a.kind) - timelineOrder(b.kind));
}

function timelineOrder(kind: TimelineItem["kind"]) {
  return { kickoff: 0, event: 1, halftime: 2, fulltime: 3 }[kind];
}

function formatEventLabel(event: MatchEvent, teamName: string, opponentName: string) {
  if (event.type === "goal") {
    const scorerName = event.playerName ?? "Coletivo";
    return event.team === "user" ? `Gol do ${teamName}: ${scorerName}` : `Gol do ${opponentName}: ${scorerName}`;
  }
  return event.playerName ? `${event.text}: ${event.playerName}` : event.text;
}

function displayTeamAlias(name: string | undefined, storedTeamName: string, displayTeamName: string, userName: string) {
  if (!name) return undefined;
  return name === storedTeamName || name === userName ? displayTeamName : name;
}

function isKnockoutPhase(phase: string) {
  return !phase.toLowerCase().includes("grupos");
}
