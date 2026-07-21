"use client";

import { Button } from "@/components/ui/button";
import { GamePanel, SectionHeader } from "@/components/ui/surface";
import { formations, getFormationSlots } from "@/config/formations";
import { tacticalStyles } from "@/config/game-balance";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import type { Difficulty, TacticalStyle } from "@/types/game";
import { Play } from "lucide-react";
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
    <GamePanel className="p-5 md:p-6">
      <SectionHeader eyebrow="Nova campanha" title="Prepare seu draft" description="Escolha esquema, estilo e dificuldade antes de sortear os times historicos." />
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Nome do usuario
            <input className="min-h-12 w-full rounded-2xl border border-white/10 bg-night/70 px-4 text-white placeholder:text-slate-500 disabled:opacity-70" value={currentUser?.username ?? userName} onChange={(event) => setUserName(event.target.value)} disabled={Boolean(currentUser)} />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-200">
            Nome do seu time
            <input className="min-h-12 w-full rounded-2xl border border-white/10 bg-night/70 px-4 text-white placeholder:text-slate-500 disabled:opacity-70" value={currentUser?.teamName ?? teamName} onChange={(event) => setTeamName(event.target.value)} disabled={Boolean(currentUser)} />
          </label>
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
      <Button className="mt-6 px-7" onClick={() => startDraft({ userName: currentUser?.username ?? (userName.trim() || "Jogador"), teamName: currentUser?.teamName ?? (teamName.trim() || "Craque ou Bagre"), formation, tacticalStyle, difficulty })}>
        <Play size={18} /> Iniciar draft
      </Button>
    </GamePanel>
  );
}

function OptionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-slate-200">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function optionClass(active: boolean) {
  return cn("min-h-11 rounded-full border px-4 py-2 text-sm font-black transition", active ? "border-electric bg-electric text-night" : "border-white/15 bg-night/70 text-slate-100 hover:bg-white/10");
}

function FormationPreview({ formation, tacticalStyle }: { formation: string; tacticalStyle: TacticalStyle }) {
  const slots = getFormationSlots(formation, tacticalStyle);
  return (
    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-950/30 p-3">
      <div className="relative mx-auto aspect-[7/10] min-h-[430px] overflow-hidden rounded-2xl border border-white/15 field-lines">
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        {slots.map((slot) => (
          <div
            key={slot.id}
            className="absolute grid h-11 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded border border-dashed border-emerald-300/50 bg-night/70 text-center text-[10px] font-black text-emerald-200"
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
          >
            <span>{slot.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

