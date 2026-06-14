"use client";

const COLORS = ["#ff5db5", "#ffd23f", "#5cc04a", "#36a7e0", "#9b6cff", "#ff9a3d"];

/**
 * Fire a quick confetti burst from a point (defaults to screen center).
 * Pure DOM + CSS — no dependency. Self-cleans after the animation.
 */
export function fireConfetti(originX?: number, originY?: number) {
  if (typeof document === "undefined") return;
  const x = originX ?? window.innerWidth / 2;
  const y = originY ?? window.innerHeight / 3;

  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  document.body.appendChild(layer);

  const N = 90;
  for (let i = 0; i < N; i++) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    const angle = (i / N) * Math.PI * 2 + (i % 5) * 0.21;
    const dist = 90 + (i % 7) * 34; // outward spread
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist + 240 + (i % 9) * 30; // + gravity-ish fall
    const size = 6 + (i % 4) * 3;
    const round = i % 3 === 0;
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    bit.style.width = `${size}px`;
    bit.style.height = `${round ? size : size * 1.6}px`;
    bit.style.background = COLORS[i % COLORS.length];
    bit.style.borderRadius = round ? "50%" : "2px";
    bit.style.setProperty("--dx", `${dx}px`);
    bit.style.setProperty("--dy", `${dy}px`);
    bit.style.setProperty("--cr", `${(i % 2 ? 1 : -1) * (360 + (i % 6) * 180)}deg`);
    bit.style.setProperty("--dur", `${1.8 + (i % 5) * 0.18}s`);
    layer.appendChild(bit);
  }

  setTimeout(() => layer.remove(), 2800);
}
