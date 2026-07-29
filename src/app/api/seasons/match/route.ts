import { getCurrentUser } from "@/server/session";
import { playRankedMatch } from "@/server/seasons";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na conta para jogar." }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as { idempotencyKey?: string };
  try {
    const result = await playRankedMatch(user, String(body.idempotencyKey ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nao foi possivel processar a partida.";
    const status = message.includes("processada") || message.includes("registrada") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
