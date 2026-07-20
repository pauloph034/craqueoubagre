"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";

export default function SettingsPage() {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const volume = useGameStore((state) => state.volume);
  const updateSettings = useGameStore((state) => state.updateSettings);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-4xl font-black">Configuracoes</h1>
      <section className="mt-6 rounded-lg border border-white/12 bg-white/[0.07] p-5">
        <label className="flex items-center gap-3"><input type="checkbox" checked={audioEnabled} onChange={(event) => updateSettings({ audioEnabled: event.target.checked })} /> Audio ativado</label>
        <label className="mt-4 grid gap-2">Volume<input type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })} /></label>
        <Button className="mt-4" variant="secondary" onClick={() => window.localStorage.clear()}>Limpar dados locais</Button>
      </section>
    </main>
  );
}
