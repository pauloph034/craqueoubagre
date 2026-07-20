"use client";

import { TeamCrest } from "@/components/game/TeamCrest";
import { getFootballTeamByClubId, getFootballTeamByName } from "@/data/football-clubs";
import type { ClubSeason } from "@/types/game";

type GenericBadgeClub = Pick<ClubSeason, "shortName" | "primaryColor" | "secondaryColor" | "genericBadgeShape" | "badgeUrl"> & Partial<Pick<ClubSeason, "clubId" | "clubName">>;

export function GenericBadge({ club, size = 58 }: { club: GenericBadgeClub; size?: number }) {
  const team = getFootballTeamByClubId(club.clubId) ?? getFootballTeamByName(club.clubName ?? club.shortName);
  const radius = club.genericBadgeShape === "round" ? "50%" : club.genericBadgeShape === "diamond" ? "10px" : club.genericBadgeShape === "crest" ? "18px 18px 24px 24px" : "14px";
  const fontSize = Math.max(11, Math.round(size * 0.24));
  if (team?.logo || club.badgeUrl) return <TeamCrest className="drop-shadow-[0_0_18px_rgba(255,255,255,.18)]" pixelSize={size} src={team?.logo ?? club.badgeUrl} teamName={team?.name ?? club.shortName} />;
  return (
    <div
      aria-label={`Escudo generico ${club.shortName}`}
      className="relative grid place-items-center overflow-hidden border border-white/35 font-black text-white shadow-glow"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        transform: club.genericBadgeShape === "diamond" ? "rotate(45deg)" : undefined,
        background: `linear-gradient(135deg, ${club.primaryColor} 0%, ${club.primaryColor} 44%, ${club.secondaryColor} 46%, ${club.secondaryColor} 100%)`
      }}
    >
      <div className="absolute inset-[5px] rounded-[inherit] border border-white/35" />
      <div className="absolute h-[140%] w-[34%] rotate-12 bg-white/12" />
      <span
        className="relative grid aspect-square place-items-center rounded-full border border-white/30 bg-black/28 px-1 text-center leading-none shadow-[0_0_18px_rgba(255,255,255,.18)]"
        style={{
          minWidth: size * 0.5,
          fontSize,
          transform: club.genericBadgeShape === "diamond" ? "rotate(-45deg)" : undefined
        }}
      >
        {club.shortName}
      </span>
    </div>
  );
}
