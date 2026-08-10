"use client";

import { useEffect } from "react";

const outcomeSources = ["/audio/som-campeao.mp3", "/audio/som-eliminado.mp3"] as const;
const audioCache = new Map<string, HTMLAudioElement>();

function getAudio(source: string) {
  const cached = audioCache.get(source);
  if (cached) return cached;
  const audio = new Audio(source);
  audio.preload = "auto";
  audioCache.set(source, audio);
  return audio;
}

export function OutcomeSoundPrimer() {
  useEffect(() => {
    let primed = false;
    const prime = () => {
      if (primed) return;
      primed = true;
      window.removeEventListener("pointerdown", prime, true);
      window.removeEventListener("keydown", prime, true);

      outcomeSources.forEach((source) => {
        const audio = getAudio(source);
        audio.volume = 0.001;
        audio.currentTime = 0;
        void audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 0.85;
        }).catch(() => {
          audio.volume = 0.85;
        });
      });
    };

    window.addEventListener("pointerdown", prime, true);
    window.addEventListener("keydown", prime, true);
    return () => {
      window.removeEventListener("pointerdown", prime, true);
      window.removeEventListener("keydown", prime, true);
    };
  }, []);

  return null;
}

function OneShotSound({ eventId, source, kind }: { eventId: string; source: string; kind: "champion" | "eliminated" }) {
  useEffect(() => {
    if (!eventId) return;

    const storageKey = `craque-ou-bagre:v2:${kind}-sound:${eventId}`;
    if (window.sessionStorage.getItem(storageKey) === "played") return;

    const audio = getAudio(source);
    audio.volume = 0.85;
    audio.currentTime = 0;
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
