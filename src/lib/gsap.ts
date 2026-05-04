"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;
function ensureRegistered() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/**
 * Run GSAP animations scoped to a container ref. Cleanup is automatic via
 * gsap.context. Respects `prefers-reduced-motion` — animations are skipped
 * for users who request reduced motion.
 */
export function useGsapContext<T extends HTMLElement>(
  setup: (self: gsap.Context) => void | (() => void),
  deps: ReadonlyArray<unknown> = [],
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  // useLayoutEffect on client only; useEffect on server safely.
  const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

  // eslint-disable-next-line react-hooks/refs
  useIsoLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    ensureRegistered();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(setup, element);
    return () => ctx.revert();
  }, deps);

  return ref;
}

export { gsap, ScrollTrigger };
