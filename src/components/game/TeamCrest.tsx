"use client";

import { TEAM_PLACEHOLDER_LOGO } from "@/data/football-clubs";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type TeamCrestSize = "sm" | "md" | "lg" | "xl";

interface TeamCrestProps {
  src?: string | null;
  teamName: string;
  size?: TeamCrestSize;
  pixelSize?: number;
  className?: string;
  priority?: boolean;
}

const sizeMap: Record<TeamCrestSize, number> = {
  sm: 26,
  md: 38,
  lg: 58,
  xl: 92
};

export function TeamCrest({ src, teamName, size = "md", pixelSize, className, priority = false }: TeamCrestProps) {
  const pixels = pixelSize ?? sizeMap[size];
  const initialSrc = useMemo(() => src || TEAM_PLACEHOLDER_LOGO, [src]);
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const needsBadgeBoost = teamName.toLowerCase().includes("valencia") || currentSrc.toLowerCase().includes("valencia");

  useEffect(() => {
    setCurrentSrc(initialSrc);
  }, [initialSrc]);

  return (
    <span
      aria-label={`Escudo ${teamName}`}
      className={cn("grid shrink-0 place-items-center rounded-md bg-white/[0.04]", className)}
      style={{ width: pixels, height: pixels }}
    >
      <Image
        alt={`Escudo ${teamName}`}
        className={cn("object-contain", needsBadgeBoost ? "h-[112%] w-[112%]" : "h-[88%] w-[88%]")}
        height={pixels}
        loading={priority ? undefined : "lazy"}
        priority={priority}
        src={currentSrc}
        width={pixels}
        onError={() => {
          if (currentSrc !== TEAM_PLACEHOLDER_LOGO) setCurrentSrc(TEAM_PLACEHOLDER_LOGO);
        }}
      />
    </span>
  );
}
