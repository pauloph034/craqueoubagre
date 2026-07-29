"use client";

import { ParticipantList } from "@/components/seasons/ParticipantList";
import { SeasonDraftBuilder } from "@/components/seasons/SeasonDraftBuilder";
import { DashboardData, SeasonSquadSummary, SeasonsDashboard, SeasonTransferModal } from "@/components/seasons/SeasonsDashboard";
import { SeasonMatchLive } from "@/components/seasons/SeasonMatchLive";
import { nextDivision } from "@/game-engine/seasons/season-progress";
import { useGameStore } from "@/stores/game-store";
import type { RankedMatch } from "@/types/seasons";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export default function SeasonsPage() {
  const currentUser = useGameStore((state) => state.currentUser);
  const squad = useGameStore((state) => state.squad);
  const config = useGameStore((state) => state.config);
  const [data, setData] = useState<DashboardData>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [liveMatch, setLiveMatch] = useState<RankedMatch>();
  const [mobileTab, setMobileTab] = useState<"season" | "participants" | "squad">("season");
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRankedDraft, setShowRankedDraft] = useState(false);
  const missingSeasonTables = /PGRST205|cob_ranked_(?:seasons|matches|rewards)/i.test(error);
  const visibleError = missingSeasonTables
    ? "O banco do Supabase ainda nao possui as tabelas do modo Temporadas."
    : error;
  const transferWindowPending = Boolean(
    data?.season?.status === "active" &&
    (data.season.requiresTransferWindow ?? (data.season.seasonNumber > 1 && data.season.matchesPlayed === 0)) &&
    !data.season.transferWindowCompletedAt
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/seasons/current", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Temporada indisponivel.");
      setData(body);
      const pendingMatchId = window.sessionStorage.getItem("cob-ranked-live-match");
      if (pendingMatchId) {
        const pendingMatch = (body.matches as RankedMatch[] | undefined)?.find((match) => match.id === pendingMatchId);
        if (pendingMatch) setLiveMatch(pendingMatch);
        else window.sessionStorage.removeItem("cob-ranked-live-match");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Temporada indisponivel.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, currentUser?.username]);

  async function startSeason(reusePreviousSquad = false) {
    if (!currentUser) return;
    if (!currentUser.country) {
      setError("Escolha seu pais no perfil antes de entrar no ranking nacional.");
      return;
    }
    if (!reusePreviousSquad && squad.length !== 11) {
      setError("Complete os 11 jogadores no draft da divisão antes de iniciar.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seasons/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          reusePreviousSquad
            ? {}
            : { squad, formation: config.formation, tacticalStyle: config.tacticalStyle }
        )
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Nao foi possivel iniciar.");
      await load();
      setShowRankedDraft(false);
      setRefreshKey((value) => value + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nao foi possivel iniciar.");
    } finally {
      setBusy(false);
    }
  }

  async function play() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/seasons/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idempotencyKey: crypto.randomUUID() })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Partida indisponivel.");
      window.sessionStorage.setItem("cob-ranked-live-match", body.match.id);
      setLiveMatch(body.match);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Partida indisponivel.");
    } finally {
      setBusy(false);
    }
  }

  if (!currentUser && !loading) {
    return (
      <main className="editorial-shell py-8">
        <section className="mx-auto max-w-xl border border-black bg-white p-6 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Temporadas ranqueadas</p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase">Entre para competir</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">O ranking, o limite diario e suas recompensas ficam ligados a sua conta.</p>
          <Link href="/conta?modo=entrar&redirect=/temporadas" className="mt-5 inline-grid min-h-11 place-items-center bg-[var(--accent)] px-6 text-xs font-black uppercase">Entrar</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="editorial-shell py-4">
      <div className="mb-3 flex items-end justify-between border-b border-black pb-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">Competicao</p>
          <h1 className="font-display text-3xl font-black uppercase leading-none">Temporadas</h1>
        </div>
        <p className="hidden text-[10px] font-bold text-[var(--muted)] sm:block">8 jogos · 3 trocas · 2 novos sorteios</p>
      </div>

      <div className="mb-3 grid grid-cols-3 border border-black lg:hidden">
        {([["season", "Temporada"], ["participants", "Participantes"], ["squad", "Elenco"]] as const).map(([key, label]) => (
          <button key={key} type="button" className={`min-h-10 text-[10px] font-black uppercase ${mobileTab === key ? "bg-black text-white" : "bg-white"}`} onClick={() => setMobileTab(key)}>{label}</button>
        ))}
      </div>

      {error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border border-red-800 bg-red-50 px-4 py-3 text-xs font-bold text-red-900">
          <span>{visibleError}</span>
          {error.toLowerCase().includes("pais") && <Link href="/conta" className="underline">Completar perfil</Link>}
          {error.toLowerCase().includes("11 jogadores") && <button type="button" className="underline" onClick={() => setShowRankedDraft(true)}>Abrir draft da divisão</button>}
        </div>
      )}

      {loading ? (
        <section className="grid min-h-[420px] place-items-center border border-black bg-white">
          <div className="text-center"><span className="mx-auto block h-8 w-8 animate-spin border-2 border-black border-t-[var(--accent)]" /><p className="mt-3 text-xs font-black uppercase">Carregando sua temporada</p></div>
        </section>
      ) : !data ? (
        <section className="grid min-h-[420px] place-items-center border border-black bg-white p-6">
          <div className="max-w-lg text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Temporadas indisponiveis</p>
            <h2 className="mt-2 font-display text-3xl font-black uppercase">Nao foi possivel carregar</h2>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {visibleError || "Confira sua conexao e tente novamente."}
            </p>
            {missingSeasonTables && (
              <p className="mt-3 border border-black bg-[var(--paper)] p-3 text-xs font-bold">
                Execute o arquivo <code>scripts/supabase-seasons.sql</code> no SQL Editor do Supabase.
              </p>
            )}
            <button
              type="button"
              className="mt-5 min-h-11 bg-[var(--accent)] px-6 text-xs font-black uppercase"
              onClick={() => void load()}
            >
              Tentar novamente
            </button>
          </div>
        </section>
      ) : (
        !data.season || showRankedDraft ? (
          <div className="grid min-h-[calc(100vh-152px)] gap-3 lg:grid-cols-[270px_minmax(0,1fr)]">
            <div className={`${mobileTab === "participants" ? "block" : "hidden"} min-h-[520px] lg:block lg:min-h-0`}><ParticipantList refreshKey={refreshKey} /></div>
            <div className={`${mobileTab === "participants" ? "hidden" : "block"} min-h-[520px] lg:block lg:min-h-0`}>
              {currentUser && (
                <SeasonDraftBuilder
                  currentUser={currentUser}
                  division={data.season ? nextDivision(data.season.division, data.season.outcome ?? "held") : 10}
                  busy={busy}
                  onComplete={() => startSeason(false)}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="grid min-h-[calc(100vh-152px)] gap-3 lg:h-[calc(100vh-152px)] lg:grid-cols-[270px_minmax(460px,1fr)_230px]">
            <div className={`${mobileTab === "participants" ? "block" : "hidden"} min-h-[520px] lg:block lg:min-h-0`}><ParticipantList refreshKey={refreshKey} /></div>
            <div className={`${mobileTab === "season" ? "block" : "hidden"} min-h-[520px] lg:block lg:min-h-0`}>
              <SeasonsDashboard data={data} busy={busy} onPlay={play} onStart={() => void startSeason(true)} onRefresh={load} />
            </div>
            <div className={`${mobileTab === "squad" ? "block" : "hidden"} min-h-[520px] lg:block lg:min-h-0`}><SeasonSquadSummary season={data.season} onChanged={load} /></div>
          </div>
        )
      )}

      {data?.season && transferWindowPending && (
        <SeasonTransferModal season={data.season} onChanged={load} />
      )}

      {liveMatch && (
        <SeasonMatchLive
          rankedMatch={liveMatch}
          teamName={currentUser?.teamName || `${currentUser?.username} FC`}
          squad={data?.season?.squadSnapshot ?? []}
          formation={data?.season?.formation ?? "4-3-3"}
          onFinish={() => {
            window.sessionStorage.removeItem("cob-ranked-live-match");
            setLiveMatch(undefined);
            void load();
            setRefreshKey((value) => value + 1);
          }}
        />
      )}
    </main>
  );
}
