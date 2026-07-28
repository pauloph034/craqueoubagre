"use client";

import { Button } from "@/components/ui/button";
import { EditorialPageHeader } from "@/components/ui/editorial";
import { useGameStore } from "@/stores/game-store";

export default function SettingsPage() {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const volume = useGameStore((state) => state.volume);
  const updateSettings = useGameStore((state) => state.updateSettings);
  return (
    <main className="editorial-shell max-w-4xl py-6">
      <EditorialPageHeader chapter="Preferências" title="Configurações" description="Ajustes rápidos de interface e dados locais." />
      <section className="mt-5 border border-black bg-white">
        <div className="grid min-h-16 grid-cols-[1fr_auto] items-center gap-4 border-b border-black/20 px-4">
          <div><p className="text-sm font-black">Áudio</p><p className="text-xs text-[var(--muted)]">Efeitos durante o draft e as partidas.</p></div>
          <label className="flex items-center gap-2 text-xs font-black uppercase"><input type="checkbox" checked={audioEnabled} onChange={(event) => updateSettings({ audioEnabled: event.target.checked })} /> Ativado</label>
        </div>
        <label className="grid min-h-20 grid-cols-[1fr_minmax(140px,280px)] items-center gap-4 border-b border-black/20 px-4 text-sm font-black">
          <span>Volume</span><input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })} />
        </label>
        <div className="flex min-h-20 items-center justify-between gap-4 px-4">
          <div><p className="text-sm font-black">Dados locais</p><p className="text-xs text-[var(--muted)]">Remove apenas informações salvas neste navegador.</p></div>
          <Button variant="secondary" onClick={() => window.localStorage.clear()}>Limpar dados</Button>
        </div>
      </section>
    </main>
  );
}
