import players from "../src/data/players.json";

const groups = players.reduce<Record<string, string[]>>((acc, player) => {
  acc[player.canonicalPlayerId] = [...(acc[player.canonicalPlayerId] ?? []), player.id];
  return acc;
}, {});

for (const [canonical, ids] of Object.entries(groups).filter(([, ids]) => ids.length > 1)) {
  console.log(`${canonical}: ${ids.join(", ")}`);
}
