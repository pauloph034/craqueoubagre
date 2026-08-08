"use client";

import { MatchDecisionPrompt, PenaltyTakerPrompt, type MatchDecisionType } from "@/components/game/MatchInteractivePrompt";
import { matchDecisionMoments, resolveMatchDecision } from "@/game-engine/match-decisions";
import type { DraftPick, MatchEvent } from "@/types/game";
import type { RankedMatch } from "@/types/seasons";
import { Pause, Play, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const speedMs = { 1: 550, 2: 300, 4: 160 } as const;

export function SeasonMatchLive({
  rankedMatch,
  teamName,
  squad,
  formation,
  onFinish
}: {
  rankedMatch: RankedMatch;
  teamName: string;
  squad: DraftPick[];
  formation: string;
  onFinish: () => void;
}) {
  const [minute, setMinute] = useState(0);
  const [speed, setSpeed] = useState<1 | 2 | 4>(2);
  const [paused, setPaused] = useState(false);
  const [decisions, setDecisions] = useState<Partial<Record<MatchDecisionType, { value: string; label: string; feedback: string }>>>({});
  const [penaltyTakers, setPenaltyTakers] = useState<Record<string, string>>({});
  const events = useMemo(() => rankedMatch.match.events.filter((event) => event.minute <= minute), [rankedMatch, minute]);
  const userGoals = events.filter((event) => (event.type === "goal" || event.type === "penalty_scored") && event.team === "user").length;
  const opponentGoals = events.filter((event) => (event.type === "goal" || event.type === "penalty_scored") && event.team === "opponent").length;
  const decisionMinutes = useMemo(
    () => matchDecisionMoments(rankedMatch.match.id, rankedMatch.match.userGoals, rankedMatch.match.opponentGoals, rankedMatch.match.phase !== "Fase de grupos"),
    [rankedMatch.match.id, rankedMatch.match.opponentGoals, rankedMatch.match.phase, rankedMatch.match.userGoals]
  );
  const pendingPenalty = events.find((event, index) => event.team === "user" && event.requiresTakerSelection && !penaltyTakers[eventKey(event, index)]);
  const pendingDecision = decisionMinutes.find((item) => minute >= item.minute && !decisions[item.type])?.type;
  const interactionPending = Boolean(pendingPenalty || pendingDecision);
  const penaltyCandidates = useMemo(
    () =>
      squad
        .filter((pick) => pick.slotPosition !== "GK")
        .sort((a, b) => b.player.shooting + b.effectiveRating - (a.player.shooting + a.effectiveRating))
        .slice(0, 6)
        .map((pick) => ({ id: pick.player.id, name: pick.player.shortName, rating: Math.round((pick.player.shooting + pick.effectiveRating) / 2) })),
    [squad]
  );
  const timelineRows = useMemo(() => {
    const rows: Array<{ key: string; minute: number; text: string; goal?: boolean }> = [
      { key: "kickoff", minute: 1, text: "Bola rolando" }
    ];
    events.forEach((event, index) => {
      const taker = penaltyTakers[eventKey(event, index)];
      rows.push({
        key: eventKey(event, index),
        minute: event.minute,
        goal: event.type === "goal" || event.type === "penalty_scored",
        text: taker
          ? `${event.type === "penalty_scored" ? "Penalti convertido" : "Penalti perdido"} por ${taker}`
          : event.playerName
            ? `${event.team === "user" ? teamName : rankedMatch.opponentName}: ${event.playerName}`
            : event.text
      });
    });
    decisionMinutes.forEach((item) => {
      const decision = decisions[item.type];
      if (decision) rows.push({ key: `decision-${item.type}`, minute: item.minute, text: `${decision.label}: ${decision.feedback}` });
    });
    if (minute >= 45 && !events.some((event) => event.minute === 45 && event.text === "Intervalo")) {
      rows.push({ key: "halftime", minute: 45, text: "Intervalo" });
    }
    if (minute >= 90) rows.push({ key: "fulltime", minute: 90, text: "Fim de jogo" });
    return rows.sort((a, b) => a.minute - b.minute);
  }, [decisionMinutes, decisions, events, minute, penaltyTakers, rankedMatch.opponentName, teamName]);

  useEffect(() => {
    if (paused || interactionPending || minute >= 90) return;
    const timer = window.setTimeout(() => setMinute((value) => Math.min(90, value + 3)), speedMs[speed]);
    return () => window.clearTimeout(timer);
  }, [interactionPending, minute, paused, speed]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-3" role="dialog" aria-modal="true" aria-label="Partida de Temporadas">
      <section className="max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-y-auto border border-black bg-[var(--background)]">
        <header className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-black bg-white p-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase">{teamName}</p>
          </div>
          <div className="text-center">
            <p className="font-display text-4xl font-black tabular-nums">{userGoals} - {opponentGoals}</p>
            <p className="text-[10px] font-black uppercase text-[var(--accent)]">{minute}&apos;</p>
          </div>
          <p className="truncate text-right text-xs font-black uppercase">{rankedMatch.opponentName}</p>
        </header>

        <div className="h-1 bg-black/10"><div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(minute / 90) * 100}%` }} /></div>
        <div className="grid min-h-[280px] md:grid-cols-[180px_1fr]">
          <div className="border-b border-black p-4 md:border-b-0 md:border-r">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--muted)]">Controles</p>
            <button type="button" className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 border border-black text-xs font-black uppercase" onClick={() => setPaused((value) => !value)} disabled={minute >= 90}>
              {paused ? <Play size={14} /> : <Pause size={14} />} {paused ? "Continuar" : "Pausar"}
            </button>
            <div className="mt-2 grid grid-cols-3 border border-black">
              {([1, 2, 4] as const).map((value) => (
                <button key={value} type="button" className={`min-h-8 text-[10px] font-black ${speed === value ? "bg-black text-white" : ""}`} onClick={() => setSpeed(value)}>{value}x</button>
              ))}
            </div>
            <p className="mt-4 text-[10px] leading-relaxed text-[var(--muted)]">{rankedMatch.opponentType === "player" ? "Adversario do ranking" : "Adversario historico"}</p>
          </div>
          <div className="max-h-[360px] overflow-y-auto p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--muted)]">Linha do tempo</p>
            <div className="mt-2">{timelineRows.map((row) => <TimelineRow key={row.key} minute={row.minute} goal={row.goal} text={row.text} />)}</div>
          </div>
        </div>
        {pendingPenalty && (
          <div className="border-t border-black p-3">
            <PenaltyTakerPrompt
              candidates={penaltyCandidates}
              onChoose={(name) => {
                const index = events.indexOf(pendingPenalty);
                setPenaltyTakers((current) => ({ ...current, [eventKey(pendingPenalty, index)]: name }));
              }}
            />
          </div>
        )}
        {!pendingPenalty && pendingDecision && (
          <div className="border-t border-black p-3">
            <MatchDecisionPrompt
              type={pendingDecision}
              currentFormation={formation}
              score={{ userGoals, opponentGoals }}
              onChoose={(value, label) => {
                const outcome = resolveMatchDecision({ seed: `${rankedMatch.match.id}-${minute}`, type: pendingDecision, value, userGoals, opponentGoals, formation });
                setDecisions((current) => ({ ...current, [pendingDecision]: { value, label, feedback: outcome.detail } }));
              }}
            />
          </div>
        )}
        <footer className="flex items-center justify-between border-t border-black bg-white p-3">
          <p className="text-[10px] font-bold text-[var(--muted)]">+{rankedMatch.xpGranted} XP registrado</p>
          <button type="button" className="flex min-h-9 items-center gap-2 bg-[var(--accent)] px-4 text-xs font-black uppercase disabled:opacity-35" disabled={minute < 90} onClick={onFinish}>
            {minute >= 90 ? "Voltar a temporada" : "Partida em andamento"} {minute >= 90 && <X size={14} />}
          </button>
        </footer>
      </section>
    </div>
  );
}

function eventKey(event: MatchEvent, index: number) {
  return `${event.minute}-${event.type}-${index}`;
}

function TimelineRow({ minute, text, goal = false }: { minute: number; text: string; goal?: boolean }) {
  return (
    <div className={`grid grid-cols-[34px_10px_1fr] items-center gap-2 border-b border-black/15 py-2 text-xs ${goal ? "font-black" : ""}`}>
      <span className="font-mono text-[10px]">{minute}&apos;</span>
      <span className={`h-2 w-2 ${goal ? "rounded-full bg-[var(--accent)]" : "border border-black"}`} />
      <span className="min-w-0 break-words">{text}</span>
    </div>
  );
}
