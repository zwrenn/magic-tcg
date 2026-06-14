"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { QuickAddButton } from "./quick-add-button";
import { RemoveCardButton } from "./remove-card-button";

type ZoomCard = {
  name: string;
  image: string | null;
  key?: string;
  /** Viewer owns ≥1 copy — enables "Remove from collection" even in read-only zooms. */
  viewerOwns?: boolean;
};
/** Lets a list owner expose a per-card "mark as proxy" toggle inside the zoom. */
type ProxyController = {
  /** Keys currently flagged proxy, to seed the toggle's initial state. */
  initial: string[];
  /** Persist + propagate a toggle for the given card key. */
  onToggle: (key: string, willBe: boolean) => void;
};
type ZoomOpts = { allowEdit?: boolean; proxy?: ProxyController };

type ZoomState = {
  list: ZoomCard[];
  index: number;
  allowEdit: boolean;
  proxy: ProxyController | null;
  proxySet: Set<string>;
};

type ZoomApi = {
  /** Zoom a single card (no prev/next). */
  open: (card: ZoomCard, opts?: ZoomOpts) => void;
  /** Zoom within an ordered list, starting at index — enables ←/→ navigation. */
  openList: (list: ZoomCard[], index: number, opts?: ZoomOpts) => void;
};

const ZoomContext = createContext<ZoomApi | null>(null);

/**
 * App-wide card zoom. Single-card or list-aware (with ←/→ + on-screen arrows).
 * Replaces per-row hover popups; works on desktop and mobile.
 */
export function CardZoomProvider({ children }: { children: React.ReactNode }) {
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const open = useCallback(
    (card: ZoomCard, opts?: ZoomOpts) =>
      setZoom({
        list: [card],
        index: 0,
        allowEdit: opts?.allowEdit ?? true,
        proxy: opts?.proxy ?? null,
        proxySet: new Set(opts?.proxy?.initial ?? []),
      }),
    [],
  );
  const openList = useCallback(
    (list: ZoomCard[], index: number, opts?: ZoomOpts) =>
      setZoom(
        list.length
          ? {
              list,
              index,
              allowEdit: opts?.allowEdit ?? true,
              proxy: opts?.proxy ?? null,
              proxySet: new Set(opts?.proxy?.initial ?? []),
            }
          : null,
      ),
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
              {zoom.allowEdit && (
                <>
                  <QuickAddButton name={card.name} label="+ Add to my collection" className="px-4 py-1.5 text-sm" />
                  <RemoveCardButton name={card.name} />
                </>
              )}
              {!zoom.allowEdit && (
                <>
                  <QuickAddButton name={card.name} label="✓ I have this" className="px-4 py-1.5 text-sm" />
                  {card.viewerOwns && <RemoveCardButton name={card.name} />}
                </>
              )}
              {zoom.proxy && card.key && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const key = card.key!;
                    const willBe = !zoom.proxySet.has(key);
                    const next = new Set(zoom.proxySet);
                    if (willBe) next.add(key);
                    else next.delete(key);
                    setZoom({ ...zoom, proxySet: next });
                    zoom.proxy!.onToggle(key, willBe);
                  }}
                  className={`rounded-lg border px-4 py-1.5 text-sm transition ${
                    zoom.proxySet.has(card.key)
                      ? "border-[var(--purple)] bg-[var(--purple)]/15 text-[var(--purple-deep)]"
                      : "border-border bg-surface hover:bg-surface-2"
                  }`}
                >
                  {zoom.proxySet.has(card.key) ? "🔁 Proxy ✓" : "🔁 Mark as proxy"}
                </button>
              )}
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
  allowEdit = true,
}: {
  name: string;
  image: string | null;
  children: React.ReactNode;
  className?: string;
  title?: string;
  allowEdit?: boolean;
}) {
  const { open } = useCardZoom();
  return (
    <button
      type="button"
      title={title ?? name}
      onClick={() => open({ name, image }, { allowEdit })}
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
