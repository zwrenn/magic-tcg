"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { QuickAddButton } from "./quick-add-button";
import { RemoveCardButton } from "./remove-card-button";

type ZoomCard = { name: string; image: string | null };

type ZoomState = { list: ZoomCard[]; index: number };

type ZoomApi = {
  /** Zoom a single card (no prev/next). */
  open: (card: ZoomCard) => void;
  /** Zoom within an ordered list, starting at index — enables ←/→ navigation. */
  openList: (list: ZoomCard[], index: number) => void;
};

const ZoomContext = createContext<ZoomApi | null>(null);

/**
 * App-wide card zoom. Single-card or list-aware (with ←/→ + on-screen arrows).
 * Replaces per-row hover popups; works on desktop and mobile.
 */
export function CardZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const open = useCallback((card: ZoomCard) => setZoom({ list: [card], index: 0 }), []);
  const openList = useCallback(
    (list: ZoomCard[], index: number) => setZoom(list.length ? { list, index } : null),
    [],
  );
  const close = useCallback(() => setZoom(null), []);
  const step = useCallback(
    (delta: number) =>
      setZoom((z) =>
        z ? { ...z, index: Math.min(z.list.length - 1, Math.max(0, z.index + delta)) } : z,
      ),
    [],
  );

  useEffect(() => {
    if (!zoom) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom, close, step]);

  const card = zoom ? zoom.list[zoom.index] : null;
  const many = (zoom?.list.length ?? 0) > 1;

  return (
    <ZoomContext.Provider value={{ open, openList }}>
      {children}
      {zoom && card && (
        <div
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          {many && zoom.index > 0 && (
            <Arrow side="left" onClick={(e) => { e.stopPropagation(); step(-1); }} />
          )}
          {many && zoom.index < zoom.list.length - 1 && (
            <Arrow side="right" onClick={(e) => { e.stopPropagation(); step(1); }} />
          )}
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {card.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.image}
                alt={card.name}
                className="max-h-[80vh] w-auto rounded-2xl border border-border shadow-2xl"
              />
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                {card.name}
                <div className="mt-1 text-xs text-muted">No image available</div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <QuickAddButton name={card.name} label="+ Add to collection" className="px-4 py-1.5 text-sm" />
              <RemoveCardButton name={card.name} />
              <a
                href={`https://scryfall.com/search?q=${encodeURIComponent(`!"${card.name}"`)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm hover:bg-surface-2"
              >
                View on Scryfall ↗
              </a>
              <button
                onClick={close}
                className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm hover:bg-surface-2"
              >
                Close
              </button>
            </div>
            {many && (
              <div className="text-xs text-muted/70">
                {zoom.index + 1} / {zoom.list.length} · ← → to browse · Esc to close
              </div>
            )}
          </div>
        </div>
      )}
    </ZoomContext.Provider>
  );
}

export function useCardZoom(): ZoomApi {
  return useContext(ZoomContext) ?? { open: () => {}, openList: () => {} };
}

/** Clickable trigger that zooms a single card. */
export function CardZoomButton({
  name,
  image,
  children,
  className = "",
  title,
}: {
  name: string;
  image: string | null;
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  const { open } = useCardZoom();
  return (
    <button
      type="button"
      title={title ?? name}
      onClick={() => open({ name, image })}
      className={className}
    >
      {children}
    </button>
  );
}

function Arrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={side === "left" ? "Previous card" : "Next card"}
      className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface/90 px-3 py-2 text-lg text-foreground hover:bg-surface-2 ${
        side === "left" ? "left-3 sm:left-6" : "right-3 sm:right-6"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
