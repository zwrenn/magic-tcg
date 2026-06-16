'use client';

import type { CollectionRow } from '@/lib/search';
import type { DeckUsage } from '../useCollectionFilters';
import { GridCard } from './GridCard';
import { gridListRowClass } from '../constants';

interface CollectionGridProps {
  items: CollectionRow[];
  favs: Set<string>;
  deckUsage: DeckUsage;
  onFavChange: (normalized: string, favorited: boolean) => void;
  onZoom: (index: number) => void;
}

const emptyDecks: DeckUsage[string] = [];

export function CollectionGrid({
  items,
  favs,
  deckUsage,
  onFavChange,
  onZoom,
}: CollectionGridProps) {
  return (
    <ul className={`grid gap-3 ${gridListRowClass}`}>
      {items.map((r, i) => (
        <GridCard
          key={`${r.name}-${r.foil}-${i}`}
          item={r}
          index={i}
          isFav={favs.has(r.normalizedName)}
          decks={deckUsage[r.normalizedName] ?? emptyDecks}
          onFavChange={onFavChange}
          onZoom={onZoom}
        />
      ))}
    </ul>
  );
}
