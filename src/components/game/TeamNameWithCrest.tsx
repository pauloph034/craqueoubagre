"use client";

import { TeamCrest } from "@/components/game/TeamCrest";
import { TeamEmblem } from "@/components/game/TeamEmblem";
import { getFootballTeamByName, TEAM_PLACEHOLDER_LOGO } from "@/data/football-clubs";
import { cn } from "@/lib/utils";

type TeamNameWithCrestProps = {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  textClassName?: string;
  showUnknown?: boolean;
  emblemId?: string;
  allowWrap?: boolean;
  showCrest?: boolean;
};

const emblemSizes = { sm: 26, md: 38, lg: 58, xl: 92 };

export function TeamNameWithCrest({ name, size = "sm", className, textClassName, showUnknown = false, emblemId, allowWrap = false, showCrest = true }: TeamNameWithCrestProps) {
  const team = getFootballTeamByName(name);
  const usesGenericEmblem = Boolean(emblemId || !team || team.logo === TEAM_PLACEHOLDER_LOGO);
  if (!showCrest) return <span className={cn(allowWrap ? "break-words leading-tight" : "truncate", textClassName)}>{name}</span>;
  if (!team && !showUnknown) return <span className={cn(allowWrap ? "break-words leading-tight" : "truncate", textClassName)}>{name}</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 align-middle", className)}>
      {usesGenericEmblem ? <TeamEmblem emblemId={emblemId} teamName={name} size={emblemSizes[size]} /> : <TeamCrest src={team?.logo} teamName={team?.name ?? name} size={size} />}
      <span className={cn("min-w-0", allowWrap ? "break-words leading-tight" : "truncate", textClassName)}>{name}</span>
    </span>
  );
}
