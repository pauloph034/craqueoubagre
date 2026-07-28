"use client";

import { cn } from "@/lib/utils";
import { Megaphone } from "lucide-react";
import { useState } from "react";

const whatsappUrl = "https://wa.me/557999043448?text=Tenho%20interesse%20em%20anunciar%20no%20Craque%20ou%20Bagre";

type AdVariant = "leaderboard" | "sidebar" | "inline" | "mobile-banner" | "house-ad";

const adsByVariant: Record<AdVariant, { src: string; alt: string }> = {
  leaderboard: {
    src: "/assets/ad-rocha-gera-resultado.png",
    alt: "Rocha Marketing - Marketing que gera resultado",
  },
  sidebar: {
    src: "/assets/ad-rocha-impulsione-marca.png",
    alt: "Rocha Marketing - Impulsione sua marca",
  },
  inline: {
    src: "/assets/ad-rocha-marketing-converte.png",
    alt: "Rocha Marketing - Marketing que converte",
  },
  "mobile-banner": {
    src: "/assets/ad-rocha-marca-destaque.png",
    alt: "Rocha Marketing - Sua marca em destaque",
  },
  "house-ad": {
    src: "/assets/ad-rocha-marketing-converte.png",
    alt: "Rocha Marketing - Marketing que converte",
  },
};

export function AdBanner({ compact = false, variant = compact ? "mobile-banner" : "leaderboard" }: { compact?: boolean; variant?: AdVariant }) {
  const isSidebar = variant === "sidebar";
  const ad = adsByVariant[variant];
  const [failed, setFailed] = useState(false);

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group block overflow-hidden rounded-xl border border-white/10 bg-[#ff4a24]/95 shadow-[0_10px_30px_rgba(0,0,0,.22)] transition hover:border-white/40",
        isSidebar ? "min-h-[120px]" : "min-h-[64px]",
        variant === "leaderboard" && "mx-auto max-w-4xl",
        variant === "mobile-banner" && "rounded-xl"
      )}
      aria-label="Publicidade Rocha Marketing"
    >
      <div
        className={cn(
          "relative grid w-full place-items-center bg-[#ff4a24] p-2",
          isSidebar ? "min-h-[120px]" : "min-h-[96px] sm:min-h-[112px]",
          variant === "mobile-banner" && "min-h-[88px] sm:min-h-[100px]"
        )}
      >
        {failed ? (
          <div className="flex w-full items-center justify-between gap-4 px-5 py-4 text-white">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 bg-white/10">
                <Megaphone size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/75">Publicidade</p>
                <p className="truncate text-sm font-black">Rocha Marketing</p>
              </div>
            </div>
            {!compact && <span className="shrink-0 rounded-full border border-white/40 px-3 py-1 text-xs font-black">Falar com a equipe</span>}
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ad.src}
            alt={ad.alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className={cn(
              "block h-auto w-full object-contain transition duration-300 group-hover:scale-[1.01]",
              isSidebar ? "max-w-[360px]" : compact ? "max-w-[360px]" : "max-w-[420px]"
            )}
          />
        )}
      </div>
    </a>
  );
}
