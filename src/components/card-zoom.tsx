"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type ZoomCard = { name: string; image: string | null };

const ZoomContext = createContext<((card: ZoomCard) => void) | null>(null);

/**
 * App-wide single-card zoom. Any descendant can call useCardZoom()(card) to pop
 * the full card image. Replaces per-row hover popups with a click-to-zoom
 * overlay that works on desktop and mobile. (The collection page has its own
 * list-aware lightbox with prev/next.)
 */
export function CardZoomProvider({ children }: { children: React.ReactNode }) {
  const [card, setCard] = useState<ZoomCard | null>(null);
  const open = useCallback((c: ZoomCard) => setCard(c), []);
  const close = useCallback(() => setCard(null), []);

  useEffect(() => {
    if (!card) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [card, close]);

  return (
    <ZoomContext.Provider value={open}>
      {children}
      {card && (
        <div
          onClick={close}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
        >
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            {card.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.image}
                alt={card.name}
                className="max-h-[82vh] w-auto rounded-2xl border border-border shadow-2xl"
              />
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center">
                {card.name}
                <div className="mt-1 text-xs text-muted">No image available</div>
              </div>
            )}
            <div className="flex items-center gap-2">
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
          </div>
        </div>
      )}
    </ZoomContext.Provider>
  );
}

export function useCardZoom() {
  const open = useContext(ZoomContext);
  return open ?? (() => {});
}

/**
 * A clickable trigger that zooms a card. Wrap a thumbnail, a card name, or
 * anything else — clicking it shows the full card.
 */
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
  const open = useCardZoom();
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
