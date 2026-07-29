"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const MIN_ROUTE_LOADING_MS = 1000;

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
  const shownAt = useRef(0);

  useEffect(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);

    if (pathname === "/") {
      shownAt.current = 0;
      setVisible(false);
      return;
    }

    const elapsed = shownAt.current ? Date.now() - shownAt.current : MIN_ROUTE_LOADING_MS;
    const remaining = Math.max(0, MIN_ROUTE_LOADING_MS - elapsed);
    hideTimer.current = window.setTimeout(() => {
      shownAt.current = 0;
      setVisible(false);
    }, remaining);

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
      if (nextUrl.pathname === "/") return;

      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      shownAt.current = Date.now();
      setVisible(true);
      hideTimer.current = window.setTimeout(() => {
        shownAt.current = 0;
        setVisible(false);
      }, 3000);
    };

    document.addEventListener("click", startTransition, true);
    return () => document.removeEventListener("click", startTransition, true);
  }, []);

  return visible ? <RouteLoadingVisual /> : null;
}
