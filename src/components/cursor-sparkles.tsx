"use client";

import { useEffect } from "react";

/**
 * Early-2000s cursor sparkle trail. Spawns little twinkling stars that drift
 * and fade behind the pointer. Disabled on touch devices and when the user
 * prefers reduced motion. Throttled + auto-cleaned for performance.
 */
export function CursorSparkles() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const colors = ["#ff79b0", "#9b6cff", "#36a7e0", "#ffce3a", "#5cc04a", "#ffffff"];
    const glyphs = ["✦", "✧", "✫", "·", "❋"];
    let last = 0;

    function spawn(x: number, y: number) {
      const s = document.createElement("span");
      s.className = "pod-sparkle";
      s.textContent = glyphs[(Math.random() * glyphs.length) | 0];
      s.style.left = `${x}px`;
      s.style.top = `${y}px`;
      s.style.color = colors[(Math.random() * colors.length) | 0];
      s.style.setProperty("--dx", `${(Math.random() - 0.5) * 36}px`);
      s.style.setProperty("--rot", `${(Math.random() - 0.5) * 180}deg`);
      s.style.fontSize = `${8 + Math.random() * 12}px`;
      document.body.appendChild(s);
      window.setTimeout(() => s.remove(), 850);
    }

    function onMove(e: MouseEvent) {
      const now = performance.now();
      if (now - last < 35) return;
      last = now;
      spawn(e.clientX, e.clientY);
    }

    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return null;
}
