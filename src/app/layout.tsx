import type { Metadata, Viewport } from "next";
import { AppBoot } from "@/components/AppBoot";
import { AppFooter } from "@/components/AppFooter";
import { AppHeader } from "@/components/AppHeader";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Craque ou Bagre",
  description: "Monte um time histórico com jogadores de diferentes clubes e temporadas, dispute sete partidas e tente conquistar a campanha perfeita.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Craque ou Bagre",
    description: "Monte seu elenco histórico e tente a campanha perfeita.",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Craque ou Bagre",
    description: "Draft histórico de futebol europeu, independente e jogável offline."
  }
};

export const viewport: Viewport = {
  themeColor: "#f2ecdd"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>
        <AppBoot />
        <div className="min-h-screen stadium-texture">
          <AppHeader />
          {children}
          <AppFooter />
        </div>
      </body>
    </html>
  );
}
