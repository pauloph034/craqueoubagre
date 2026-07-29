import { getCurrentUser } from "@/server/session";
import { rankedTransferOffer, updateRankedTransfer } from "@/server/seasons";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na conta para ajustar a temporada." }, { status: 401 });
  try {
    return NextResponse.json({ offer: await rankedTransferOffer(user) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel recuperar a troca." }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na conta para ajustar a temporada." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    return NextResponse.json(await updateRankedTransfer(user, body));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel concluir a troca." }, { status: 400 });
  }
}
