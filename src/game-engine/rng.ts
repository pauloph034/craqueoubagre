import seedrandom from "seedrandom";

export type Rng = {
  seed: string;
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: T[]) => T;
  weighted: <T extends string>(weights: Record<T, number>) => T;
};

export function createRng(seed: string): Rng {
  const generator = seedrandom(seed);
  const next = () => generator.quick();
  const weighted = <T extends string>(weights: Record<T, number>): T => {
    const entries = Object.entries(weights).filter(([, weight]) => Number(weight) > 0) as [T, number][];
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = next() * total;
    for (const [key, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return key;
    }
    return entries.at(-1)![0];
  };
  return {
    seed,
    next,
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min,
    pick: (items) => items[Math.floor(next() * items.length)]!,
    weighted
  };
}

export function createCampaignSeed(prefix = "liga-dos-craques"): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 8)}`;
}
