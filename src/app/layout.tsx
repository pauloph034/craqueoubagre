import type { Metadata, Viewport } from "next";
import { AppBoot } from "@/components/AppBoot";
import { AppHeader } from "@/components/AppHeader";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Craque ou Bagre",
  description: "Monte um time historico com jogadores de diferentes clubes e temporadas, dispute sete partidas e tente conquistar a campanha perfeita.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Craque ou Bagre",
    description: "Monte seu elenco historico e tente a campanha perfeita.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Craque ou Bagre",
    description: "Draft historico de futebol europeu, independente e jogavel offline."
  }
};

export const viewport: Viewport = {
  themeColor: "#050816"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AppBoot />
        <div className="min-h-screen stadium-texture">
          <AppHeader />
          {children}
          <footer className="app-shell-footer mx-auto max-w-7xl px-4 py-10 text-sm text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-5">
              <span>Projeto independente, nao afiliado a UEFA, competicoes, clubes ou atletas.</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Desenvolvido por Agência Rocha</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
