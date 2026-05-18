"use client";

import { useEffect, useRef, useState } from "react";

type ChartSize = {
  width: number;
  height: number;
};

export function useChartSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let frame = 0;
    const measure = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width > 0 && height > 0) {
        setSize((current) =>
          current.width === width && current.height === height ? current : { width, height }
        );
      }
    };

    frame = window.requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return { ref, size };
}
