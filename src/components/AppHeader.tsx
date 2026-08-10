"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGameStore } from "@/stores/game-store";
import { Menu, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const primaryNav = [
  ["Início", "/"],
  ["Jogar", "/jogar"],
  ["Temporadas", "/temporadas"],
  ["Salas", "/salas"],
  ["Galeria", "/historico"],
  ["Conquistas", "/conquistas"],
  ["Ranking", "/ranking"]
] as const;

export function AppHeader() {
  const currentUser = useGameStore((state) => state.currentUser);
  const logout = useGameStore((state) => state.logout);
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <header className="app-shell-header sticky top-0 z-40 h-[58px] border-b border-black bg-[var(--background)]">
      <nav className="mx-auto flex h-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="brand-display flex shrink-0 items-baseline whitespace-nowrap text-[1.55rem] uppercase leading-none" aria-label="Craque ou Bagre - Início" onClick={() => setMenuOpen(false)}>
          <span>Craque&nbsp;</span>
          <span className="text-[var(--accent)]">ou Bagre?</span>
        </Link>

        <div className="hidden h-full items-center xl:flex">
          {primaryNav.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "grid h-full place-items-center border-x border-transparent px-3 text-[11px] font-black uppercase transition",
                isActive(href) ? "border-black bg-[var(--accent)] text-white" : "text-black hover:bg-black hover:text-white"
              )}
            >
              {label}
            </Link>
          ))}
          {currentUser?.role === "admin" && (
            <Link href="/admin/dados" className="grid h-full place-items-center px-4 text-xs font-black uppercase text-[var(--accent)] hover:bg-black hover:text-white">
              Admin
            </Link>
          )}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {currentUser ? (
            <>
              <Link href="/conta" className="border-b border-black px-2 py-1 text-xs font-black uppercase hover:text-[var(--accent)]">
                {currentUser.playerName?.trim() || currentUser.username}
              </Link>
              <SettingsLink />
              <Button variant="secondary" className="min-h-8 border-black px-3 py-1 text-[11px]" onClick={logout}>Sair</Button>
            </>
          ) : (
            <>
              <Link href="/conta?modo=entrar" className="px-3 py-2 text-xs font-black uppercase hover:text-[var(--accent)]">Entrar</Link>
              <SettingsLink />
              <Link href="/conta?modo=criar" className="bg-black px-3 py-2 text-xs font-black uppercase text-white hover:bg-[var(--accent)]">Criar conta</Link>
            </>
          )}
        </div>

        <button type="button" className="grid h-9 w-9 place-items-center border border-black xl:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={menuOpen}>
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {menuOpen && (
        <div className="absolute inset-x-0 top-full border-b border-black bg-[var(--background)] p-4 xl:hidden">
          <div className="grid grid-cols-2 border-l border-t border-black">
            {primaryNav.map(([label, href]) => (
              <Link key={href} href={href} className={cn("border-b border-r border-black px-3 py-3 text-xs font-black uppercase", isActive(href) && "bg-[var(--accent)] text-white")} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
            <Link href="/conta" className={cn("flex items-center gap-2 border-b border-r border-black px-3 py-3 text-xs font-black uppercase", isActive("/conta") && "bg-[var(--accent)] text-white")} onClick={() => setMenuOpen(false)}>
              <Settings size={14} /> Conta
            </Link>
            {currentUser?.role === "admin" && <Link href="/admin/dados" className="border-b border-r border-black px-3 py-3 text-xs font-black uppercase text-[var(--accent)]" onClick={() => setMenuOpen(false)}>Admin</Link>}
          </div>
          <div className="mt-3 flex items-center justify-end gap-3 sm:hidden">
            {currentUser ? (
              <>
                <Link href="/conta" className="text-xs font-black uppercase" onClick={() => setMenuOpen(false)}>{currentUser.playerName?.trim() || currentUser.username}</Link>
                <Button variant="secondary" className="min-h-9 border-black text-xs" onClick={() => { logout(); setMenuOpen(false); }}>Sair</Button>
              </>
            ) : (
              <>
                <Link href="/conta?modo=entrar" className="text-xs font-black uppercase" onClick={() => setMenuOpen(false)}>Entrar</Link>
                <Link href="/conta?modo=criar" className="bg-black px-3 py-2 text-xs font-black uppercase text-white" onClick={() => setMenuOpen(false)}>Criar conta</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function SettingsLink() {
  return (
    <Link
      href="/conta"
      className="grid h-8 w-8 place-items-center border border-black text-black transition hover:bg-black hover:text-white"
      aria-label="Conta e configurações"
      title="Conta e configurações"
    >
      <Settings size={15} aria-hidden="true" />
    </Link>
  );
}
