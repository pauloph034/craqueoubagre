"use client";

import { DraftPanel } from "@/components/game/DraftPanel";
import { SoccerFieldMarkings } from "@/components/game/SoccerFieldMarkings";
import { SquadField } from "@/components/game/SquadField";
import { formations, getFormationSlots } from "@/config/formations";
import { tacticalStyles } from "@/config/game-balance";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import type { RankedDivision } from "@/types/seasons";
import type { TacticalStyle, UserAccount } from "@/types/game";
import { ArrowRight, Play } from "lucide-react";
import { useState, type ReactNode } from "react";

export function SeasonDraftBuilder({
  currentUser,
  division,
  busy,
  onComplete
}: {
  currentUser: UserAccount;
  division: RankedDivision;
  busy: boolean;
  onComplete: () => void;
}) {
  const phase = useGameStore((state) => state.phase);
  const startDraft = useGameStore((state) => state.startDraft);
  const config = useGameStore((state) => state.config);
  const [formation, setFormation] = useState("4-3-3");
  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>("equilibrado");
  const [started, setStarted] = useState(false);

  function beginDraft() {
    startDraft({
      userName: currentUser.username,
      teamName: currentUser.teamName || `${currentUser.username} FC`,
      formation,
      tacticalStyle,
      difficulty: "classico"
    });
    setStarted(true);
  }

  function finishDraft() {
    onComplete();
  }

  if (started && phase === "drafting") {
    return (
      <section className="min-h-0 border border-black bg-white">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-black p-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Draft da divisão</p>
            <h2 className="font-display text-2xl font-black uppercase">Monte o elenco da Divisão {division === "lenda" ? "Lenda" : division}</h2>
          </div>
          <p className="text-[10px] font-bold text-[var(--muted)]">{config.formation} · {tacticalStyles[config.tacticalStyle].label}</p>
        </header>
        <div className="grid min-h-0 gap-3 p-3 xl:grid-cols-[minmax(330px,.9fr)_minmax(390px,1.1fr)]">
          <SquadField showMetrics />
          <DraftPanel
            onComplete={finishDraft}
            completeLabel="Iniciar temporada"
            completeDescription="Seu elenco ranqueado está completo. Confirme para abrir a temporada nesta divisão."
            completing={busy}
          />
        </div>
      </section>
    );
  }

  const slots = getFormationSlots(formation, tacticalStyle);
  return (
    <section className="min-h-0 border border-black bg-white">
      <header className="border-b border-black p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--accent)]">Sua estreia</p>
        <h1 className="mt-1 font-display text-4xl font-black uppercase leading-none">Comece na Divisão {division === "lenda" ? "Lenda" : division}</h1>
        <p className="mt-3 max-w-2xl text-sm text-[var(--muted)]">Este elenco pertence somente às Temporadas. Escolha a estrutura e monte seu time sem alterar o progresso do modo solo.</p>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <OptionGroup label="Formação">
            {Object.keys(formations).map((item) => (
              <button key={item} type="button" className={optionClass(formation === item)} onClick={() => setFormation(item)}>{item}</button>
            ))}
          </OptionGroup>
          <OptionGroup label="Estilo tático">
            {(Object.keys(tacticalStyles) as TacticalStyle[]).map((item) => (
              <button key={item} type="button" className={optionClass(tacticalStyle === item)} onClick={() => setTacticalStyle(item)}>{tacticalStyles[item].label}</button>
            ))}
          </OptionGroup>
          <div className="border-l-4 border-[var(--accent)] bg-[var(--surface-muted)] p-4">
            <p className="text-xs font-black uppercase">8 partidas · elenco fixo</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Depois do draft, as trocas da temporada ficam limitadas pelas regras da divisão.</p>
          </div>
          <button type="button" className="flex min-h-12 w-full items-center justify-center gap-2 bg-[var(--accent)] px-5 text-sm font-black uppercase text-black" onClick={beginDraft}>
            <Play size={17} /> Montar draft da divisão <ArrowRight size={17} />
          </button>
        </div>
        <div className="border border-black bg-[var(--surface-muted)] p-3">
          <div className="relative mx-auto aspect-[7/10] max-h-[430px] overflow-hidden border border-black field-lines">
            <SoccerFieldMarkings />
            {slots.map((slot) => (
              <span
                key={slot.id}
                className="absolute grid h-8 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center border border-dashed border-white/70 bg-black/75 text-[8px] font-black text-white"
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
              >
                {slot.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap border-l border-t border-black">{children}</div>
    </div>
  );
}

function optionClass(active: boolean) {
  return cn(
    "min-h-10 border-b border-r border-black px-4 text-xs font-black uppercase transition",
    active ? "bg-black text-[var(--success)]" : "bg-white text-black hover:bg-[var(--surface-muted)]"
  );
}
