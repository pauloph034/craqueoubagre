import assert from "node:assert/strict";
import { getFootballTeamByName, getTeamLogo, TEAM_PLACEHOLDER_LOGO } from "../src/data/football-clubs";
import { createMemoryFootballCache, getTeamById, normalizeTeam, validateFootballTeamQuery } from "../src/services/footballApi";

function test(name: string, fn: () => void) {
  fn();
  console.log(`ok - ${name}`);
}

async function testAsync(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`ok - ${name}`);
}

test("url de escudo e fallback local", () => {
  assert.equal(getTeamLogo(541), "https://media.api-sports.io/football/teams/541.png");
  assert.equal(getTeamLogo(null), TEAM_PLACEHOLDER_LOGO);
  assert.equal(getFootballTeamByName("Real Madrid 25/26")?.apiId, 541);
  assert.equal(getFootballTeamByName("Sampdoria 91/92")?.apiId, 498);
  assert.equal(getFootballTeamByName("Panathinaikos 70/71")?.apiId, 617);
  assert.equal(getFootballTeamByName("Dynamo Kyiv 98/99")?.apiId, 572);
});

test("normalizacao da resposta da API-Football", () => {
  const normalized = normalizeTeam({ team: { id: 541, name: "Real Madrid", code: null, country: "Spain", logo: null } });
  assert.equal(normalized.apiId, 541);
  assert.equal(normalized.code, "RMA");
  assert.equal(normalized.logo, getTeamLogo(541));
  assert.equal(normalized.source, "api");
});

test("cache valido e cache expirado", () => {
  let now = 1000;
  const cache = createMemoryFootballCache(() => now);
  const realMadrid = getFootballTeamByName("Real Madrid")!;
  cache.set("team:541", [realMadrid], 100);
  assert.equal(cache.get("team:541")?.[0]?.source, "cache");
  now = 1200;
  assert.equal(cache.get("team:541"), undefined);
});

test("validacao de parametros do endpoint interno", () => {
  assert.equal(validateFootballTeamQuery(new URLSearchParams()).ok, false);
  assert.equal(validateFootballTeamQuery(new URLSearchParams("search=ab")).ok, false);
  assert.equal(validateFootballTeamQuery(new URLSearchParams("teamId=541")).ok, true);
  assert.equal(validateFootballTeamQuery(new URLSearchParams("league=2&season=2025")).ok, true);
});

await testAsync("ausencia da API_FOOTBALL_KEY usa cadastro local", async () => {
  const previous = process.env.API_FOOTBALL_KEY;
  delete process.env.API_FOOTBALL_KEY;
  const result = await getTeamById(541);
  assert.equal(result.source, "local");
  assert.equal(result.warning, "missing-api-key");
  assert.equal(result.teams[0]?.apiId, 541);
  if (previous !== undefined) process.env.API_FOOTBALL_KEY = previous;
});
