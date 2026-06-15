"use client";

import { useState } from "react";

export const THEMES = [
  { id: "candy", label: "Candy", swatch: ["#5cc04a", "#36a7e0", "#ff79b0"] },
  { id: "faerie", label: "Faerie", swatch: ["#a85cff", "#ff79c6", "#7a3fe0"] },
  { id: "spooky", label: "Spooky", swatch: ["#ff7a1a", "#9b6cff", "#1c1330"] },
  { id: "winter", label: "Winter", swatch: ["#36a7e0", "#6c8cff", "#bfe3ff"] },
] as const;

/** Repaint the whole site by setting <html data-theme> + a year-long cookie. */
export function ThemeSwitcher({ initial }: { initial: string }) {
  const [theme, setTheme] = useState(initial);

  function pick(id: string) {
    setTheme(id);
    document.documentElement.dataset.theme = id;
    document.cookie = `pod_theme=${id}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <span className="t-label">✦ Skin</span>
      {THEMES.map((t) => {
        const active = theme === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => pick(t.id)}
            aria-pressed={active}
            title={`${t.label} theme`}
            className={`flex items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-semibold transition hover:-translate-y-0.5 ${
              active
                ? "border-[var(--purple)] bg-[var(--surface-2)] text-[var(--purple-deep)]"
                : "border-[var(--border)] bg-[var(--surface)] text-muted"
            }`}
          >
            <span className="flex overflow-hidden rounded-full border border-white">
              {t.swatch.map((c) => (
                <span key={c} className="h-3 w-2" style={{ background: c }} />
              ))}
            </span>
            {t.label}
            {active && " ✓"}
          </button>
        );
      })}
    </div>
  );
}
