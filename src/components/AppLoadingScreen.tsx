"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function RouteLoadingVisual() {
  return (
    <div className="app-loading-screen" role="status" aria-label="Carregando página">
      <div className="route-balance-loader" aria-hidden="true" />
      <span className="sr-only">Carregando</span>
    </div>
  );
}

export function HomeIntroLoader() {
  return (
    <div className="app-loading-screen home-loading-screen" role="status" aria-label="Carregando Craque ou Bagre">
      <div className="home-goal-loader" aria-hidden="true" />
      <span className="sr-only">Carregando Craque ou Bagre</span>
    </div>
  );
}

export function RouteTransitionLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<number | null>(null);

  useEffect(() => {
    const hide = () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setVisible(false), 450);
    };

    hide();
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, [pathname]);

  useEffect(() => {
    const startTransition = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      if (nextUrl.origin !== window.location.origin || nextUrl.pathname === window.location.pathname) return;

      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      setVisible(true);
      hideTimer.current = window.setTimeout(() => setVisible(false), 1200);
    };

    document.addEventListener("click", startTransition, true);
    return () => document.removeEventListener("click", startTransition, true);
  }, []);

  return visible ? <RouteLoadingVisual /> : null;
}
