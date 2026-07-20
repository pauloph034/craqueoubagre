"use client";

import { Button } from "@/components/ui/button";
import { useGameStore } from "@/stores/game-store";
import Link from "next/link";
import Image from "next/image";

const nav = [
  ["Jogar", "/jogar"],
  ["Salas", "/salas"],
  ["Galeria", "/historico"],
  ["Conquistas", "/conquistas"],
  ["Como jogar", "/como-jogar"]
] as const;

export function AppHeader() {
  const currentUser = useGameStore((state) => state.currentUser);
  const logout = useGameStore((state) => state.logout);

  return (
    <header className="app-shell-header sticky top-0 z-40 border-b border-white/10 bg-night/88 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image
            src="/assets/logo-craque-ou-bagre.png"
            alt="Craque ou Bagre"
            width={220}
            height={108}
            className="h-11 w-auto object-contain"
            priority
          />
        </Link>
        <div className="hidden items-center gap-2 md:flex">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
              {label}
            </Link>
          ))}
          {currentUser?.role === "admin" && (
            <Link href="/admin/dados" className="rounded px-3 py-2 text-sm font-bold text-gold hover:bg-white/10">
              Admin
            </Link>
          )}
        </div>
        {currentUser ? (
          <div className="flex items-center gap-2">
            <Link href="/conta" className="hidden rounded-full border border-white/15 px-3 py-2 text-sm font-bold text-slate-100 hover:bg-white/10 sm:inline-flex">
              {currentUser.playerName?.trim() || currentUser.username}
            </Link>
            <Button variant="secondary" className="min-h-9 px-3 py-2 text-xs" onClick={logout}>Sair</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/conta?modo=entrar" className="rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-slate-100 hover:bg-white/10">
              Entrar
            </Link>
            <Link href="/conta?modo=criar" className="rounded-full bg-electric px-4 py-2 text-sm font-black text-night hover:bg-sky-300">
              Criar conta
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
