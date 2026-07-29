import { calculatePositionFit } from "@/game-engine/position-fit";
import type { Coach, DraftPick } from "@/types/game";

const NATIONALITY_ALIASES: Record<string, string> = {
  holanda: "paises baixos",
  "paises baixos": "paises baixos"
};

function normalizeNationality(value?: string) {
  const normalized = (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return NATIONALITY_ALIASES[normalized] ?? normalized;
}

export function nationalitiesMatch(playerNationality?: string, coachNationality?: string) {
  const player = normalizeNationality(playerNationality);
  const coach = normalizeNationality(coachNationality);
  return Boolean(player && coach && player === coach);
}

export function ratingWithCoachNationalityBonus(baseRating: number, playerNationality?: string, coachNationality?: string) {
  return Math.min(99, baseRating + (nationalitiesMatch(playerNationality, coachNationality) ? 2 : 0));
}

export function applyCoachNationalityBonus(squad: DraftPick[], coach?: Pick<Coach, "nationality">) {
  return squad.map((pick) => {
    const baseFit = calculatePositionFit(pick.player, pick.slotPosition);
    return {
      ...pick,
      effectiveRating: ratingWithCoachNationalityBonus(baseFit.effectiveRating, pick.player.nationality, coach?.nationality)
    };
  });
}

export function countCoachNationalityMatches(nationalities: Array<string | undefined>, coachNationality?: string) {
  return nationalities.filter((nationality) => nationalitiesMatch(nationality, coachNationality)).length;
}
