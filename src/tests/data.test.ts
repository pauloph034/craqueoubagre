import { describe, expect, it } from "vitest";
import { clubSeasons, players } from "@/data/loaders";

describe("dataset demonstrativo", () => {
  it("possui volume minimo para uma campanha completa", () => {
    expect(clubSeasons.length).toBeGreaterThanOrEqual(16);
    expect(players.length).toBeGreaterThanOrEqual(240);
    expect(new Set(clubSeasons.map((season) => season.rarity)).size).toBe(4);
  });

  it("cada clube-temporada tem goleiro e 15 jogadores", () => {
    for (const season of clubSeasons) {
      expect(season.players.length).toBeGreaterThanOrEqual(15);
      expect(players.some((player) => player.clubSeasonId === season.id && player.primaryPosition === "GK")).toBe(true);
    }
  });
});
