import type { FormationSlot } from "@/types/game";

type ChemistryPlayer = {
  slotId: string;
  nationality?: string;
  clubKey?: string;
};

export function ChemistryLinks({
  slots,
  players
}: {
  slots: FormationSlot[];
  players: ChemistryPlayer[];
}) {
  const links = buildChemistryLinks(slots, players);

  if (!links.length) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[2] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {links.map((link, index) => (
        <line
          key={`${link.from.id}-${link.to.id}`}
          className="chemistry-link"
          x1={link.from.x}
          y1={link.from.y}
          x2={link.to.x}
          y2={link.to.y}
          vectorEffect="non-scaling-stroke"
          style={{ animationDelay: `${index * 80}ms` }}
          data-strength={link.strength}
        />
      ))}
    </svg>
  );
}

export function buildChemistryLinks(slots: FormationSlot[], players: ChemistryPlayer[]) {
  const coordinates = new Map(slots.map((slot) => [slot.id, slot]));
  const candidates = players
    .flatMap((player, index) =>
      players.slice(index + 1).map((other) => {
        const from = coordinates.get(player.slotId);
        const to = coordinates.get(other.slotId);
        if (!from || !to || !areTacticalNeighbors(from, to)) return undefined;
        const sameClub = Boolean(player.clubKey && other.clubKey && player.clubKey === other.clubKey);
        const sameNation = Boolean(player.nationality && other.nationality && player.nationality === other.nationality);
        if (!sameClub && !sameNation) return undefined;
        return {
          from,
          to,
          strength: sameClub ? 2 : 1,
          distance: Math.hypot(from.x - to.x, from.y - to.y)
        };
      })
    )
    .filter((link): link is NonNullable<typeof link> => Boolean(link))
    .sort((a, b) => b.strength - a.strength || a.distance - b.distance);

  const goalkeeperLinks = candidates
    .filter((link) => role(link.from) === "goalkeeper" || role(link.to) === "goalkeeper")
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 2);
  const goalkeeperKeys = new Set(goalkeeperLinks.map(linkKey));

  return candidates
    .filter((link) => {
      const touchesGoalkeeper = role(link.from) === "goalkeeper" || role(link.to) === "goalkeeper";
      return !touchesGoalkeeper || goalkeeperKeys.has(linkKey(link));
    })
    .slice(0, 12);
}

function areTacticalNeighbors(from: FormationSlot, to: FormationSlot) {
  const a = role(from);
  const b = role(to);
  const verticalDistance = Math.abs(from.y - to.y);
  const horizontalDistance = Math.abs(from.x - to.x);
  const sameSide = lane(from) === lane(to) || lane(from) === "center" || lane(to) === "center";

  if (a === "goalkeeper" || b === "goalkeeper") {
    return (a === "goalkeeper" ? b : a) === "centre-back";
  }
  if (a === "fullback" || b === "fullback") {
    const fullback = a === "fullback" ? from : to;
    const neighbor = a === "fullback" ? to : from;
    const neighborRole = role(neighbor);
    if (neighborRole === "centre-back") return horizontalDistance <= 34 && verticalDistance <= 15;
    if (neighborRole === "wide") return lane(fullback) === lane(neighbor) && verticalDistance <= 55;
    return false;
  }
  if (a === "centre-back" || b === "centre-back") {
    const neighborRole = a === "centre-back" ? b : a;
    return ["centre-back", "holding-midfield", "midfield"].includes(neighborRole) && sameSide && verticalDistance <= 24 && horizontalDistance <= 34;
  }
  if (a === "wide" || b === "wide") {
    const neighborRole = a === "wide" ? b : a;
    return ["wide", "midfield", "attack"].includes(neighborRole) && sameSide && verticalDistance <= 30 && horizontalDistance <= 34;
  }
  if (a === "attack" && b === "attack") return verticalDistance <= 15 && horizontalDistance <= 30;
  if (a === "attack" || b === "attack") {
    return ["midfield", "attack"].includes(a === "attack" ? b : a) && verticalDistance <= 28 && horizontalDistance <= 34;
  }
  return verticalDistance <= 20 && horizontalDistance <= 34;
}

function role(slot: FormationSlot) {
  if (slot.position === "GK") return "goalkeeper";
  if (slot.position === "CB") return "centre-back";
  if (["RB", "LB"].includes(slot.position)) return "fullback";
  if (["RWB", "LWB", "RM", "LM", "RW", "LW"].includes(slot.position)) return "wide";
  if (slot.position === "DM") return "holding-midfield";
  if (["ST", "CF"].includes(slot.position)) return "attack";
  return "midfield";
}

function lane(slot: FormationSlot) {
  if (slot.x < 42) return "left";
  if (slot.x > 58) return "right";
  return "center";
}

function linkKey(link: { from: FormationSlot; to: FormationSlot }) {
  return [link.from.id, link.to.id].sort().join(":");
}
