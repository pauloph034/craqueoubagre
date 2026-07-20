import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) {
  console.error("Uso: npm run import:csv -- caminho/players.csv");
  process.exit(1);
}

const rows = readFileSync(file, "utf8").trim().split(/\r?\n/);
const headers = rows.shift()?.split(",") ?? [];
const records = rows.map((row) => Object.fromEntries(row.split(",").map((value, index) => [headers[index], value])));
console.log(JSON.stringify(records, null, 2));
