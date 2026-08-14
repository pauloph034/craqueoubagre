import assert from "node:assert/strict";
import { players } from "../src/data/loaders";
import { activateRoomSecretCard, autoCompleteRoomDraft, autoPickRoomPlayer, autoPickRoomTurn, chooseRoomCoach, chooseRoomLegend, chooseRoomSecretCard, confirmRoomReview, createFriendRoom, drawRoomCoaches, drawRoomTeam, joinRoom, normalizeFriendRooms, placeRoomPlayer, playPlayerRoomMatch, previewPlayerRoomMatch, progressRoomRound, replaceRoomPick, selectRoomPlayer, setRoomPlayerReady, shootRoomPenalty, startRoomDraft, startRoomCoachStage, updateRoomPlayerSetup, type FriendRoom, type RoomDraw } from "../src/lib/friend-rooms";

function test(name: string, fn: () => void) {
  fn();
  console.log(`ok - ${name}`);
}

test("sala cria lobby com host", () => {
  const room = createFriendRoom({
    name: "Final de Copa",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  assert.equal(room.status, "lobby");
  assert.equal(room.players.length, 1);
  assert.equal(room.players[0]?.teamName, "Sergipe FC");
});

test("salas vazias sao removidas automaticamente", () => {
  const room = createFriendRoom({
    name: "Sala vazia",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  assert.equal(normalizeFriendRooms([{ ...room, players: [] }]).length, 0);
});

test("penalti com precisao de ate 35 por cento sempre e defendido", () => {
  let room = createFriendRoom({
    name: "Teste de penalti",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const playerId = room.players[0]!.id;
  room = setRoomPlayerReady(room, playerId, true);
  room = startRoomDraft(room);
  for (let step = 0; step < 60 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  assert.equal(room.status, "challenge");
  const afterShot = shootRoomPenalty(room, playerId, "left", 35);
  assert.equal(afterShot.penaltyShotsByPlayer[playerId]![0]!.scored, false);
});

test("penalti acima de 85 por cento e gol mesmo com o goleiro no canto", () => {
  let room = createFriendRoom({
    name: "Teste de penalti garantido",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const playerId = room.players[0]!.id;
  room = setRoomPlayerReady(room, playerId, true);
  room = startRoomDraft(room);
  for (let step = 0; step < 60 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  assert.equal(room.status, "challenge");
  const first = shootRoomPenalty(room, playerId, "left", 86);
  const shot = first.penaltyShotsByPlayer[playerId]![0]!;
  const result = shootRoomPenalty(room, playerId, shot.keeperDirection, 86);
  assert.equal(result.penaltyShotsByPlayer[playerId]![0]!.scored, true);
});

test("draft permite trocar jogador pendente antes de colocar na escalação", () => {
  let room = createFriendRoom({
    name: "Troca pendente",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const player = room.players[0]!;
  room = setRoomPlayerReady(room, player.id, true);
  room = startRoomDraft(room);
  room = drawRoomTeam(room, player.id);
  const candidates = room.currentDraw!.roster.filter((pick) => selectRoomPlayer(room, player.id, pick.id).pendingPickId === pick.id).slice(0, 2);
  assert.equal(candidates.length, 2);
  room = selectRoomPlayer(room, player.id, candidates[0]!.id);
  assert.equal(room.pendingPickId, candidates[0]!.id);
  room = selectRoomPlayer(room, player.id, candidates[1]!.id);
  assert.equal(room.pendingPickId, candidates[1]!.id);
  assert.equal(room.players[0]!.squad.length, 0);
});

test("adriano atacante usa o elenco correto ao escolher ATA", () => {
  let room = createFriendRoom({
    name: "Adriano",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const player = room.players[0]!;
  const adriano = players.find((item) => item.name === "Adriano" && item.clubSeasonId === "internazionale-2004-05")!;
  const draw: RoomDraw = {
    clubSeasonId: "internazionale-2004-05",
    clubId: "internazionale",
    clubName: "Internazionale",
    shortName: "Inter",
    season: "2004/05",
    country: "Italia",
    primaryColor: "#0b5bd3",
    secondaryColor: "#111111",
    genericBadgeShape: "round",
    rarity: "lendaria",
    roster: [{
      id: adriano.id,
      canonicalPlayerId: adriano.canonicalPlayerId,
      name: adriano.name,
      nationality: adriano.nationality,
      clubName: "Internazionale",
      clubSeasonId: adriano.clubSeasonId,
      season: "2004/05",
      position: adriano.primaryPosition,
      overall: adriano.overall,
      shirtNumber: adriano.shirtNumber
    }]
  };
  room = { ...setRoomPlayerReady(room, player.id, true), status: "drafting", currentDraw: draw, pendingPickId: adriano.id };
  room = placeRoomPlayer(room, player.id, "st");
  assert.equal(room.players[0]!.squad[0]?.slotPosition, "ST");
  assert.equal(room.players[0]!.squad[0]?.effectiveRating, adriano.overall);
});

test("tecnicos da sala carregam temporada para mostrar escudo", () => {
  let room = createFriendRoom({
    name: "Tecnicos",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const player = room.players[0]!;
  room = {
    ...room,
    status: "coach",
    players: [{
      ...player,
      squad: Array.from({ length: 11 }, (_, index) => ({
        id: `p${index}`,
        canonicalPlayerId: `p${index}`,
        name: `P${index}`,
        nationality: index === 0 ? "Italia" : "Brasil",
        clubName: "Teste",
        clubSeasonId: "barcelona-2010-11",
        season: "2010/11",
        position: "CM" as const,
        overall: 80,
        slotId: `s${index}`,
        slotPosition: "CM" as const,
        slotLabel: "MC",
        effectiveRating: 80
      }))
    }]
  };
  room = drawRoomCoaches(room, player.id);
  assert.ok(room.coachOptionsByPlayer[player.id]?.every((coach) => coach.clubSeasonId && coach.nationality));
  const selectedCoach = room.coachOptionsByPlayer[player.id]?.[0];
  assert.ok(selectedCoach);
  room = {
    ...room,
    players: room.players.map((roomPlayer) => ({
      ...roomPlayer,
      squad: roomPlayer.squad.map((pick, index) => ({
        ...pick,
        nationality: index === 0 ? selectedCoach.nationality : "Brasil"
      }))
    }))
  };
  room = chooseRoomCoach(room, player.id, selectedCoach.id);
  assert.equal(room.players[0]?.squad[0]?.effectiveRating, 82);
  assert.equal(room.players[0]?.squad[1]?.effectiveRating, 80);
});

test("draft por turnos sorteia times, revisa elenco, escolhe tecnico, carta e gera chave", () => {
  let room = createFriendRoom({
    name: "Mata-mata",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "privada",
    password: "123",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 20
  });
  room = joinRoom(room, "Ana", "Ana FC");
  room = joinRoom(room, "Bruno", "Bruno FC");
  for (const player of room.players) {
    room = setRoomPlayerReady(room, player.id, true);
  }
  room = startRoomDraft(room);
  assert.equal(room.status, "drafting");
  assert.equal(room.turnOptions.length, 0);

  for (let i = 0; i < 80 && room.status === "drafting"; i++) {
    room = autoPickRoomTurn(room);
  }

  assert.equal(room.status, "challenge");
  room = finishPenaltyChallenge(room);
  for (let i = 0; i < 20 && room.status === "drafting"; i++) room = autoPickRoomTurn(room);
  assert.equal(room.status, "reviewing");
  assert.equal(room.players.every((player) => player.squad.length === 11), true);
  room = startRoomCoachStage(room);
  room = chooseCoaches(room);
  assert.equal(room.status, "cards");
  assert.equal(room.players.every((player) => room.cardOptionsByPlayer[player.id]?.length === 1), true);
  assert.equal(room.players.every((player) => Boolean(room.selectedCardByPlayer[player.id])), true);
  room = chooseCards(room);
  assert.equal(room.status, "bracket");
  assert.equal(room.bracket.filter((match) => match.phase === "Oitavas de final").length, 8);
  assert.equal(room.bracket.every((match) => match.status === "pending"), true);
  const firstPlayer = room.players[0]!;
  room = {
    ...room,
    selectedCardByPlayer: { ...room.selectedCardByPlayer, [firstPlayer.id]: "perfect-night" },
    cardActivationByPlayer: Object.fromEntries(
      Object.entries(room.cardActivationByPlayer).filter(([playerId]) => playerId !== firstPlayer.id)
    )
  };
  const playerMatchBeforeCard = room.bracket.find((match) => match.status === "pending" && (match.homePlayerId === firstPlayer.id || match.awayPlayerId === firstPlayer.id))!;
  const playerStrengthBeforeCard = playerMatchBeforeCard.homePlayerId === firstPlayer.id ? playerMatchBeforeCard.homeStrength : playerMatchBeforeCard.awayStrength;
  assert.ok(playerStrengthBeforeCard !== undefined);
  room = activateRoomSecretCard(room, firstPlayer.id);
  const playerMatchAfterCard = room.bracket.find((match) => match.id === playerMatchBeforeCard.id)!;
  const playerStrengthAfterCard = playerMatchAfterCard.homePlayerId === firstPlayer.id ? playerMatchAfterCard.homeStrength : playerMatchAfterCard.awayStrength;
  assert.equal(playerStrengthAfterCard, playerStrengthBeforeCard + 5);
  assert.equal(room.cardActivationByPlayer[firstPlayer.id]?.cardId, "perfect-night");
  room = activateRoomSecretCard(room, firstPlayer.id);
  const playerMatchAfterSecondUse = room.bracket.find((match) => match.id === playerMatchBeforeCard.id)!;
  const playerStrengthAfterSecondUse = playerMatchAfterSecondUse.homePlayerId === firstPlayer.id ? playerMatchAfterSecondUse.homeStrength : playerMatchAfterSecondUse.awayStrength;
  assert.equal(playerStrengthAfterSecondUse, playerStrengthAfterCard);
  const preview = previewPlayerRoomMatch(room, firstPlayer.id);
  assert.ok(preview);
  const afterMatch = playPlayerRoomMatch(room, firstPlayer.id);
  const saved = afterMatch.bracket.find((match) => match.id === preview.id);
  assert.equal(saved?.homeGoals, preview.homeGoals);
  assert.equal(saved?.awayGoals, preview.awayGoals);

  room = finishBracket(room);
  assert.equal(room.status, "finished");
  assert.equal(room.bracket.length, 15);
  assert.ok(room.champion);
});

test("auto completar preenche participantes e mata-mata com 16 times", () => {
  let room = createFriendRoom({
    name: "Todos juntos",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "almanaque",
    draftMode: "todos",
    simultaneousMinutes: 4,
    turnSeconds: 45
  });
  room = joinRoom(room, "Ana", "Ana FC");
  for (const player of room.players) {
    room = setRoomPlayerReady(room, player.id, true);
  }
  room = startRoomDraft(room);
  room = autoCompleteRoomDraft(room);
  assert.equal(room.players.every((player) => player.squad.length === 11), true);
  assert.equal(room.status, "coach");
  room = chooseCoaches(room);
  assert.equal(room.status, "cards");
  room = chooseCards(room);
  assert.equal(room.status, "bracket");
  assert.equal(room.bracket.filter((match) => match.phase === "Oitavas de final").length, 8);
  assert.equal(room.bracket.length, 8);
});

function chooseCoaches(room: FriendRoom) {
  let next = room;
  for (const player of next.players) {
    next = drawRoomCoaches(next, player.id);
    const option = next.coachOptionsByPlayer[player.id]?.[0];
    assert.ok(option);
    next = chooseRoomCoach(next, player.id, option.id);
  }
  return next;
}

function chooseCards(room: FriendRoom) {
  let next = room;
  for (const player of next.players) {
    const option = next.selectedCardByPlayer[player.id];
    assert.ok(option);
    next = chooseRoomSecretCard(next, player.id, option);
  }
  return next;
}

function finishPenaltyChallenge(room: FriendRoom) {
  let next = room;
  for (let roundStep = 0; roundStep < 5 && next.status === "challenge" && !next.penaltyWinnerId; roundStep++) {
    const round = next.penaltyRound;
    const required = round === 0 ? 3 : 1;
    const eligible = [...next.penaltyEligiblePlayerIds];
    for (const playerId of eligible) {
      while ((next.penaltyShotsByPlayer[playerId] ?? []).filter((shot) => shot.round === round).length < required) {
        next = shootRoomPenalty(next, playerId, "center", 100);
      }
    }
  }
  assert.ok(next.penaltyWinnerId);
  assert.equal(next.legendOptions.length, 5);
  assert.equal(next.legendOptions.every((pick) => pick.overall === 99 && pick.effectiveRating === 99), true);
  assert.equal(new Set(next.legendOptions.map((pick) => pick.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())).size, next.legendOptions.length);
  return chooseRoomLegend(next, next.penaltyWinnerId, next.legendOptions[0]!.id);
}

function finishBracket(room: FriendRoom) {
  let next = room;
  for (let step = 0; step < 20 && next.status !== "finished"; step++) {
    const snapshot = `${next.status}-${next.bracketRound}-${next.bracket.length}-${next.bracket.filter((match) => match.status === "done").length}`;
    for (const player of next.players) next = playPlayerRoomMatch(next, player.id);
    next = progressRoomRound(next);
    const after = `${next.status}-${next.bracketRound}-${next.bracket.length}-${next.bracket.filter((match) => match.status === "done").length}`;
    if (snapshot === after) break;
  }
  return next;
}

test("salas antigas inativas saem da lista compartilhada", () => {
  const room = createFriendRoom({
    name: "Sala antiga",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const oldSeenAt = Date.now() - 2 * 60 * 60 * 1000;
  assert.equal(normalizeFriendRooms([{ ...room, createdAt: oldDate, updatedAt: oldDate, lastSeenAt: Object.fromEntries(room.players.map((player) => [player.id, oldSeenAt])) }]).length, 0);
});

test("draft online permite somente 3 rerolls durante todo o draft", () => {
  let room = createFriendRoom({
    name: "Rerolls",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const player = room.players[0]!;
  room = setRoomPlayerReady(room, player.id, true);
  room = startRoomDraft(room);
  room = drawRoomTeam(room, player.id);
  assert.equal(room.rerollsByPlayer[player.id], 0);
  const firstClub = room.currentDraw?.clubSeasonId;
  room = drawRoomTeam(room, player.id);
  room = drawRoomTeam(room, player.id);
  room = drawRoomTeam(room, player.id);
  assert.equal(room.rerollsByPlayer[player.id], 3);
  const finalClub = room.currentDraw?.clubSeasonId;
  room = drawRoomTeam(room, player.id);
  assert.equal(room.rerollsByPlayer[player.id], 3);
  assert.equal(room.currentDraw?.clubSeasonId, finalClub);
  assert.ok(firstClub);
});

test("draft por turnos respeita rodadas de 3, fecha 10 e libera o desafio", () => {
  let room = createFriendRoom({
    name: "Turnos",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  room = joinRoom(room, "Ana", "Ana FC");
  room = joinRoom(room, "Bruno", "Bruno FC");
  for (const player of room.players) room = setRoomPlayerReady(room, player.id, true);
  room = startRoomDraft(room);

  for (let step = 0; step < 120 && room.status === "drafting"; step++) {
    const beforeAllNine = room.players.every((player) => player.squad.length >= 9);
    const actorIndex = room.turnIndex;
    room = autoPickRoomTurn(room);
    if (!beforeAllNine) assert.ok(room.players[actorIndex]!.squad.length <= 9);
    assert.ok(room.players.every((player) => player.squad.length <= 11));
  }

  assert.equal(room.players.every((player) => player.squad.length === 10), true);
  assert.equal(room.status, "challenge");
  assert.equal((room.penaltyEndsAt ?? 0) - (room.penaltyStartedAt ?? 0), 45_000);

  room = finishPenaltyChallenge(room);
  assert.equal(room.players.filter((player) => player.squad.length === 11).length, 1);
  assert.equal(room.players.flatMap((player) => player.squad).some((pick) => pick.overall === 99), true);
  for (let step = 0; step < 30 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  assert.equal(room.players.every((player) => player.squad.length === 11), true);
  assert.equal(room.status, "reviewing");
});

test("revisao online permite somente uma troca por jogador", () => {
  let room = createFriendRoom({
    name: "Troca unica",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const playerId = room.players[0]!.id;
  room = setRoomPlayerReady(room, playerId, true);
  room = startRoomDraft(room);
  for (let step = 0; step < 80 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  room = finishPenaltyChallenge(room);
  for (let step = 0; step < 20 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  assert.equal(room.status, "reviewing");

  const original = room.players[0]!.squad[0]!;
  let firstReplacement: FriendRoom | undefined;
  for (const candidate of players) {
    const next = replaceRoomPick(room, playerId, original.slotId!, candidate.id);
    if (next.players[0]!.squad[0]!.canonicalPlayerId !== original.canonicalPlayerId) {
      firstReplacement = next;
      break;
    }
  }
  assert.ok(firstReplacement);
  assert.equal(firstReplacement.reviewSwapUsedByPlayer[playerId], true);
  const acceptedCanonical = firstReplacement.players[0]!.squad[0]!.canonicalPlayerId;

  let afterSecondAttempt = firstReplacement;
  for (const candidate of players) {
    if (candidate.canonicalPlayerId === acceptedCanonical) continue;
    afterSecondAttempt = replaceRoomPick(firstReplacement, playerId, original.slotId!, candidate.id);
    break;
  }
  assert.equal(afterSecondAttempt.players[0]!.squad[0]!.canonicalPlayerId, acceptedCanonical);
});

test("draft simultaneo mantem sorteios e escolhas separados por jogador", () => {
  let room = createFriendRoom({
    name: "Simultaneo",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "todos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  room = joinRoom(room, "Ana", "Ana FC");
  for (const player of room.players) room = setRoomPlayerReady(room, player.id, true);
  room = startRoomDraft(room);
  const first = room.players[0]!;
  const second = room.players[1]!;

  room = drawRoomTeam(room, first.id);
  room = drawRoomTeam(room, second.id);
  assert.ok(room.currentDrawByPlayer?.[first.id]);
  assert.ok(room.currentDrawByPlayer?.[second.id]);
  room = autoPickRoomPlayer(room, first.id);
  assert.equal(room.players[0]!.squad.length, 1);
  assert.equal(room.players[1]!.squad.length, 0);
  assert.ok(room.currentDrawByPlayer?.[second.id]);
});

test("revisao online dura 30 segundos e permite substituir por jogador compativel", () => {
  let room = createFriendRoom({
    name: "Revisao",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const player = room.players[0]!;
  room = setRoomPlayerReady(room, player.id, true);
  room = startRoomDraft(room);
  for (let step = 0; step < 40 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  room = finishPenaltyChallenge(room);
  for (let step = 0; step < 20 && room.status === "drafting"; step++) room = autoPickRoomTurn(room);
  assert.equal(room.status, "reviewing");
  assert.ok((room.reviewEndsAt ?? 0) - Date.now() > 28_000);
  const currentPlayer = room.players[0]!;
  const confirmedWithoutSwap = confirmRoomReview(room, currentPlayer.id);
  assert.equal(confirmedWithoutSwap.status, "coach");
  const slot = currentPlayer.squad.find((pick) => pick.slotId)?.slotId;
  assert.ok(slot);
  const used = new Set(currentPlayer.squad.map((pick) => pick.canonicalPlayerId));
  const before = currentPlayer.squad.find((pick) => pick.slotId === slot)?.id;
  for (const replacement of players.filter((item) => item.isActive && !used.has(item.canonicalPlayerId))) {
    const attempt = replaceRoomPick(room, currentPlayer.id, slot, replacement.id);
    const changed = attempt.players[0]!.squad.find((pick) => pick.slotId === slot)?.id !== before;
    if (changed) {
      room = attempt;
      break;
    }
  }
  const after = room.players[0]!.squad.find((pick) => pick.slotId === slot)?.id;
  assert.notEqual(after, before);
});

test("confirmacao do lobby permanece ao clicar na preparacao ja selecionada", () => {
  let room = createFriendRoom({
    name: "Lobby estavel",
    hostName: "Paulo",
    hostTeamName: "Sergipe FC",
    visibility: "publica",
    difficulty: "classico",
    draftMode: "turnos",
    simultaneousMinutes: 2,
    turnSeconds: 30
  });
  const player = room.players[0]!;
  room = setRoomPlayerReady(room, player.id, true);
  room = updateRoomPlayerSetup(room, player.id, {
    formation: player.formation,
    tacticalStyle: player.tacticalStyle
  });
  assert.equal(room.players[0]!.ready, true);

  room = updateRoomPlayerSetup(room, player.id, { formation: "4-4-2" });
  assert.equal(room.players[0]!.ready, false);
});
