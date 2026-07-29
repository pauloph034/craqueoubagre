import type { Rng } from "@/game-engine/rng";
import type { GroupStandingRow, MatchResult } from "@/types/game";

type TeamStrength = {
  name: string;
  strength: number;
};

export function completeUserGroupTable({
  teamName,
  userMatches,
  teams,
  rng
}: {
  teamName: string;
  userMatches: MatchResult[];
  teams: TeamStrength[];
  rng: Rng;
}): GroupStandingRow[] {
  const rows = new Map<string, GroupStandingRow>();
  const ensureRow = (name: string) => {
    const existing = rows.get(name);
    if (existing) return existing;
    const row = { name, pts: 0, gf: 0, ga: 0, qualified: false };
    rows.set(name, row);
    return row;
  };

  ensureRow(teamName);
  for (const match of userMatches) {
    applyResult(ensureRow(teamName), ensureRow(match.opponentName), match.userGoals, match.opponentGoals);
  }

  const opponents = [...new Set(userMatches.map((match) => match.opponentName))];
  for (let homeIndex = 0; homeIndex < opponents.length; homeIndex++) {
    for (let awayIndex = homeIndex + 1; awayIndex < opponents.length; awayIndex++) {
      const homeName = opponents[homeIndex]!;
      const awayName = opponents[awayIndex]!;
      const homeStrength = teams.find((team) => team.name === homeName)?.strength ?? 82;
      const awayStrength = teams.find((team) => team.name === awayName)?.strength ?? 82;
      const strengthGap = (homeStrength - awayStrength) / 18;
      const homeGoals = Math.max(0, rng.int(0, 3) + (strengthGap > 0.45 && rng.next() > 0.45 ? 1 : 0));
      const awayGoals = Math.max(0, rng.int(0, 3) + (strengthGap < -0.45 && rng.next() > 0.45 ? 1 : 0));
      applyResult(ensureRow(homeName), ensureRow(awayName), homeGoals, awayGoals);
    }
  }

  return [...rows.values()]
    .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name))
    .map((row, index) => ({ ...row, qualified: index < 2 }));
}

function applyResult(home: GroupStandingRow, away: GroupStandingRow, homeGoals: number, awayGoals: number) {
  home.gf += homeGoals;
  home.ga += awayGoals;
  away.gf += awayGoals;
  away.ga += homeGoals;

  if (homeGoals > awayGoals) home.pts += 3;
  else if (awayGoals > homeGoals) away.pts += 3;
  else {
    home.pts += 1;
    away.pts += 1;
  }
}
