"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function LazySettingsSection({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return undefined;
    const root = rootRef.current;
    const win = window as IdleWindow;
    let idleId: number | null = null;
    let observer: IntersectionObserver | null = null;

    const mount = () => setMounted(true);
    if (window.location.hash === `#${id}`) {
      mount();
      return undefined;
    }

    if (root && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) mount();
        },
        { rootMargin: "640px 0px" }
      );
      observer.observe(root);
    } else {
      mount();
    }

    idleId = win.requestIdleCallback
      ? win.requestIdleCallback(mount, { timeout: 2200 })
      : window.setTimeout(mount, 1200);

    return () => {
      observer?.disconnect();
      if (idleId == null) return;
      if (win.cancelIdleCallback) win.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
    };
  }, [id, mounted]);

  return (
    <div ref={rootRef} data-settings-lazy-section={id}>
      {mounted ? (
        children
      ) : (
        <Card id={id} className="scroll-mt-28 border-dashed">
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Loading settings section...</CardContent>
        </Card>
      )}
    </div>
  );
}
