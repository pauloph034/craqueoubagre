import { Megaphone } from "lucide-react";

const whatsappUrl = "https://wa.me/557999043448?text=Tenho%20interesse%20em%20anunciar%20no%20Craque%20ou%20Bagre";

export function AdBanner({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      className="group block overflow-hidden rounded-lg border border-electric/25 bg-[linear-gradient(135deg,rgba(14,116,255,.22),rgba(7,24,50,.72))] shadow-[0_0_24px_rgba(40,184,255,.08)] transition hover:border-electric/55 hover:bg-electric/15"
      aria-label="Anuncie aqui pelo WhatsApp"
    >
      <div className={compact ? "flex items-center justify-center gap-2 px-4 py-3" : "flex items-center justify-between gap-4 px-5 py-4"}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-electric/35 bg-electric/15 text-electric">
            <Megaphone size={17} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black uppercase tracking-[0.18em] text-sky-100">Anuncie Aqui</p>
            {!compact && <p className="mt-1 text-xs text-slate-400">Espaco publicitario discreto</p>}
          </div>
        </div>
        {!compact && <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-slate-300 transition group-hover:text-white sm:inline">WhatsApp</span>}
      </div>
    </a>
  );
}
