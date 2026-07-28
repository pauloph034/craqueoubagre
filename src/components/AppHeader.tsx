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
  ["Conquistas", "/conquistas"],
  ["Ranking", "/ranking"]
] as const;

export function AppHeader() {
  const currentUser = useGameStore((state) => state.currentUser);
  const logout = useGameStore((state) => state.logout);
  const pathname = usePathname();

  return (
    <header className="app-shell-header sticky top-0 z-40 border-b border-white/[0.07] bg-[rgba(2,8,22,.94)] backdrop-blur-lg">
      <nav className="mx-auto flex min-h-14 max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 py-2 md:flex-nowrap md:px-6">
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/logo-craque-ou-bagre.png"
            alt="Craque ou Bagre"
            width={220}
            height={108}
            className="h-8 w-auto object-contain md:h-9"
            priority
          />
        </Link>
        <div className="order-3 flex w-full items-center gap-1 overflow-x-auto border-b border-white/8 md:order-none md:w-auto md:overflow-visible md:border-0">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className={cn("border-b-2 border-transparent px-3 py-2 text-sm font-bold text-slate-400 transition hover:text-white", pathname === href && "border-electric text-white")}>
              {label}
            </Link>
          ))}
          {currentUser?.role === "admin" && (
            <Link href="/admin/dados" className={cn("border-b-2 border-transparent px-3 py-2 text-sm font-bold text-gold transition", pathname?.startsWith("/admin") && "border-gold")}>
              Admin
            </Link>
          )}
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <Link href="/conta" className="hidden min-h-9 items-center rounded-md border border-white/10 bg-white/[0.035] px-3 text-sm font-bold text-slate-100 hover:bg-white/10 sm:inline-flex">
              {currentUser.playerName?.trim() || currentUser.username}
            </Link>
            <Button variant="secondary" className="min-h-10 px-3 py-2 text-xs" onClick={logout}>Sair</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/conta?modo=entrar" className="grid min-h-9 place-items-center rounded-md border border-white/12 bg-white/[0.04] px-4 text-sm font-bold text-slate-100 hover:bg-white/10">
              Entrar
            </Link>
            <Link href="/conta?modo=criar" className="hidden min-h-9 place-items-center rounded-md bg-electric px-4 text-sm font-black text-night hover:bg-sky-300 sm:grid">
              Criar conta
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
