"use client";

import { Button } from "@/components/ui/button";
import { type MatchDecisionType } from "@/game-engine/match-decisions";

export type { MatchDecisionType } from "@/game-engine/match-decisions";

export const matchDecisionCopy: Record<
  MatchDecisionType,
  { eyebrow: string; title: string; options: Array<{ value: string; label: string; detail: string }> }
> = {
  tempo: {
    eyebrow: "30' - Leitura do jogo",
    title: "Como seu time deve conduzir o ritmo?",
    options: [
      { value: "pressionar", label: "Pressionar", detail: "Sobe as linhas e tenta recuperar a bola cedo." },
      { value: "controlar", label: "Controlar a posse", detail: "Reduz o risco e trabalha melhor cada ataque." }
    ]
  },
  posture: {
    eyebrow: "Intervalo",
    title: "Qual sera a postura para o segundo tempo?",
    options: [
      { value: "recuar", label: "Recuar", detail: "Protege os espacos e prioriza a vantagem." },
      { value: "buscar", label: "Buscar o gol", detail: "Aumenta a presenca ofensiva e assume mais risco." }
    ]
  },
  formation: {
    eyebrow: "70' - Reta final",
    title: "Escolha a formacao para fechar a partida",
    options: []
  }
};

export function MatchDecisionPrompt({
  type,
  currentFormation,
  onChoose
}: {
  type: MatchDecisionType;
  currentFormation: string;
  score?: { userGoals: number; opponentGoals: number };
  onChoose: (value: string, label: string) => void;
}) {
  const copy = matchDecisionCopy[type];
  const options =
    type === "formation"
      ? ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2"].map((formation) => ({
          value: formation,
          label: formation,
          detail: formation === currentFormation ? "Manter o desenho atual." : "Reorganizar o time para os minutos finais."
        }))
      : copy.options;
  return (
    <section className="match-prompt border border-black bg-[var(--surface)] p-4" aria-live="polite">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--success)]">{copy.eyebrow}</p>
      <h3 className="mt-1 text-lg font-black text-black">{copy.title}</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="border border-black/25 bg-white px-3 py-3 text-left transition hover:border-[var(--success)] hover:bg-[color-mix(in_srgb,var(--success)_10%,white)]"
            onClick={() => onChoose(option.value, option.label)}
          >
            <span className="block text-sm font-black text-black">{option.label}</span>
            <span className="mt-1 block text-xs leading-snug text-[var(--muted)]">{option.detail}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function PenaltyTakerPrompt({
  candidates,
  onChoose
}: {
  candidates: Array<{ id: string; name: string; rating: number }>;
  onChoose: (name: string) => void;
}) {
  return (
    <section className="match-prompt border border-black bg-[var(--surface)] p-4" aria-live="assertive">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--warning)]">Penalti</p>
      <h3 className="mt-1 text-lg font-black text-black">Quem vai para a cobranca?</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {candidates.map((candidate) => (
          <Button
            key={candidate.id}
            variant="secondary"
            className="h-auto min-h-12 justify-between gap-3 px-3 py-2"
            onClick={() => onChoose(candidate.name)}
          >
            <span className="truncate">{candidate.name}</span>
            <span className="font-mono text-xs">{candidate.rating}</span>
          </Button>
        ))}
      </div>
    </section>
  );
}
