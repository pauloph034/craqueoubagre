"use client";

import { useGameStore } from "@/stores/game-store";
import { storage } from "@/lib/storage";
import { useEffect } from "react";

export function AppBoot() {
  const loadAccount = useGameStore((state) => state.loadAccount);
  const loadHistory = useGameStore((state) => state.loadHistory);

  useEffect(() => {
    void loadAccount();
    loadHistory();
    storage.clearLegacyAuth();
    window.fetch("/api/metrics/visit", { method: "POST" }).catch(() => undefined);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, [loadAccount, loadHistory]);
  return null;
}
