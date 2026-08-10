"use client";

import { ChampionSound } from "@/components/game/ChampionSound";
import { SEASON_MATCH_LIMIT, SEASON_REROLL_LIMIT, SEASON_SWAP_LIMIT, thresholdsFor } from "@/config/seasons-balance";
import { goalMessage } from "@/game-engine/seasons/season-progress";
import { calculateChemistry } from "@/game-engine/chemistry";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { calculateTeamRating } from "@/game-engine/team-rating";
import type { DailyAllowance, RankedMatch, RankedReward, RankedSeason, SeasonTransferOffer } from "@/types/seasons";
import { ArrowRight, CalendarClock, Check, RefreshCw, RotateCw, Shield, Trophy, Users, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type DashboardData = {
  season?: RankedSeason;
  matches: RankedMatch[];
  allowance: DailyAllowance;
  rewards: RankedReward[];
  profileComplete: boolean;
};

export function SeasonsDashboard({
  data,
  busy,
  onPlay,
  onStart,
  onRefresh
}: {
  data: DashboardData;
  busy: boolean;
  onPlay: () => void;
  onStart: () => void;
  onRefresh: () => void | Promise<void>;
}) {
  const season = data.season;
  if (!season) {
    return (
      <section className="flex min-h-0 flex-col justify-between border border-black bg-white p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Sua estreia</p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-none">Comece na Divisão 10</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)]">Oito partidas, um elenco fixo e uma meta clara. Use o time montado no draft para abrir sua primeira temporada.</p>
        </div>
        <button type="button" className="mt-6 flex min-h-12 items-center justify-center gap-2 bg-[var(--accent)] px-5 text-sm font-black uppercase disabled:opacity-40" onClick={onStart} disabled={busy || !data.profileComplete}>
          Iniciar temporada <ArrowRight size={16} />
        </button>
      </section>
    );
  }

  const rules = thresholdsFor(season.division);
  const matchesByNumber = new Map(data.matches.map((match) => [match.matchNumber, match]));
  const completed = season.status === "completed";
  const rating = calculateTeamRating(season.squadSnapshot);
  const chemistry = calculateChemistry(season.squadSnapshot);

  return (
    <section className="flex min-h-0 flex-col border border-black bg-white">
      {completed && season.outcome === "champion" && <ChampionSound eventId={`temporada-${season.id}`} />}
      <header className="grid gap-4 border-b border-black p-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Temporada {season.seasonNumber}</p>
          <h1 className="mt-1 font-display text-4xl font-black uppercase leading-none">Divisão {season.division === "lenda" ? "Lenda" : season.division}</h1>
          <p className="mt-2 text-xs text-[var(--muted)]">{goalMessage(season.division, season.points, season.matchesPlayed)}</p>
        </div>
        <div className="grid grid-cols-2 border border-black">
          <Metric value={season.points} label="pontos" />
          <Metric value={`${season.matchesPlayed}/8`} label="jogos" />
        </div>
      </header>

      <div className="grid flex-1 content-start gap-4 overflow-y-auto p-4">
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Oito partidas</p>
            <p className="text-[10px] font-bold">{season.wins}V · {season.draws}E · {season.losses}D</p>
          </div>
          <div className="mt-2 grid grid-cols-8 border border-black">
            {Array.from({ length: SEASON_MATCH_LIMIT }, (_, index) => {
              const match = matchesByNumber.get(index + 1);
              const state = match ? (match.result === "win" ? "V" : match.result === "draw" ? "E" : "D") : season.matchesPlayed === index ? "PROX." : "—";
              return (
                <div key={index} className={`grid min-h-11 place-items-center border-r border-black/25 text-center last:border-0 ${match?.result === "win" ? "bg-emerald-100" : match?.result === "loss" ? "bg-red-100" : match?.result === "draw" ? "bg-amber-100" : ""}`}>
                  <span className="text-[8px] font-bold text-[var(--muted)]">J{index + 1}</span>
                  <strong className="text-[10px]">{state}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Meta da divisão</p>
          <div className="relative mt-3 h-2 bg-black/10">
            <div className="absolute inset-y-0 left-0 bg-[var(--accent)]" style={{ width: `${Math.min(100, season.points / 24 * 100)}%` }} />
            {[rules.stayMin, rules.promotionMin, rules.titleMin].filter((value): value is number => value !== undefined).map((value) => (
              <span key={value} className="absolute -top-1 h-4 w-px bg-black" style={{ left: `${value / 24 * 100}%` }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-bold text-[var(--muted)]">
            <span>Permanência {rules.stayMin}</span>
            {rules.promotionMin !== undefined && <span>Promoção {rules.promotionMin}</span>}
            <span>Título {rules.titleMin}</span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {data.allowance.remaining > 0 ? (
            <CompactInfo icon={<CalendarClock size={15} />} title={`Hoje ${data.allowance.used}/${data.allowance.limit}`} text={`${data.allowance.remaining} partida(s) restante(s)`} />
          ) : (
            <ReleaseCountdown resetsAt={data.allowance.resetsAt} onExpire={onRefresh} />
          )}
          <CompactInfo
            icon={<Users size={15} />}
            title={`${rating} rating · ${chemistry}% entrosamento`}
            text={`${season.formation} · ${season.tacticalStyle} · ${divisionLevelLabel(season.division)}`}
          />
        </div>

        {completed && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-4 border border-black bg-[var(--surface-muted)] p-4">
            <div>
              <div className="flex items-center gap-2">
                {season.division === 1 && season.outcome === "champion" ? <Trophy size={18} className="text-[var(--accent)]" /> : <Shield size={18} />}
                <p className="font-display text-xl font-black uppercase">{outcomeLabel(season.division, season.outcome)}</p>
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">Abra a janela de transferências para preparar o elenco da próxima divisão.</p>
            </div>
            {season.division === 1 && season.outcome === "champion" && (
              <Image
                src="/assets/temporadas/taca-divisoes.png"
                alt="Taça da classificação para a Divisão Elite"
                width={72}
                height={72}
                className="h-[72px] w-[72px] object-contain"
              />
            )}
          </div>
        )}
      </div>

      <footer className="grid gap-2 border-t border-black p-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[9px] font-black uppercase text-[var(--muted)]">
          <span>Trocas {SEASON_SWAP_LIMIT - season.swapsUsed}/{SEASON_SWAP_LIMIT}</span>
          <span>Novos sorteios {SEASON_REROLL_LIMIT - season.rerollsUsed}/{SEASON_REROLL_LIMIT}</span>
          {data.rewards.some((reward) => reward.rewardId === "elite-badge") && (
            <span className="flex items-center gap-1.5 text-[var(--accent)]">
              <Image src="/assets/temporadas/escudo-elite.png" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
              Elite
            </span>
          )}
        </div>
        <button
          type="button"
          className="flex min-h-11 items-center justify-center gap-2 bg-[var(--accent)] px-5 text-xs font-black uppercase disabled:cursor-not-allowed disabled:opacity-40"
          onClick={completed ? onStart : onPlay}
          disabled={busy || (!completed && data.allowance.remaining <= 0)}
        >
          {busy ? <RefreshCw size={15} className="animate-spin" /> : completed ? <Check size={15} /> : <ArrowRight size={15} />}
          {completed
            ? season.outcome === "promoted" || (season.division === 1 && season.outcome === "champion")
              ? "Abrir janela de transferências"
              : "Preparar nova temporada"
            : data.allowance.remaining > 0
              ? "Jogar próxima partida"
              : "Aguardando próxima rodada"}
        </button>
      </footer>
    </section>
  );
}

type SeasonSquadSummaryProps = {
  season?: RankedSeason;
  onChanged: () => void | Promise<void>;
  transferWindow?: boolean;
  onWindowComplete?: () => void | Promise<void>;
};

export function SeasonSquadSummary({
  season,
  onChanged,
  transferWindow = false,
  onWindowComplete
}: SeasonSquadSummaryProps) {
  const [offer, setOffer] = useState<SeasonTransferOffer>();
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasTransferState = Boolean(season?.transferState);
  const transferCreatedAt = season?.transferState?.createdAt;

  useEffect(() => {
    if (!transferWindow || !hasTransferState) {
      setOffer(undefined);
      setSelectedPlayerId("");
      return;
    }
    fetch("/api/seasons/transfer", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Troca indisponivel.");
        setOffer(body.offer);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Troca indisponivel."));
  }, [transferWindow, hasTransferState, season?.id, transferCreatedAt]);

  if (!season) return <section className="border border-black bg-white p-4 text-xs text-[var(--muted)]">O elenco aparecera depois de iniciar a temporada.</section>;

  async function transfer(action: "draw" | "begin" | "reroll" | "confirm" | "cancel" | "complete-window", values: { slotId?: string; playerId?: string } = {}) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seasons/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...values })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nao foi possivel ajustar o elenco.");
      setOffer(body.offer);
      if (action === "confirm" || action === "cancel") setSelectedPlayerId("");
      if (action === "complete-window" && onWindowComplete) await onWindowComplete();
      else await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nao foi possivel ajustar o elenco.");
    } finally {
      setBusy(false);
    }
  }

  const canSwap = transferWindow && season.status === "active" && season.swapsUsed < SEASON_SWAP_LIMIT;
  const selectedPlayer = offer?.players.find((player) => player.id === selectedPlayerId);

  return (
    <aside className="flex h-full min-h-0 flex-col border border-black bg-white">
      <div className="border-b border-black p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[var(--accent)]">
          {transferWindow ? "Janela de transferencias" : "Elenco da temporada"}
        </p>
        <h2 className="mt-1 font-display text-xl font-black uppercase">{season.formation}</h2>
        <p className="mt-1 text-[9px] text-[var(--muted)]">
          {!transferWindow
            ? "Seu elenco fixo para os oito jogos desta divisao."
            : canSwap
            ? selectedPlayer
              ? `Agora escolha quem sai para a entrada de ${selectedPlayer.shortName}.`
              : "Sorteie um time e escolha primeiro quem deve entrar."
            : season.status === "active"
              ? "As 3 trocas ja foram usadas."
              : "Elenco encerrado nesta temporada."}
        </p>
        {canSwap && !offer && (
          <button
            type="button"
            className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 bg-[var(--accent)] px-3 text-[10px] font-black uppercase"
            disabled={busy}
            onClick={() => void transfer("draw")}
          >
            <RotateCw size={13} /> Sortear time para troca
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {season.squadSnapshot.map((pick) => {
          const fit = selectedPlayer ? calculatePositionFit(selectedPlayer, pick.slotPosition) : undefined;
          return (
            <button
              key={pick.slotId}
              type="button"
              className={`grid w-full grid-cols-[32px_1fr_auto] items-center gap-2 border-b border-black/15 px-3 py-2 text-left transition ${fit?.allowed ? "hover:bg-[var(--accent)]/15" : ""} disabled:cursor-default disabled:opacity-55`}
              disabled={!canSwap || busy || !selectedPlayer || !fit?.allowed}
              onClick={() => selectedPlayer && void transfer("confirm", { slotId: pick.slotId, playerId: selectedPlayer.id })}
            >
              <span className="text-[9px] font-black text-[var(--accent)]">{pick.slotPosition}</span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black">{pick.player.shortName}</p>
                <p className="truncate text-[8px] text-[var(--muted)]">
                  {fit?.allowed ? `Sai para entrar ${selectedPlayer?.shortName}` : `${pick.clubSeason.shortName} ${pick.clubSeason.season}`}
                </p>
              </div>
              <strong className="font-display text-sm">{pick.effectiveRating}</strong>
            </button>
          );
        })}
      </div>
      {transferWindow && offer && (
        <div className="max-h-[280px] overflow-y-auto border-t border-black bg-[var(--surface-muted)]">
          <div className="sticky top-0 flex items-start justify-between gap-2 border-b border-black bg-[var(--surface-muted)] p-3">
            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">Oferta de troca</p>
              <p className="truncate text-[11px] font-black">{offer.clubSeason.clubName} {offer.clubSeason.season}</p>
              <p className="text-[8px] text-[var(--muted)]">
                {selectedPlayer ? `${selectedPlayer.shortName} selecionado - clique em quem sai` : "Escolha o jogador que deve entrar"} · {offer.rerollsRemaining} novo(s) sorteio(s)
              </p>
            </div>
            <div className="flex gap-1">
              <button type="button" className="grid h-8 w-8 place-items-center border border-black disabled:opacity-30" title="Sortear outro clube" aria-label="Sortear outro clube" disabled={busy || offer.rerollsRemaining <= 0} onClick={() => void transfer("reroll")}>
                <RotateCw size={13} />
              </button>
              <button type="button" className="grid h-8 w-8 place-items-center border border-black" title="Cancelar troca" aria-label="Cancelar troca" disabled={busy} onClick={() => void transfer("cancel")}>
                <X size={13} />
              </button>
            </div>
          </div>
          {offer.players.map((player) => (
            <button
              key={player.id}
              type="button"
              className={`grid w-full grid-cols-[1fr_auto] items-center gap-2 border-b border-black/15 px-3 py-2 text-left hover:bg-white disabled:opacity-40 ${selectedPlayerId === player.id ? "bg-[var(--accent)]/20" : ""}`}
              disabled={busy}
              onClick={() => setSelectedPlayerId(player.id)}
            >
              <span className="min-w-0">
                <strong className="block truncate text-[10px]">{player.shortName}</strong>
                <span className="block truncate text-[8px] text-[var(--muted)]">{player.nationality} · {player.primaryPosition}</span>
              </span>
              <strong className="font-display text-sm">{player.overall}</strong>
            </button>
          ))}
        </div>
      )}
      <div className="border-t border-black px-3 py-2">
        {error ? (
          <p className="text-[9px] font-bold text-red-800">{error}</p>
        ) : transferWindow ? (
          <p className="text-[9px] text-[var(--muted)]">{SEASON_SWAP_LIMIT - season.swapsUsed} troca(s) e {SEASON_REROLL_LIMIT - season.rerollsUsed} novo(s) sorteio(s) restantes</p>
        ) : (
          <p className="text-[9px] text-[var(--muted)]">11 jogadores confirmados</p>
        )}
        {transferWindow && (
          <button
            type="button"
            className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 bg-black px-4 text-[10px] font-black uppercase !text-white disabled:opacity-40"
            disabled={busy}
            onClick={() => void transfer("complete-window")}
          >
            <Check size={14} /> Concluir e liberar temporada
          </button>
        )}
      </div>
    </aside>
  );
}

export function SeasonTransferModal({
  season,
  onChanged
}: {
  season: RankedSeason;
  onChanged: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center overflow-y-auto bg-black/70 p-3 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="transfer-window-title">
      <section className="grid h-[calc(100vh-24px)] max-h-[760px] w-full max-w-5xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden border border-black bg-[var(--page-bg)] shadow-2xl sm:h-[calc(100vh-48px)] sm:grid-cols-[minmax(320px,0.9fr)_minmax(360px,1.1fr)] sm:grid-rows-1">
        <header className="border-b border-black bg-[var(--accent)] p-4 sm:border-b-0 sm:border-r sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]">Entre temporadas</p>
          <h2 id="transfer-window-title" className="mt-2 font-display text-3xl font-black uppercase leading-none sm:text-4xl">
            <span className="block">Janela de</span>
            <span className="block">transferencias</span>
          </h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Sorteie clubes e faça ate tres trocas. Quando estiver satisfeito, conclua a janela para liberar os proximos oito jogos.
          </p>
          <div className="mt-6 grid grid-cols-2 border border-black bg-white">
            <Metric value={SEASON_SWAP_LIMIT - season.swapsUsed} label="trocas" />
            <Metric value={SEASON_REROLL_LIMIT - season.rerollsUsed} label="novos sorteios" />
          </div>
        </header>
        <div className="min-h-0 overflow-hidden p-2 sm:p-5">
          <SeasonSquadSummary
            season={season}
            transferWindow
            onChanged={onChanged}
            onWindowComplete={onChanged}
          />
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return <div className="min-w-[66px] border-r border-black p-2 text-center last:border-0"><strong className="font-display text-xl">{value}</strong><span className="block text-[8px] font-black uppercase text-[var(--muted)]">{label}</span></div>;
}

function CompactInfo({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 border border-black/30 p-3"><span className="text-[var(--accent)]">{icon}</span><div><p className="text-xs font-black">{title}</p><p className="text-[9px] text-[var(--muted)]">{text}</p></div></div>;
}

function ReleaseCountdown({ resetsAt, onExpire }: { resetsAt: string; onExpire: () => void | Promise<void> }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(resetsAt).getTime() - Date.now()));
  const expiredRef = useRef(false);

  useEffect(() => {
    expiredRef.current = false;
    const update = () => {
      const next = Math.max(0, new Date(resetsAt).getTime() - Date.now());
      setRemaining(next);
      if (next === 0 && !expiredRef.current) {
        expiredRef.current = true;
        void onExpire();
      }
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [resetsAt, onExpire]);

  const totalSeconds = Math.ceil(remaining / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");

  return (
    <div className="flex items-center gap-3 border border-black bg-[var(--surface-muted)] p-3">
      <CalendarClock size={17} className="text-[var(--accent)]" />
      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">Proximos 8 jogos em</p>
        <p className="font-display text-xl font-black tabular-nums">{clock}</p>
        <p className="text-[8px] text-[var(--muted)]">Liberacao automatica a meia-noite</p>
      </div>
    </div>
  );
}

function outcomeLabel(division: RankedSeason["division"], outcome?: RankedSeason["outcome"]) {
  if (outcome === "legend-perfect") return "Temporada Lenda perfeita";
  if (outcome === "champion" && division === 1) return "Campeão da Divisão 1";
  if (outcome === "champion" && division === "lenda") return "Campeão da Divisão Elite";
  if (outcome === "promoted") return "Qualificado para próxima Divisão";
  if (outcome === "relegated") return "Rebaixado";
  return "Permanência garantida";
}

function divisionLevelLabel(division: RankedSeason["division"]) {
  if (division === "lenda") return "nível máximo";
  if (division <= 3) return "nível elite";
  if (division <= 6) return "nível avançado";
  return "nível crescente";
}
