import { getCurrentUser } from "@/server/session";
import { seasonParticipants } from "@/server/seasons";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Entre na conta para ver o ranking." }, { status: 401 });
  const scope = new URL(request.url).searchParams.get("scope") === "national" ? "national" : "global";
  try {
    return NextResponse.json({ participants: await seasonParticipants(user, scope), scope, country: user.country });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nao foi possivel carregar o ranking." }, { status: 500 });
  }
}
