"use client";

import { TeamEmblem } from "@/components/game/TeamEmblem";
import type { SeasonParticipant } from "@/types/seasons";
import { Globe2, MapPin } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export function ParticipantList({ refreshKey = 0 }: { refreshKey?: number }) {
  const [scope, setScope] = useState<"global" | "national">("global");
  const [participants, setParticipants] = useState<SeasonParticipant[]>([]);
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(`/api/seasons/participants?scope=${scope}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Ranking indisponivel.");
        setParticipants(data.participants ?? []);
        setCountry(data.country ?? "");
      })
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(reason instanceof Error ? reason.message : "Ranking indisponivel.");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [scope, refreshKey]);

  return (
    <aside className="flex min-h-0 flex-col border border-black bg-white" aria-label="Top 100 de Temporadas">
      <div className="border-b border-black p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Temporadas ranqueadas</p>
        <div className="mt-1 flex items-end justify-between gap-2">
          <h2 className="font-display text-2xl font-black uppercase leading-none">Top 100</h2>
          <span className="text-[9px] font-bold uppercase text-[var(--muted)]">{participants.length} jogadores</span>
        </div>
        <div className="mt-3 grid grid-cols-2 border border-black">
          <ScopeButton active={scope === "global"} onClick={() => setScope("global")} icon={<Globe2 size={13} />} label="Global" />
          <ScopeButton active={scope === "national"} onClick={() => setScope("national")} icon={<MapPin size={13} />} label="Nacional" />
        </div>
        {scope === "national" && <p className="mt-2 truncate text-[9px] text-[var(--muted)]">{country ? `Pais: ${country}` : "Escolha seu pais no perfil"}</p>}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {loading && <p className="p-4 text-xs text-[var(--muted)]">Carregando participantes...</p>}
        {!loading && error && <p className="p-4 text-xs font-bold text-red-700">{error}</p>}
        {!loading && !error && participants.length === 0 && (
          <div className="p-4">
            <p className="text-sm font-black">Ainda sem classificados</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">Os jogadores aparecem aqui quando iniciam uma temporada. Nenhum perfil artificial e criado.</p>
          </div>
        )}
        {participants.map((participant) => (
          <article
            key={`${scope}-${participant.username}-${participant.rank}`}
            className={`grid grid-cols-[24px_34px_minmax(0,1fr)] items-center gap-2 border-b border-black/15 px-3 py-2 ${participant.isCurrentUser ? "bg-[var(--accent)]/15" : ""}`}
          >
            <span className="font-display text-sm font-black">{participant.rank}</span>
            <TeamEmblem emblemId={participant.emblemId} teamName={participant.teamName} size={30} />
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <p className="truncate text-[11px] font-black uppercase">{participant.teamName}</p>
                {participant.elite && <Image src="/assets/temporadas/escudo-elite.png" alt="Escudo Elite" width={16} height={16} className="h-4 w-4 shrink-0 object-contain" />}
              </div>
              <p className="truncate text-[9px] text-[var(--muted)]">Divisão {participant.division === "lenda" ? "Elite" : participant.division}</p>
              <p className="mt-0.5 truncate text-[9px] font-bold">V {participant.wins} - E {participant.draws} - D {participant.losses}</p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function ScopeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className={`flex min-h-8 items-center justify-center gap-1.5 text-[10px] font-black uppercase ${active ? "ranking-scope-active bg-black text-white" : "bg-white text-black hover:bg-[var(--surface-muted)]"}`} onClick={onClick}>
      {icon}{label}
    </button>
  );
}
