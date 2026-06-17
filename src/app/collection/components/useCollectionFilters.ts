import { useState } from 'react';
import type { SortKey } from '@/lib/search/collection';
import type { ColorBucket, TypeBucket } from '@/lib/card-types';

export type DeckUsage = Record<
  string,
  { id: number; name: string; owner?: string }[]
>;

export function useCollectionFilters() {
  const [color, setColor] = useState<ColorBucket | 'all'>('all');
  const [type, setType] = useState<TypeBucket | 'all'>('all');
  const [set, setSet] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [favOnly, setFavOnly] = useState(false);
  const [deckFilter, setDeckFilter] = useState<'any' | 'in' | 'out'>('any');

  function clearAll() {
    setFavOnly(false);
    setColor('all');
    setType('all');
    setSet('all');
  }

  return {
    color,
    setColor,
    type,
    setType,
    set,
    setSet,
    sort,
    setSort,
    dir,
    setDir,
    favOnly,
    setFavOnly,
    deckFilter,
    setDeckFilter,
    clearAll,
  };
}
