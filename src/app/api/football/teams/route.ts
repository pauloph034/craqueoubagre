import { getFootballTeams, validateFootballTeamQuery } from "@/services/footballApi";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const validation = validateFootballTeamQuery(request.nextUrl.searchParams);
  if (!validation.ok) {
    return NextResponse.json({ success: false, error: validation.error }, { status: validation.status });
  }

  try {
    const result = await getFootballTeams(validation.query);
    return NextResponse.json({
      success: true,
      source: result.source,
      cache: result.cache,
      warning: result.warning,
      teams: result.teams
    });
  } catch {
    return NextResponse.json({ success: false, error: "Nao foi possivel carregar os clubes no momento." }, { status: 500 });
  }
}
