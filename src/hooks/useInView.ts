import { useEffect, useRef, useState } from "react";

export function useInView<T extends HTMLElement>(options: IntersectionObserverInit = { threshold: 0.15 }) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      });
    }, options);
    obs.observe(el);
    return () => obs.disconnect();
  }, [options.threshold, options.root, options.rootMargin]);

  return { ref, inView };
}
