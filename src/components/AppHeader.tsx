"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  ["Jogar", "/jogar"],
  ["Salas", "/salas"],
  ["Galeria", "/historico"],
  ["Conquistas", "/conquistas"]
] as const;

export function AppHeader() {
  const currentUser = useGameStore((state) => state.currentUser);
  const logout = useGameStore((state) => state.logout);
  const pathname = usePathname();

  return (
    <header className="app-shell-header sticky top-0 z-40 border-b border-white/10 bg-[rgba(3,8,23,.88)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-[1480px] items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/logo-craque-ou-bagre.png"
            alt="Craque ou Bagre"
            width={220}
            height={108}
            className="h-9 w-auto object-contain md:h-10"
            priority
          />
        </Link>
        <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 md:flex">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className={cn("rounded-full px-3 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white", pathname === href && "bg-electric/15 text-electric")}>
              {label}
            </Link>
          ))}
          {currentUser?.role === "admin" && (
            <Link href="/admin/dados" className={cn("rounded-full px-3 py-2 text-sm font-bold text-gold transition hover:bg-white/10", pathname?.startsWith("/admin") && "bg-gold/15")}>
              Admin
            </Link>
          )}
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <Link href="/conta" className="hidden min-h-10 items-center rounded-full border border-white/12 bg-white/[0.04] px-3 text-sm font-bold text-slate-100 hover:bg-white/10 sm:inline-flex">
              {currentUser.playerName?.trim() || currentUser.username}
            </Link>
            <Button variant="secondary" className="min-h-10 px-3 py-2 text-xs" onClick={logout}>Sair</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/conta?modo=entrar" className="grid min-h-10 place-items-center rounded-full border border-white/12 bg-white/[0.04] px-4 text-sm font-bold text-slate-100 hover:bg-white/10">
              Entrar
            </Link>
            <Link href="/conta?modo=criar" className="hidden min-h-10 place-items-center rounded-full bg-electric px-4 text-sm font-black text-night hover:bg-sky-300 sm:grid">
              Criar conta
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
