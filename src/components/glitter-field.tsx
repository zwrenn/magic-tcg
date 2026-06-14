"use client";

import { useEffect, useRef } from "react";

/**
 * Contained MySpace-style glitter: spawns twinkling particles within this
 * element's bounds (small sparks + the occasional bigger 4-point star) that
 * fade in and out on a calm cadence. Drop it as the first child of a
 * `relative overflow-hidden` container. Particles never leave that box.
 */
const COLORS = ["#ff3db4", "#ffd23f", "#9b6cff", "#5cc04a", "#36e0e0", "#ffffff"];
const STARS = ["✦", "✧", "✸", "❊"];

export function GlitterField({
  density = 1,
  className = "",
}: {
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let alive = true;
    let timer = 0;

    function tick() {
      if (!alive || !el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w && h) {
        const count = Math.max(1, Math.round(((w * h) / 4200) * density));
        for (let i = 0; i < count; i++) {
          const star = Math.random() < 0.16; // ~1 in 6 is a big star
          const p = document.createElement("span");
          p.className = star ? "glit-star" : "glit-dot";
          p.style.left = `${Math.random() * w}px`;
          p.style.top = `${Math.random() * h}px`;
          p.style.color = COLORS[(Math.random() * COLORS.length) | 0];
          const dur = 1.3 + Math.random() * 1.6; // slow twinkle
          p.style.animationDuration = `${dur}s`;
          if (star) {
            p.textContent = STARS[(Math.random() * STARS.length) | 0];
            p.style.fontSize = `${10 + Math.random() * 12}px`;
          } else {
            // mostly tiny specks, some small, a few chunky — like real glitter
            const r = Math.random();
            const s =
              r < 0.55 ? 1 + Math.random() : r < 0.85 ? 2 + Math.random() * 1.3 : 3.3 + Math.random() * 1.7;
            p.style.width = `${s}px`;
            p.style.height = `${s}px`;
          }
          el.appendChild(p);
          window.setTimeout(() => p.remove(), dur * 1000);
        }
      }
      timer = window.setTimeout(tick, 200); // lively spawn rate
    }

    timer = window.setTimeout(tick, 120);
    return () => {
      alive = false;
      clearTimeout(timer);
      el.replaceChildren();
    };
  }, [density]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute inset-0 z-[2] overflow-hidden ${className}`}
    />
  );
}
