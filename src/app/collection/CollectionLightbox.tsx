'use client';

import { useEffect } from 'react';
import type { CollectionRow } from '@/lib/search';
import type { DeckUsage } from './useCollectionFilters';
import { FavoriteStar } from '@/components/favorite-star';

interface CollectionLightboxProps {
  visible: CollectionRow[];
  zoom: number | null;
  favs: Set<string>;
  deckUsage: DeckUsage;
  onClose: () => void;
  onStep: (delta: number) => void;
  onFavChange: (normalized: string, favorited: boolean) => void;
  onChangeQty: (itemId: number, quantity: number) => void;
}

interface ArrowButtonProps {
  side: 'left' | 'right';
  onClick: (e: React.MouseEvent) => void;
}

function ArrowButton({ side, onClick }: ArrowButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous card' : 'Next card'}
      className={`absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-border bg-surface/90 px-3 py-2 text-lg text-foreground hover:bg-surface-2 ${side === 'left' ? 'left-3 sm:left-6' : 'right-3 sm:right-6'}`}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );
}

export function CollectionLightbox({
  visible,
  zoom,
  favs,
  deckUsage,
  onClose,
  onStep,
  onFavChange,
  onChangeQty,
}: CollectionLightboxProps) {
  useEffect(() => {
    if (zoom === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') onStep(1);
      else if (e.key === 'ArrowLeft') onStep(-1);
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [zoom, onClose, onStep]);

  if (zoom === null) return null;
  const card = visible[zoom];
  if (!card) return null;

  const decks = deckUsage[card.normalizedName] ?? [];

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
    >
      {zoom > 0 && (
        <ArrowButton
          side="left"
          onClick={(e) => {
            e.stopPropagation();
            onStep(-1);
          }}
        />
      )}
      {zoom < visible.length - 1 && (
        <ArrowButton
          side="right"
          onClick={(e) => {
            e.stopPropagation();
            onStep(1);
          }}
        />
      )}
      <div
        className="flex flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {card.image ? (
          <div
            className={`relative overflow-hidden rounded-2xl shadow-2xl ${card.foil ? 'foil-frame' : ''}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image}
              alt={card.name}
              className="block max-h-[80vh] w-auto rounded-2xl border border-border"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center">
            {card.name}
          </div>
        )}
        <div className="flex items-center gap-2 text-center text-sm text-muted">
          <FavoriteStar
            name={card.name}
            initial={favs.has(card.normalizedName)}
            onChange={(f) => onFavChange(card.normalizedName, f)}
            className="text-lg"
          />
          <span>
            {card.name}
            {card.foil ? ' (foil)' : ''}
            {card.condition ? ` · ${card.condition}` : ''}
          </span>
        </div>
        {decks.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-muted">🃏 In decks:</span>
            {decks.map((d) => (
              <a
                key={d.id}
                href={`/decks/${d.id}`}
                className="rounded-full bg-[var(--purple)]/15 px-2 py-0.5 font-semibold text-[var(--purple-deep)] hover:underline"
              >
                {d.name}
              </a>
            ))}
          </div>
        )}
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onChangeQty(card.id, card.quantity - 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-lg hover:border-accent/60"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-10 text-center font-mono text-lg font-semibold tabular-nums">
            {card.quantity}
          </span>
          <button
            onClick={() => onChangeQty(card.id, card.quantity + 1)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-lg hover:border-accent/60"
            aria-label="Increase quantity"
          >
            +
          </button>
          <button
            onClick={() => onChangeQty(card.id, 0)}
            className="ml-2 rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:border-bad/60 hover:text-bad"
          >
            Remove
          </button>
        </div>
        <a
          href={`https://scryfall.com/search?q=${encodeURIComponent(`!"${card.name}"`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg border border-border bg-surface px-4 py-1.5 text-sm hover:bg-surface-2"
        >
          View on Scryfall ↗
        </a>
        <div className="text-xs text-muted/70">
          {zoom + 1} / {visible.length} · ← → to browse · Esc to close
        </div>
      </div>
    </div>
  );
}
