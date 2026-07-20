import assert from "node:assert/strict";
import { players } from "../src/data/loaders";
import { autoCompleteRoomDraft, autoPickRoomTurn, chooseRoomCoach, createFriendRoom, drawRoomCoaches, drawRoomTeam, joinRoom, normalizeFriendRooms, placeRoomPlayer, playPlayerRoomMatch, previewPlayerRoomMatch, progressRoomRound, replaceRoomPick, selectRoomPlayer, setRoomPlayerReady, startRoomDraft, startRoomCoachStage, type FriendRoom, type RoomDraw } from "../src/lib/friend-rooms";

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
  assert.ok(room.coachOptionsByPlayer[player.id]?.every((coach) => coach.clubSeasonId));
});

test("draft por turnos sorteia times, revisa elenco, escolhe tecnico e gera chave", () => {
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

  assert.equal(room.status, "reviewing");
  assert.equal(room.players.every((player) => player.squad.length === 11), true);
  room = startRoomCoachStage(room);
  room = chooseCoaches(room);
  assert.equal(room.status, "bracket");
  assert.equal(room.bracket.filter((match) => match.phase === "Oitavas de final").length, 8);
  assert.equal(room.bracket.every((match) => match.status === "pending"), true);
  const firstPlayer = room.players[0]!;
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
    simultaneousMinutes: 3,
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

test("draft online permite 3 rerolls por escolha sem gastar no primeiro sorteio", () => {
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
  assert.equal(room.status, "reviewing");
  assert.ok((room.reviewEndsAt ?? 0) - Date.now() > 28_000);
  const currentPlayer = room.players[0]!;
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
