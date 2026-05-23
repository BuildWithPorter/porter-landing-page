import { useEffect, useRef, useState } from "react";

export function useScrollScrub<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setProgress(1);
      return;
    }
    let raf = 0;
    const onScroll = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const start = vh * 0.85;
      const end = vh * 0.25;
      const p = (start - rect.top) / (start - end);
      const clamped = Math.max(0, Math.min(1, p));
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setProgress(clamped));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return { ref, progress };
}
