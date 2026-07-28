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
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => void registration.unregister());
        })
        .catch(() => undefined);
    }
    if ("caches" in window) {
      window.caches
        .keys()
        .then((keys) => {
          keys.forEach((key) => {
            if (key.startsWith("craque-ou-bagre")) void window.caches.delete(key);
          });
        })
        .catch(() => undefined);
    }
  }, [loadAccount, loadHistory]);
  return null;
}
