'use client';

import type { CollectionRow } from '@/lib/search';
import type { DeckUsage } from './useCollectionFilters';
import { FavoriteStar } from '@/components/favorite-star';
import { SetSymbol } from '@/components/set-symbol';

interface CollectionGridProps {
  items: CollectionRow[];
  favs: Set<string>;
  deckUsage: DeckUsage;
  onFavChange: (normalized: string, favorited: boolean) => void;
  onZoom: (index: number) => void;
}

export function CollectionGrid({
  items,
  favs,
  deckUsage,
  onFavChange,
  onZoom,
}: CollectionGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {items.map((r, i) => {
        const decks = deckUsage[r.normalizedName] ?? [];
        return (
          <li key={`${r.name}-${r.foil}-${i}`} className="group relative">
            <button
              onClick={() => onZoom(i)}
              title={r.name}
              className={`block w-full overflow-hidden rounded-lg border border-border bg-surface-2 transition hover:border-accent/60 ${r.foil ? 'foil-frame' : ''}`}
            >
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt={r.name}
                  loading="lazy"
                  className="aspect-[488/680] w-full object-cover"
                />
              ) : (
                <span className="flex aspect-[488/680] w-full items-center justify-center p-2 text-center text-xs text-muted">
                  {r.name}
                </span>
              )}
              <span className="absolute top-1 right-1 z-10 flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">
                <SetSymbol setCode={r.setCode} rarity={r.rarity} />×{r.quantity}
                {r.foil && <span className="ml-0.5 text-accent">✦</span>}
              </span>
              <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pt-5 pb-1.5 text-left text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                {r.name}
              </span>
            </button>
            <FavoriteStar
              name={r.name}
              initial={favs.has(r.normalizedName)}
              onChange={(f) => onFavChange(r.normalizedName, f)}
              className="absolute top-1 left-1 rounded-md bg-black/60 px-1.5 text-base"
            />
            {decks.length > 0 && (
              <span
                className="pointer-events-none absolute bottom-1 left-1 z-10 rounded-md bg-[var(--purple)] px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
                title={`In: ${decks.map((d) => d.name).join(', ')}`}
              >
                🃏 {decks.length}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
