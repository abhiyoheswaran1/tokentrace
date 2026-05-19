"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/src/lib/utils";

function isPlainLeftClick(event: MouseEvent) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function internalDestination(anchor: HTMLAnchorElement) {
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  try {
    const destination = new URL(anchor.href);
    const current = new URL(window.location.href);
    if (destination.origin !== current.origin) return null;
    if (destination.pathname === current.pathname && destination.search === current.search) return null;
    return destination;
  } catch {
    return null;
  }
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname ?? ""}?${searchParams?.toString() ?? ""}`, [pathname, searchParams]);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!isPlainLeftClick(event) || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || !internalDestination(anchor)) return;
      setIsNavigating(true);
    }

    function handlePopState() {
      setIsNavigating(true);
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsNavigating(false), 220);
    return () => window.clearTimeout(timeout);
  }, [routeKey]);

  return (
    <div
      className={cn(
        "route-progress pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden transition-opacity duration-150",
        isNavigating ? "opacity-100" : "opacity-0"
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">Loading next TokenTrace view</span>
      <span className="block h-full w-1/2 animate-pulse rounded-r-full bg-primary shadow-[0_0_10px_rgba(15,118,110,0.45)]" />
    </div>
  );
}
