import { getCurrentUser } from "@/server/session";
import { seasonDashboard } from "@/server/seasons";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na conta para jogar Temporadas." }, { status: 401 });
  try {
    return NextResponse.json(await seasonDashboard(user));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel carregar a temporada." }, { status: 500 });
  }
}
