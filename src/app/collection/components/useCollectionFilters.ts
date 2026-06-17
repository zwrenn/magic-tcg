import { useState } from 'react';
import type { SortKey } from '@/lib/search/collection';
import {
  type AdvancedSearchValues,
  EMPTY_SEARCH_VALUES,
} from '@/lib/search/queryParser';

export type DeckUsage = Record<
  string,
  { id: number; name: string; owner?: string }[]
>;

export function useCollectionFilters() {
  // Submit-based search filters — applied when the form is submitted.
  const [searchValues, setSearchValues] =
    useState<AdvancedSearchValues>(EMPTY_SEARCH_VALUES);

  // Instant filters — applied immediately without a form submit.
  const [set, setSet] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [favOnly, setFavOnly] = useState(false);
  const [deckFilter, setDeckFilter] = useState<'any' | 'in' | 'out'>('any');

  function clearSearchValues() {
    setSearchValues(EMPTY_SEARCH_VALUES);
  }

  function clearAll() {
    setSearchValues(EMPTY_SEARCH_VALUES);
    setSet('all');
    setFavOnly(false);
  }

  return {
    searchValues,
    setSearchValues,
    clearSearchValues,
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
