'use client';

import type { CollectionRow } from '@/lib/search';
import type { DeckUsage } from './useCollectionFilters';
import { FavoriteStar } from '@/components/favorite-star';
import { ManaCost, ColorDots } from '@/components/mana';
import { SetSymbol } from '@/components/set-symbol';

interface CollectionListProps {
  items: CollectionRow[];
  favs: Set<string>;
  deckUsage: DeckUsage;
  onFavChange: (normalized: string, favorited: boolean) => void;
  onZoom: (index: number) => void;
}

export function CollectionList({
  items,
  favs,
  deckUsage,
  onFavChange,
  onZoom,
}: CollectionListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((r, i) => {
        const decks = deckUsage[r.normalizedName] ?? [];
        return (
          <li
            key={`${r.name}-${r.foil}-${i}`}
            className="flex items-center gap-3 px-3 py-2"
          >
            <FavoriteStar
              name={r.name}
              initial={favs.has(r.normalizedName)}
              onChange={(f) => onFavChange(r.normalizedName, f)}
              className="text-lg"
            />
            <button
              onClick={() => onZoom(i)}
              className="shrink-0"
              aria-label={`Zoom ${r.name}`}
            >
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt={r.name}
                  loading="lazy"
                  className="h-12 w-9 rounded-[3px] border border-border object-cover"
                />
              ) : (
                <span className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">
                  no img
                </span>
              )}
            </button>
            <button
              onClick={() => onZoom(i)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="flex items-center gap-2">
                <span className="font-medium hover:text-accent">{r.name}</span>
                <ManaCost cost={r.manaCost} />
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                <ColorDots identity={r.colorIdentity} />
                <SetSymbol
                  setCode={r.setCode}
                  rarity={r.rarity}
                  className="text-sm"
                />
                {r.typeLine}
                {decks.length > 0 && (
                  <span
                    className="rounded-full bg-[var(--purple)]/15 px-1.5 py-0.5 font-semibold text-[var(--purple-deep)]"
                    title={decks.map((d) => d.name).join(', ')}
                  >
                    🃏 in {decks.length} deck{decks.length === 1 ? '' : 's'}
                  </span>
                )}
              </span>
            </button>
            <div className="text-right text-sm">
              <span className="font-medium">×{r.quantity}</span>
              {r.foil && (
                <span className="ml-1 text-accent" title="foil">
                  ✦
                </span>
              )}
              {r.priceUsd && (
                <div className="text-[11px] text-muted">${r.priceUsd}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
