"use client";

import { Button } from "@/components/ui/button";
import { EditorialPageHeader } from "@/components/ui/editorial";
import { formations, getFormationSlots } from "@/config/formations";
import { tacticalStyles } from "@/config/game-balance";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import type { Difficulty, TacticalStyle } from "@/types/game";
import { Play } from "lucide-react";
import { SoccerFieldMarkings } from "@/components/game/SoccerFieldMarkings";
import type { ReactNode } from "react";
import { useState } from "react";

export function SetupForm() {
  const startDraft = useGameStore((state) => state.startDraft);
  const currentUser = useGameStore((state) => state.currentUser);
  const [userName, setUserName] = useState(currentUser?.username ?? "Jogador");
  const [teamName, setTeamName] = useState(currentUser?.teamName ?? "Craque ou Bagre");
  const [formation, setFormation] = useState("4-3-3");
  const [tacticalStyle, setTacticalStyle] = useState<TacticalStyle>("equilibrado");
  const [difficulty, setDifficulty] = useState<Difficulty>("classico");
  return (
    <section className="editorial-panel p-4 sm:p-6">
      <EditorialPageHeader chapter="01 · Nova campanha" title="Prepare o draft" description="Escolha a estrutura do time e vá direto ao sorteio." />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.72fr)]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Usuário
              <input className="min-h-10 w-full border border-black bg-white px-3 text-sm font-semibold text-black placeholder:text-[var(--muted)] disabled:bg-[var(--surface-muted)]" value={currentUser?.username ?? userName} onChange={(event) => setUserName(event.target.value)} disabled={Boolean(currentUser)} />
            </label>
            <label className="grid gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">
              Nome do time
              <input className="min-h-10 w-full border border-black bg-white px-3 text-sm font-semibold text-black placeholder:text-[var(--muted)] disabled:bg-[var(--surface-muted)]" value={currentUser?.teamName ?? teamName} onChange={(event) => setTeamName(event.target.value)} disabled={Boolean(currentUser)} />
            </label>
          </div>
          <OptionGroup label="Formacao">
            {Object.keys(formations).map((item) => (
              <button key={item} type="button" onClick={() => setFormation(item)} className={optionClass(formation === item)}>
                {item}
              </button>
            ))}
          </OptionGroup>
          <OptionGroup label="Dificuldade">
            {(["casual", "classico", "lenda"] as Difficulty[]).map((item) => (
              <button key={item} type="button" onClick={() => setDifficulty(item)} className={optionClass(difficulty === item)}>
                {item === "classico" ? "Classico" : item === "casual" ? "Casual" : "Lenda"}
              </button>
            ))}
          </OptionGroup>
          <OptionGroup label="Estilo tatico">
            {(Object.keys(tacticalStyles) as TacticalStyle[]).map((key) => (
              <button key={key} type="button" onClick={() => setTacticalStyle(key)} className={optionClass(tacticalStyle === key)}>
                {tacticalStyles[key].label}
              </button>
            ))}
          </OptionGroup>
        </div>
        <FormationPreview formation={formation} tacticalStyle={tacticalStyle} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-4 border-t border-black/20 pt-4">
        <p className="hidden text-xs text-[var(--muted)] sm:block">Tudo pronto? O primeiro clube aparece em até um segundo.</p>
        <Button className="min-h-11 w-full px-7 sm:w-auto" onClick={() => startDraft({ userName: currentUser?.username ?? (userName.trim() || "Jogador"), teamName: currentUser?.teamName ?? (teamName.trim() || "Craque ou Bagre"), formation, tacticalStyle, difficulty })}>
        <Play size={18} /> Iniciar draft
        </Button>
      </div>
    </section>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--muted)]">{label}</p>
      <div className="flex flex-wrap border-l border-t border-black">{children}</div>
    </div>
  );
}

function optionClass(active: boolean) {
  return cn("min-h-10 border-b border-r border-black px-4 py-2 text-xs font-black uppercase transition", active ? "bg-[var(--accent)] text-white" : "bg-white text-black hover:bg-black hover:text-white");
}

function FormationPreview({ formation, tacticalStyle }: { formation: string; tacticalStyle: TacticalStyle }) {
  const slots = getFormationSlots(formation, tacticalStyle);
  return (
    <div className="border border-black bg-[var(--surface-muted)] p-3">
      <div className="relative mx-auto aspect-[7/10] max-h-[500px] min-h-[380px] overflow-hidden border border-black field-lines">
        <SoccerFieldMarkings />
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="absolute z-10 grid h-10 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center border border-dashed border-white/65 bg-black/70 text-center text-[9px] font-black text-white"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span>{slot.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

