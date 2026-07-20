import { opponents } from "@/data/loaders";
import type { Rng } from "./rng";

const phases = ["Fase de grupos 1", "Fase de grupos 2", "Fase de grupos 3", "Oitavas de final", "Quartas de final", "Semifinal", "Final"];

export function campaignOpponents(rng: Rng) {
  const pool = [...opponents].sort(() => rng.next() - 0.5);
  return phases.map((phase, index) => ({
    phase,
    knockout: index >= 3,
    opponent: pool[index % pool.length]!
  }));
}
