import { Heart } from "lucide-react";
import Link from "next/link";

const footerLinks = [
  ["Times", "/times"],
  ["Como jogar", "/como-jogar"],
  ["Sobre", "/sobre"],
  ["FAQ", "/faq"]
] as const;

export function AppFooter() {
  return (
    <footer className="app-shell-footer mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="grid gap-5 border-t border-black/25 pt-5 sm:grid-cols-[auto_1fr] sm:items-center">
        <a
          href="https://tipa.ai/craqueoubagre"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-10 w-fit items-center gap-2 bg-[var(--accent)] px-4 text-[10px] font-black uppercase text-white transition hover:bg-black"
        >
          <Heart size={14} aria-hidden="true" />
          Apoie o jogo
        </a>

        <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-end" aria-label="Links institucionais">
          {footerLinks.map(([label, href]) => (
            <Link key={href} href={href} className="text-[10px] font-black uppercase text-[var(--muted)] underline-offset-4 hover:text-black hover:underline">
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-black/15 pt-3 text-[9px] text-[var(--muted)]">
        <span>Projeto independente, não afiliado a competições oficiais, clubes ou atletas.</span>
        <span className="font-bold uppercase tracking-[0.12em]">Desenvolvido por Agência Rocha</span>
      </div>
    </footer>
  );
}
