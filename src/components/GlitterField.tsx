'use client';

import { useEffect, useRef } from 'react';

const COLORS = [
  '#ff3db4',
  '#ffd23f',
  '#9b6cff',
  '#5cc04a',
  '#36e0e0',
  '#ffffff',
];
const GLYPHS = ['✦', '✧', '✸', '❊'];

// Plain data object per particle — no DOM nodes, no per-particle timers.
// All animation math happens in the render loop using `born` and `dur`.
interface Particle {
  x: number;
  y: number;
  color: string;
  born: number; // rAF timestamp when this particle was created
  dur: number; // how long (ms) before it disappears
  size: number;
  glyph?: string; // set only for star particles
}

// Drop this inside any `relative overflow-hidden` container.
// The canvas stretches to fill it and renders animated sparkle particles.
export function GlitterField({
  density = 1,
  className = '',
}: {
  density?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (
      !canvas ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let alive = true; // lets cleanup stop the rAF loop without a race condition
    let rafId = 0;
    let lastSpawn = 0;
    const particles: Particle[] = [];

    // canvas.width/height are the internal drawing resolution — separate from
    // the element's CSS size. We sync them so 1 canvas pixel = 1 CSS pixel.
    // Stale particles are cleared because their coordinates belong to the old size.
    function syncSize() {
      if (!canvas) return;
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);
      particles.length = 0;
    }

    // ResizeObserver fires whenever the canvas's layout size changes (window
    // resize, parent reflow, etc). Observing the canvas itself gives us its
    // actual rendered dimensions without any padding-box vs content-box ambiguity.
    const ro = new ResizeObserver(syncSize);
    ro.observe(canvas);
    // ResizeObserver fires asynchronously after layout, so seed the size now.
    syncSize();

    function spawn(now: number) {
      if (!canvas || !canvas.width || !canvas.height) return;
      // Scale particle count proportionally to the container area so density
      // feels consistent regardless of how big or small the element is.
      const count = Math.max(
        1,
        Math.round(((canvas.width * canvas.height) / 4200) * density)
      );
      for (let i = 0; i < count; i++) {
        const isStar = Math.random() < 0.16; // ~1 in 6 gets a glyph instead of a dot
        const r = Math.random();
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          color: COLORS[(Math.random() * COLORS.length) | 0],
          born: now,
          dur: (1.3 + Math.random() * 1.6) * 1000,
          // Dots are weighted toward tiny specks with a tail of chunkier ones.
          size: isStar
            ? 10 + Math.random() * 12
            : r < 0.55
              ? 1 + Math.random()
              : r < 0.85
                ? 2 + Math.random() * 1.3
                : 3.3 + Math.random() * 1.7,
          glyph: isStar
            ? GLYPHS[(Math.random() * GLYPHS.length) | 0]
            : undefined,
        });
      }
    }

    // rAF calls `frame` once per display refresh (~60fps). The `now` argument is
    // a high-resolution timestamp in ms — same clock as Date.now() but consistent
    // across frames. rAF also auto-pauses when the tab is hidden, saving CPU.
    function frame(now: number) {
      if (!alive || !canvas || !ctx) return;
      rafId = requestAnimationFrame(frame); // schedule next frame before drawing

      // Throttle spawning to every 200ms instead of every frame.
      if (now - lastSpawn >= 200) {
        spawn(now);
        lastSpawn = now;
      }

      // Wipe the previous frame completely before redrawing.
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Iterate backwards so splicing a dead particle doesn't skip the next index.
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        // t is normalized lifetime: 0 at birth, 1 at death.
        const t = (now - p.born) / p.dur;
        if (t >= 1) {
          particles.splice(i, 1);
          continue;
        }

        // Fade + scale in over the first 45%, hold full opacity until 70%,
        // then fade + scale back out. Mimics a CSS keyframe twinkle.
        const alpha = t < 0.45 ? t / 0.45 : t > 0.7 ? (1 - t) / 0.3 : 1;
        const scale = t < 0.45 ? t / 0.45 : 1 - (t - 0.45) * (0.7 / 0.55);

        ctx.fillStyle = p.color;

        if (p.glyph) {
          // ctx.save/restore sandboxes the transform so it doesn't bleed into
          // the next particle.
          ctx.save();
          ctx.translate(p.x, p.y); // move origin to particle position
          ctx.rotate(t * ((48 * Math.PI) / 180)); // slow clockwise spin over lifetime
          ctx.scale(scale, scale);
          ctx.font = `${p.size}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.globalAlpha = alpha;
          ctx.fillText(p.glyph, 0, 0); // draw at translated origin
          ctx.restore();
        } else {
          // Two-circle trick: a large semi-transparent ring fakes a soft glow
          // without ctx.shadowBlur, which requires an expensive full-frame blur pass.
          const radius = (p.size / 2) * scale;
          ctx.globalAlpha = alpha * 0.25;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 4, 0, Math.PI * 2);
          ctx.fill();
          // Solid bright core on top.
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Reset globalAlpha so anything drawn after this canvas isn't tinted.
      ctx.globalAlpha = 1;
    }

    rafId = requestAnimationFrame(frame);
    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`pointer-events-none absolute top-0 left-0 z-2 h-full w-full overflow-hidden ${className}`}
    />
  );
}
