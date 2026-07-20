"use client";

import { TeamCrest } from "@/components/game/TeamCrest";
import { getFootballTeamByName } from "@/data/football-clubs";
import { cn } from "@/lib/utils";

type TeamNameWithCrestProps = {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  textClassName?: string;
  showUnknown?: boolean;
};

export function TeamNameWithCrest({ name, size = "sm", className, textClassName, showUnknown = false }: TeamNameWithCrestProps) {
  const team = getFootballTeamByName(name);
  if (!team && !showUnknown) return <span className={cn("truncate", textClassName)}>{name}</span>;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 align-middle", className)}>
      <TeamCrest src={team?.logo} teamName={team?.name ?? name} size={size} />
      <span className={cn("min-w-0 truncate", textClassName)}>{name}</span>
    </span>
  );
}
