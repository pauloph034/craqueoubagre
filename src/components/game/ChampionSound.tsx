"use client";

import { useEffect } from "react";

function OneShotSound({ eventId, source, kind }: { eventId: string; source: string; kind: "champion" | "eliminated" }) {
  useEffect(() => {
    if (!eventId) return;

    const storageKey = `craque-ou-bagre:${kind}-sound:${eventId}`;
    if (window.sessionStorage.getItem(storageKey) === "played") return;

    const audio = new Audio(source);
    audio.preload = "auto";
    audio.volume = 0.85;
    let disposed = false;

    const removeFallbackListeners = () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
    };

    const play = () => {
      if (disposed || window.sessionStorage.getItem(storageKey) === "played") return;
      void audio.play().then(() => {
        if (disposed) return;
        window.sessionStorage.setItem(storageKey, "played");
        removeFallbackListeners();
      }).catch(() => {
        // Browsers can require a fresh interaction before allowing audio.
      });
    };

    window.addEventListener("pointerdown", play);
    window.addEventListener("keydown", play);
    const timer = window.setTimeout(play, 120);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
      removeFallbackListeners();
      audio.pause();
      audio.currentTime = 0;
    };
  }, [eventId, kind, source]);

  return null;
}

export function ChampionSound({ eventId }: { eventId: string }) {
  return <OneShotSound eventId={eventId} source="/audio/som-campeao.mp3" kind="champion" />;
}

export function EliminatedSound({ eventId }: { eventId: string }) {
  return <OneShotSound eventId={eventId} source="/audio/som-eliminado.mp3" kind="eliminated" />;
}
