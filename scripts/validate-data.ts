import achievementsJson from "../src/data/achievements.json";
import clubSeasonsJson from "../src/data/club-seasons.json";
import opponentsJson from "../src/data/opponents.json";
import playersJson from "../src/data/players.json";
import { dataSetSchema } from "../src/data/schemas";

const parsed = dataSetSchema.parse({
  clubSeasons: clubSeasonsJson,
  players: playersJson,
  opponents: opponentsJson,
  achievements: achievementsJson
});
const { clubSeasons, players, opponents, achievements } = parsed;

const errors: string[] = [];
const playerIds = new Set(players.map((player) => player.id));

for (const season of clubSeasons) {
  if (!season.players.every((id) => playerIds.has(id))) errors.push(`${season.id}: referencia jogador inexistente`);
  if (!players.some((player) => player.clubSeasonId === season.id && player.primaryPosition === "GK")) errors.push(`${season.id}: sem goleiro`);
  if (season.players.length < 15) errors.push(`${season.id}: menos de 15 jogadores`);
}

for (const player of players) {
  if (player.overall < 60 || player.overall > 99) errors.push(`${player.id}: rating fora da escala`);
  if (!clubSeasons.some((season) => season.id === player.clubSeasonId)) errors.push(`${player.id}: clubSeasonId invalido`);
}

if (clubSeasons.length < 16) errors.push("Dataset precisa de ao menos 16 clube-temporadas");
if (opponents.length < 7) errors.push("Dataset precisa de adversarios suficientes");
if (achievements.length < 1) errors.push("Dataset precisa de conquistas");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Dataset valido: ${clubSeasons.length} elencos, ${players.length} jogadores, ${opponents.length} adversarios.`);
