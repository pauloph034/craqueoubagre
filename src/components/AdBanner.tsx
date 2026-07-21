import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

const whatsappUrl = "https://wa.me/557999043448?text=Tenho%20interesse%20em%20anunciar%20no%20Craque%20ou%20Bagre";

type AdVariant = "leaderboard" | "sidebar" | "inline" | "mobile-banner" | "house-ad";

export function AdBanner({ compact = false, variant = compact ? "mobile-banner" : "leaderboard" }: { compact?: boolean; variant?: AdVariant }) {
  const isSidebar = variant === "sidebar";
  const isHouse = variant === "house-ad";
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "group block overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(10,33,66,.76),rgba(5,16,36,.9))] transition hover:border-electric/45",
        isSidebar ? "min-h-[220px]" : "min-h-[72px]",
        variant === "leaderboard" && "mx-auto max-w-5xl",
        variant === "mobile-banner" && "rounded-xl",
        isHouse && "border-gold/20"
      )}
      aria-label="Espaco publicitario do Craque ou Bagre"
    >
      <div className={cn("flex h-full gap-4", isSidebar ? "min-h-[220px] flex-col justify-between p-5" : "items-center justify-between px-5 py-4")}>
        <div className={cn("flex min-w-0 gap-3", isSidebar ? "items-start" : "items-center")}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-electric/25 bg-electric/10 text-electric">
            <Megaphone size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Publicidade</p>
            <p className="mt-1 truncate text-sm font-black text-sky-100">{isHouse ? "Anuncie no Craque ou Bagre" : "Espaco reservado para anunciante"}</p>
            {!compact && <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">Conecte sua marca a uma comunidade apaixonada por futebol, desafios e competicoes.</p>}
          </div>
        </div>
        {!compact && <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300 transition group-hover:text-white">Falar com a equipe</span>}
      </div>
    </a>
  );
}
