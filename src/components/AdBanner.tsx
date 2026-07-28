import { cn } from "@/lib/utils";
import Image from "next/image";

const whatsappUrl = "https://wa.me/557999043448?text=Tenho%20interesse%20em%20anunciar%20no%20Craque%20ou%20Bagre";

type AdVariant = "leaderboard" | "sidebar" | "inline" | "mobile-banner" | "house-ad";

const adsByVariant: Record<AdVariant, { src: string; alt: string }> = {
  leaderboard: {
    src: "/assets/ads/rocha-gera-resultado.png",
    alt: "Rocha Marketing - Marketing que gera resultado",
  },
  sidebar: {
    src: "/assets/ads/rocha-impulsione-marca.png",
    alt: "Rocha Marketing - Impulsione sua marca",
  },
  inline: {
    src: "/assets/ads/rocha-marketing-converte.png",
    alt: "Rocha Marketing - Marketing que converte",
  },
  "mobile-banner": {
    src: "/assets/ads/rocha-marca-destaque.png",
    alt: "Rocha Marketing - Sua marca em destaque",
  },
  "house-ad": {
    src: "/assets/ads/rocha-marketing-converte.png",
    alt: "Rocha Marketing - Marketing que converte",
  },
};

export function AdBanner({ compact = false, variant = compact ? "mobile-banner" : "leaderboard" }: { compact?: boolean; variant?: AdVariant }) {
  const isSidebar = variant === "sidebar";
  const ad = adsByVariant[variant];

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group block overflow-hidden rounded-2xl border border-white/10 bg-[#ff4a24]/95 shadow-[0_14px_44px_rgba(0,0,0,.24)] transition hover:border-white/40",
        isSidebar ? "min-h-[156px]" : "min-h-[72px]",
        variant === "leaderboard" && "mx-auto max-w-5xl",
        variant === "mobile-banner" && "rounded-xl"
      )}
      aria-label="Publicidade Rocha Marketing"
    >
      <div
        className={cn(
          "relative grid w-full place-items-center bg-[#ff4a24]",
          isSidebar ? "min-h-[156px] p-2" : "aspect-[3/1] max-h-[190px] min-h-[72px]",
          variant === "mobile-banner" && "max-h-[132px]"
        )}
      >
        <Image
          src={ad.src}
          alt={ad.alt}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 1024px"
          className="object-contain transition duration-300 group-hover:scale-[1.01]"
        />
      </div>
    </a>
  );
}
