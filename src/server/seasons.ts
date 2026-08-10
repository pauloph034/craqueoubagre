import { randomUUID } from "node:crypto";
import { clubSeasons, opponents, players } from "@/data/loaders";
import { getFormationSlots } from "@/config/formations";
import { SEASON_MATCH_LIMIT, SEASON_REROLL_LIMIT, SEASON_SWAP_LIMIT, seasonDifficulty, seasonOpponentAdjustment } from "@/config/seasons-balance";
import { calculatePositionFit } from "@/game-engine/position-fit";
import { calculateTeamRating } from "@/game-engine/team-rating";
import { createRng } from "@/game-engine/rng";
import { simulateMatch } from "@/game-engine/match-engine";
import { completionXp, matchXp } from "@/game-engine/seasons/season-xp";
import { dailyAllowance } from "@/game-engine/seasons/daily-limit";
import { isSeasonComplete, nextDivision, pointsForResult, seasonOutcome } from "@/game-engine/seasons/season-progress";
import { maskUsername } from "@/server/progression";
import { trophyRewardDelta } from "@/lib/trophies";
import {
  getLatestRankedSeason,
  getRankedMatchByIdempotency,
  listPublicUsers,
  listRankedMatches,
  listRankedRewards,
  listRankedSeasons,
  saveRankedMatch,
  saveRankedReward,
  saveRankedSeason
} from "@/server/db";
import type { DraftPick, TacticalStyle, UserAccount } from "@/types/game";
import type { RankedDivision, RankedMatch, RankedReward, RankedSeason, SeasonParticipant, SeasonTransferOffer } from "@/types/seasons";

const locks = new Set<string>();
const validStyles = new Set<TacticalStyle>(["equilibrado", "ofensivo", "defensivo", "pressao"]);

export async function seasonDashboard(user: UserAccount) {
  const season = await getLatestRankedSeason(user.username);
  const matches = season ? await listRankedMatches(user.username, season.id) : [];
  const allUserMatches = await listRankedMatches(user.username);
  const rewards = await listRankedRewards(user.username);
  if (season?.division === "lenda" && !rewards.some((reward) => reward.rewardId === "elite-badge")) {
    const eliteBadge: RankedReward = {
      id: `${season.username}-elite-badge`,
      username: season.username,
      rewardId: "elite-badge",
      division: "lenda",
      seasonNumber: season.seasonNumber,
      unlockedAt: season.createdAt
    };
    await saveRankedReward(eliteBadge);
    rewards.push(eliteBadge);
  }
  return {
    season,
    matches: matches.sort((a, b) => a.matchNumber - b.matchNumber),
    allowance: dailyAllowance(allUserMatches),
    rewards,
    profileComplete: Boolean(user.country)
  };
}

export async function rankedTransferOffer(user: UserAccount) {
  const season = await getLatestRankedSeason(user.username);
  if (!season || season.status !== "active" || !season.transferState) return undefined;
  return buildTransferOffer(season);
}

export async function updateRankedTransfer(
  user: UserAccount,
  body: { action?: "draw" | "begin" | "reroll" | "confirm" | "cancel" | "complete-window"; slotId?: string; playerId?: string }
) {
  const lockKey = `transfer:${user.username.toLowerCase()}`;
  if (locks.has(lockKey) || locks.has(user.username)) throw new Error("A temporada esta sendo atualizada. Tente novamente.");
  locks.add(lockKey);
  try {
    const season = await getLatestRankedSeason(user.username);
    if (!season || season.status !== "active") throw new Error("Inicie uma temporada ativa antes de ajustar o elenco.");
    if (season.swapsUsed >= SEASON_SWAP_LIMIT && body.action !== "cancel" && body.action !== "complete-window") {
      throw new Error("As 3 trocas desta temporada ja foram utilizadas.");
    }

    if (body.action === "complete-window") {
      const next = {
        ...season,
        transferState: undefined,
        transferWindowCompletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await saveRankedSeason(next);
      return { season: next, offer: undefined };
    }

    if (body.action === "cancel") {
      const next = { ...season, transferState: undefined, updatedAt: new Date().toISOString() };
      await saveRankedSeason(next);
      return { season: next, offer: undefined };
    }

    if (body.action === "draw") {
      const clubSeasonId = drawTransferClub(season);
      const next = {
        ...season,
        transferState: {
          slotId: "",
          clubSeasonId,
          clubSeasonHistory: [clubSeasonId],
          createdAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      await saveRankedSeason(next);
      return { season: next, offer: buildTransferOffer(next) };
    }

    if (body.action === "begin") {
      const slotId = String(body.slotId || "");
      if (!season.squadSnapshot.some((pick) => pick.slotId === slotId)) throw new Error("Escolha um jogador do seu elenco.");
      if (season.transferState?.slotId === slotId) return { season, offer: buildTransferOffer(season) };
      const clubSeasonId = drawTransferClub(season, slotId);
      const next = {
        ...season,
        transferState: {
          slotId,
          clubSeasonId,
          clubSeasonHistory: [clubSeasonId],
          createdAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      await saveRankedSeason(next);
      return { season: next, offer: buildTransferOffer(next) };
    }

    if (body.action === "reroll") {
      if (!season.transferState) throw new Error("Sorteie primeiro um clube para a troca.");
      if (season.rerollsUsed >= SEASON_REROLL_LIMIT) throw new Error("Os 2 novos sorteios desta temporada ja foram utilizados.");
      const clubSeasonHistory = season.transferState.clubSeasonHistory?.length
        ? season.transferState.clubSeasonHistory
        : [season.transferState.clubSeasonId];
      const clubSeasonId = drawTransferClub(season, season.transferState.slotId || undefined, clubSeasonHistory);
      const next = {
        ...season,
        rerollsUsed: season.rerollsUsed + 1,
        transferState: {
          ...season.transferState,
          clubSeasonId,
          clubSeasonHistory: [...clubSeasonHistory, clubSeasonId],
          createdAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      };
      await saveRankedSeason(next);
      return { season: next, offer: buildTransferOffer(next) };
    }

    if (body.action === "confirm") {
      if (!season.transferState) throw new Error("A oferta de troca expirou.");
      const offer = buildTransferOffer(season);
      const player = offer.players.find((item) => item.id === body.playerId);
      if (!player) throw new Error("Este jogador nao pertence a oferta atual.");
      const slotId = String(body.slotId || offer.slotId);
      const currentPick = season.squadSnapshot.find((pick) => pick.slotId === slotId);
      if (!currentPick) throw new Error("Escolha no campo o jogador que deve sair.");
      const fit = calculatePositionFit(player, currentPick.slotPosition);
      if (!fit.allowed) throw new Error(`${player.shortName} nao pode atuar nesta posicao.`);
      const duplicate = season.squadSnapshot.some(
        (pick) => pick.slotId !== slotId && pick.player.canonicalPlayerId === player.canonicalPlayerId
      );
      if (duplicate) throw new Error("Esse jogador ja esta no elenco.");
      const replacement: DraftPick = {
        slotId: currentPick.slotId,
        slotPosition: currentPick.slotPosition,
        player,
        clubSeason: offer.clubSeason,
        effectiveRating: fit.effectiveRating,
        fitType: fit.type
      };
      const next = {
        ...season,
        swapsUsed: season.swapsUsed + 1,
        squadSnapshot: season.squadSnapshot.map((pick) => pick.slotId === replacement.slotId ? replacement : pick),
        transferState: undefined,
        updatedAt: new Date().toISOString()
      };
      await saveRankedSeason(next);
      return { season: next, offer: undefined };
    }

    throw new Error("Acao de troca invalida.");
  } finally {
    locks.delete(lockKey);
  }
}

export async function startRankedSeason(user: UserAccount, body: {
  squad?: DraftPick[];
  formation?: string;
  tacticalStyle?: TacticalStyle;
}) {
  const latest = await getLatestRankedSeason(user.username);
  if (latest && latest.status !== "completed") return latest;
  const formation = body.formation || latest?.formation || "4-3-3";
  const requestedStyle = body.tacticalStyle || latest?.tacticalStyle || "equilibrado";
  const tacticalStyle = validStyles.has(requestedStyle as TacticalStyle) ? requestedStyle : "equilibrado";
  const sourceSquad = body.squad ?? latest?.squadSnapshot;
  const squad = validateSquad(sourceSquad, formation, tacticalStyle);
  const now = new Date().toISOString();
  const division = latest ? nextDivision(latest.division, latest.outcome ?? "held") : 10;
  const requiresTransferWindow = Boolean(latest);
  const season: RankedSeason = {
    id: randomUUID(),
    username: user.username,
    seasonNumber: (latest?.seasonNumber ?? 0) + 1,
    division,
    status: "active",
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    matchesPlayed: 0,
    swapsUsed: 0,
    rerollsUsed: 0,
    formation,
    tacticalStyle,
    squadSnapshot: squad,
    requiresTransferWindow,
    transferWindowCompletedAt: requiresTransferWindow ? undefined : now,
    xpEarned: 0,
    createdAt: now,
    updatedAt: now
  };
  await saveRankedSeason(season);
  return season;
}

export async function playRankedMatch(user: UserAccount, idempotencyKey: string) {
  if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 120) throw new Error("Chave da partida invalida.");
  const previous = await getRankedMatchByIdempotency(user.username, idempotencyKey);
  if (previous) return { match: previous, season: await getLatestRankedSeason(user.username), duplicated: true };
  if (locks.has(user.username)) throw new Error("Ja existe uma partida sendo processada.");
  locks.add(user.username);
  try {
    const season = await getLatestRankedSeason(user.username);
    if (!season || season.status !== "active") throw new Error("Inicie uma temporada e confirme o elenco.");
    const transferWindowPending =
      (season.requiresTransferWindow ?? (season.seasonNumber > 1 && season.matchesPlayed === 0)) &&
      !season.transferWindowCompletedAt;
    if (transferWindowPending) {
      throw new Error("Conclua a janela de transferencias antes de disputar os proximos jogos.");
    }
    if (isSeasonComplete(season.matchesPlayed)) throw new Error("Esta temporada ja foi concluida.");
    const allMatches = await listRankedMatches(user.username);
    if (dailyAllowance(allMatches).remaining <= 0) throw new Error("Voce ja disputou suas 8 partidas de hoje. O limite sera renovado a meia-noite.");
    const seasonMatches = allMatches.filter((match) => match.rankedSeasonId === season.id);
    if (seasonMatches.some((match) => match.matchNumber === season.matchesPlayed + 1)) throw new Error("Esta partida ja foi registrada.");

    const opponent = await selectOpponent(user.username, season);
    const rng = createRng(`${season.id}-ranked-${season.matchesPlayed + 1}-${idempotencyKey}`);
    const result = simulateMatch({
      rng,
      squad: season.squadSnapshot,
      tacticalStyle: season.tacticalStyle,
      difficulty: seasonDifficulty(season.division),
      opponent,
      phase: `Temporada ${season.seasonNumber} - J${season.matchesPlayed + 1}`,
      knockout: false
    });
    const resultType = result.userGoals > result.opponentGoals ? "win" : result.userGoals === result.opponentGoals ? "draw" : "loss";
    const now = new Date().toISOString();
    const rankedMatch: RankedMatch = {
      id: randomUUID(),
      idempotencyKey,
      rankedSeasonId: season.id,
      matchNumber: season.matchesPlayed + 1,
      username: user.username,
      opponentUsername: opponent.username,
      opponentType: opponent.username ? "player" : "historical",
      opponentName: opponent.name,
      result: resultType,
      xpGranted: matchXp(resultType),
      match: result,
      createdAt: now,
      completedAt: now
    };

    const next: RankedSeason = {
      ...season,
      points: season.points + pointsForResult(resultType),
      wins: season.wins + (resultType === "win" ? 1 : 0),
      draws: season.draws + (resultType === "draw" ? 1 : 0),
      losses: season.losses + (resultType === "loss" ? 1 : 0),
      goalsFor: season.goalsFor + result.userGoals,
      goalsAgainst: season.goalsAgainst + result.opponentGoals,
      matchesPlayed: season.matchesPlayed + 1,
      xpEarned: season.xpEarned + rankedMatch.xpGranted,
      updatedAt: now
    };

    if (isSeasonComplete(next.matchesPlayed)) {
      next.status = "completed";
      next.outcome = seasonOutcome(next.division, next.points);
      const finalXp = completionXp(next.division, next.outcome, next.wins);
      next.xpEarned += finalXp;
      rankedMatch.xpGranted += finalXp;
      next.completedAt = now;
    }

    await saveRankedMatch(rankedMatch);
    await saveRankedSeason(next);
    const promotedToElite = next.division === 1 && next.outcome === "champion";
    if (next.status === "completed" && promotedToElite) {
      await grantSeasonRewards(next);
    }
    return { match: rankedMatch, season: next, duplicated: false };
  } finally {
    locks.delete(user.username);
  }
}

export async function seasonParticipants(currentUser: UserAccount, scope: "global" | "national") {
  const [users, seasons, rewards] = await Promise.all([listPublicUsers(), listRankedSeasons(), listRankedRewards()]);
  const latestByUser = new Map<string, RankedSeason>();
  for (const season of seasons) {
    const key = season.username.toLowerCase();
    const current = latestByUser.get(key);
    if (!current || season.seasonNumber > current.seasonNumber) latestByUser.set(key, season);
  }
  const trophyCount = new Map<string, number>();
  const eliteUsers = new Set<string>();
  for (const reward of rewards) {
    const key = reward.username.toLowerCase();
    const trophyDelta = trophyRewardDelta(reward);
    if (trophyDelta) trophyCount.set(key, (trophyCount.get(key) ?? 0) + trophyDelta);
    if (reward.rewardId === "elite-badge") eliteUsers.add(key);
  }
  const totalXp = new Map<string, number>();
  for (const season of seasons) totalXp.set(season.username.toLowerCase(), (totalXp.get(season.username.toLowerCase()) ?? 0) + season.xpEarned);

  const eligible = users.filter((user) => {
    if (!latestByUser.has(user.username.toLowerCase())) return false;
    return scope === "global" || Boolean(currentUser.country && user.country === currentUser.country);
  });
  const ranked = eligible
    .map((user) => {
      const key = user.username.toLowerCase();
      const season = latestByUser.get(key)!;
      return {
        username: maskUsername(user.username),
        playerName: user.playerName?.trim() || user.username,
        teamName: user.teamName?.trim() || `${user.username} FC`,
        emblemId: user.emblemId,
        country: user.country,
        division: season.division,
        seasonNumber: season.seasonNumber,
        matchesPlayed: season.matchesPlayed,
        wins: season.wins,
        draws: season.draws,
        losses: season.losses,
        points: season.points,
        xp: totalXp.get(key) ?? 0,
        trophies: Math.max(0, trophyCount.get(key) ?? 0),
        elite: eliteUsers.has(key),
        updatedAt: season.updatedAt,
        isCurrentUser: key === currentUser.username.toLowerCase()
      };
    })
    .sort(compareParticipants);

  return ranked.slice(0, 100).map((item, index) => ({ ...item, rank: index + 1 } satisfies SeasonParticipant));
}

function validateSquad(input: DraftPick[] | undefined, formation = "4-3-3", tacticalStyle: TacticalStyle = "equilibrado") {
  if (!Array.isArray(input) || input.length !== 11) throw new Error("Monte e confirme os 11 jogadores antes de iniciar.");
  const slots = getFormationSlots(formation, tacticalStyle);
  if (slots.length !== 11) throw new Error("Formacao invalida.");
  const canonicalIds = new Set<string>();
  return input.map((pick) => {
    const player = players.find((item) => item.id === pick.player?.id);
    const clubSeason = clubSeasons.find((item) => item.id === player?.clubSeasonId);
    const slot = slots.find((item) => item.id === pick.slotId);
    if (!player || !clubSeason || !slot || canonicalIds.has(player.canonicalPlayerId)) throw new Error("Elenco invalido ou com jogador duplicado.");
    const fit = calculatePositionFit(player, slot.position);
    if (!fit.allowed) throw new Error(`${player.shortName} nao pode atuar em ${slot.label}.`);
    canonicalIds.add(player.canonicalPlayerId);
    return {
      slotId: slot.id,
      slotPosition: slot.position,
      player,
      clubSeason,
      effectiveRating: Math.min(99, Math.max(fit.effectiveRating, Math.min(Number(pick.effectiveRating) || fit.effectiveRating, fit.effectiveRating + 2))),
      fitType: fit.type
    } satisfies DraftPick;
  });
}

function drawTransferClub(season: RankedSeason, slotId?: string, excludedClubSeasonIds: string[] = []) {
  const currentPick = slotId ? season.squadSnapshot.find((pick) => pick.slotId === slotId) : undefined;
  if (slotId && !currentPick) throw new Error("Jogador da temporada nao encontrado.");
  const selectedCanonicalIds = new Set(
    season.squadSnapshot.filter((pick) => pick.slotId !== slotId).map((pick) => pick.player.canonicalPlayerId)
  );
  const eligible = clubSeasons.filter((clubSeason) => {
    if (excludedClubSeasonIds.includes(clubSeason.id)) return false;
    return players.some(
      (player) =>
        player.clubSeasonId === clubSeason.id &&
        player.isActive &&
        player.canonicalPlayerId !== currentPick?.player.canonicalPlayerId &&
        !selectedCanonicalIds.has(player.canonicalPlayerId) &&
        (!currentPick || calculatePositionFit(player, currentPick.slotPosition).allowed)
    );
  });
  if (eligible.length === 0) throw new Error("Nenhum clube possui uma opcao valida para troca.");
  return createRng(`${season.id}-transfer-${slotId || "draw"}-${season.swapsUsed}-${season.rerollsUsed}-${randomUUID()}`).pick(eligible).id;
}

function buildTransferOffer(season: RankedSeason): SeasonTransferOffer {
  const state = season.transferState;
  if (!state) throw new Error("Oferta de troca nao encontrada.");
  const currentPick = state.slotId ? season.squadSnapshot.find((pick) => pick.slotId === state.slotId) : undefined;
  const clubSeason = clubSeasons.find((item) => item.id === state.clubSeasonId);
  if (!clubSeason || (state.slotId && !currentPick)) throw new Error("A oferta de troca nao pode ser recuperada.");
  const selectedCanonicalIds = new Set(
    season.squadSnapshot.filter((pick) => pick.slotId !== state.slotId).map((pick) => pick.player.canonicalPlayerId)
  );
  const eligiblePlayers = players
    .filter(
      (player) =>
        player.clubSeasonId === clubSeason.id &&
        player.isActive &&
        player.canonicalPlayerId !== currentPick?.player.canonicalPlayerId &&
        !selectedCanonicalIds.has(player.canonicalPlayerId) &&
        (!currentPick || season.squadSnapshot.some((pick) => calculatePositionFit(player, pick.slotPosition).allowed))
    )
    .sort((a, b) => b.overall - a.overall);
  if (eligiblePlayers.length === 0) throw new Error("A oferta nao possui jogadores validos.");
  return {
    slotId: state.slotId,
    currentPick,
    clubSeason,
    players: eligiblePlayers,
    swapsRemaining: Math.max(0, SEASON_SWAP_LIMIT - season.swapsUsed),
    rerollsRemaining: Math.max(0, SEASON_REROLL_LIMIT - season.rerollsUsed)
  };
}

async function selectOpponent(username: string, season: RankedSeason) {
  const allSeasons = await listRankedSeasons();
  const userRating = calculateTeamRating(season.squadSnapshot);
  const target = Math.min(96, Math.max(72, userRating + seasonOpponentAdjustment(season.division)));
  const candidates = allSeasons.filter(
    (item) => item.username.toLowerCase() !== username.toLowerCase() && item.division === season.division && item.squadSnapshot.length === 11
  );
  const comparableCandidates = candidates
    .map((item) => ({ item, strength: calculateTeamRating(item.squadSnapshot) }))
    .filter(({ strength }) => Math.abs(strength - target) <= 4);
  if (comparableCandidates.length > 0) {
    const rng = createRng(`${season.id}-opponent-${season.matchesPlayed}`);
    const selectedEntry = rng.pick(comparableCandidates);
    const selected = selectedEntry.item;
    const users = await listPublicUsers();
    const account = users.find((user) => user.username.toLowerCase() === selected.username.toLowerCase());
    return {
      id: `player-${selected.username}`,
      name: account?.teamName?.trim() || `${maskUsername(selected.username)} FC`,
      strength: selectedEntry.strength,
      username: selected.username
    };
  }
  const rng = createRng(`${season.id}-historical-${season.matchesPlayed}`);
  const pool = opponents.filter((opponent) => Math.abs(opponent.strength - target) <= 3);
  const nearestGap = Math.min(...opponents.map((opponent) => Math.abs(opponent.strength - target)));
  const nearest = opponents.filter((opponent) => Math.abs(opponent.strength - target) === nearestGap);
  const selected = rng.pick(pool.length ? pool : nearest);
  return { ...selected, username: undefined };
}

function compareParticipants(a: Omit<SeasonParticipant, "rank">, b: Omit<SeasonParticipant, "rank">) {
  const divisionScore = (value: RankedDivision) => value === "lenda" ? 0 : value;
  return divisionScore(a.division) - divisionScore(b.division) || b.trophies - a.trophies || b.xp - a.xp || b.points - a.points;
}

async function grantSeasonRewards(season: RankedSeason) {
  const now = season.completedAt ?? new Date().toISOString();
  if (season.division === 1 && season.outcome === "champion") {
    const rewardId = `season-trophy-elite-${season.seasonNumber}`;
    const trophy: RankedReward = { id: `${season.username}-${rewardId}`, username: season.username, rewardId, division: season.division, seasonNumber: season.seasonNumber, unlockedAt: now };
    await saveRankedReward(trophy);
    await saveRankedReward({
      id: `${season.username}-elite-badge`,
      username: season.username,
      rewardId: "elite-badge",
      division: "lenda",
      seasonNumber: season.seasonNumber,
      unlockedAt: now
    });
  }
}
