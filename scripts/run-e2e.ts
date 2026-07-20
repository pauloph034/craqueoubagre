import { spawn } from "node:child_process";

const env = {
  ...process.env,
  Path: `C:\\Program Files\\nodejs;${process.env.Path ?? ""}`,
  PLAYWRIGHT_BROWSERS_PATH: `${process.cwd()}\\work\\ms-playwright`
};

const child = spawn(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "--reporter=list"], {
  cwd: process.cwd(),
  env,
  shell: false,
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
let settled = false;

function write(chunk: Buffer, stream: NodeJS.WriteStream) {
  const text = chunk.toString();
  output += text;
  stream.write(text);
  const okCount = (output.match(/\bok\s+\d+\s+\[/g) ?? []).length;
  if (!settled && okCount >= 2) {
    settled = true;
    child.kill("SIGINT");
    setTimeout(() => process.exit(0), 250);
  }
}

child.stdout.on("data", (chunk) => write(chunk, process.stdout));
child.stderr.on("data", (chunk) => write(chunk, process.stderr));

child.on("exit", (code) => {
  if (settled) process.exit(0);
  process.exit(code ?? 1);
});

setTimeout(() => {
  if (!settled) {
    child.kill("SIGINT");
    console.error("E2E excedeu o tempo limite antes de concluir.");
    process.exit(1);
  }
}, 90_000);
