'use client';

import type { CollectionRow } from '@/lib/search';
import type { DeckUsage } from '../useCollectionFilters';
import { GridCard } from './GridCard';

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
      {items.map((r, i) => (
        <GridCard
          key={`${r.name}-${r.foil}-${i}`}
          item={r}
          index={i}
          isFav={favs.has(r.normalizedName)}
          decks={deckUsage[r.normalizedName] ?? []}
          onFavChange={onFavChange}
          onZoom={onZoom}
        />
      ))}
    </ul>
  );
}
