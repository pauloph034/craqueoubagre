"use client";

import { emblemForTeamName, getTeamEmblem } from "@/data/team-emblems";
import { cn } from "@/lib/utils";

function emblemBackground(pattern: ReturnType<typeof getTeamEmblem>["pattern"], primary: string, secondary: string) {
  if (pattern === "stripes") return `repeating-linear-gradient(90deg, ${primary} 0 18%, ${secondary} 18% 36%)`;
  if (pattern === "halves") return `linear-gradient(90deg, ${primary} 0 50%, ${secondary} 50% 100%)`;
  if (pattern === "sash") return `linear-gradient(135deg, ${primary} 0 38%, ${secondary} 39% 61%, ${primary} 62% 100%)`;
  if (pattern === "quarters") return `conic-gradient(${primary} 0 25%, ${secondary} 0 50%, ${primary} 0 75%, ${secondary} 0)`;
  return `linear-gradient(160deg, ${primary} 0 37%, ${secondary} 38% 62%, ${primary} 63% 100%)`;
}

function teamMonogram(teamName: string) {
  const letters = teamName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 3)
    .toUpperCase();

  return letters || "FC";
}

export function TeamEmblem({ emblemId, teamName, size = 38, className }: { emblemId?: string; teamName: string; size?: number; className?: string }) {
  const emblem = emblemId ? getTeamEmblem(emblemId) : emblemForTeamName(teamName);
  const monogram = teamMonogram(teamName);
  const clipPath =
    emblem.shape === "round"
      ? "circle(49% at 50% 50%)"
      : emblem.shape === "diamond"
        ? "polygon(50% 0, 94% 14%, 88% 72%, 50% 100%, 12% 72%, 6% 14%)"
        : "polygon(8% 0, 92% 0, 100% 18%, 88% 76%, 50% 100%, 12% 76%, 0 18%)";
  const centerSize = Math.round(size * 0.52);
  return (
    <span
      aria-label={`Escudo ${teamName}`}
      className={cn("relative grid shrink-0 place-items-center overflow-hidden drop-shadow-[0_4px_5px_rgba(0,0,0,.38)]", className)}
      style={{
        width: size,
        height: size,
        clipPath,
        background: emblem.accent,
        padding: Math.max(1, Math.round(size * 0.045))
      }}
    >
      <span
        className="absolute grid place-items-center overflow-hidden"
        style={{
          inset: Math.max(2, Math.round(size * 0.07)),
          clipPath,
          background: emblemBackground(emblem.pattern, emblem.primary, emblem.secondary)
        }}
      >
        <span className="absolute inset-[8%] border border-white/30" style={{ clipPath }} />
        <span
          className="relative z-10 grid place-items-center rounded-full border font-black leading-none shadow-[0_2px_7px_rgba(0,0,0,.35)]"
          style={{
            width: centerSize,
            height: centerSize,
            borderColor: emblem.accent,
            background: "rgba(2,8,23,.88)",
            color: emblem.accent,
            fontSize: Math.max(7, Math.round(size * 0.18)),
            letterSpacing: "-0.06em"
          }}
        >
          {monogram}
        </span>
        <span
          className="absolute left-1/2 top-[5%] z-20 -translate-x-1/2 leading-none"
          style={{ color: emblem.accent, fontSize: Math.max(5, Math.round(size * 0.13)) }}
        >
          ★
        </span>
        <span
          className="absolute bottom-[8%] left-1/2 z-20 -translate-x-1/2 font-black uppercase leading-none"
          style={{ color: emblem.accent, fontSize: Math.max(4, Math.round(size * 0.1)), letterSpacing: "0.08em" }}
        >
          FC
        </span>
      </span>
    </span>
  );
}
