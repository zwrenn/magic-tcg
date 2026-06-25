'use client';

import { useEffect, useState } from 'react';
import type { SortKey } from '@/lib/search/collection';
import {
  type AdvancedSearchValues,
  EMPTY_SEARCH_VALUES,
  parseQuery,
  serializeQuery,
} from '@/lib/search/queryParser';

export type DeckUsage = Record<
  string,
  { id: number; name: string; owner?: string }[]
>;

export interface CollectionFilterInit {
  query: string;
  sort: SortKey;
  dir: 'asc' | 'desc';
  favOnly: boolean;
  deckFilter: 'any' | 'in' | 'out';
  set: string;
  page: number;
}

export function useCollectionFilters(init: CollectionFilterInit) {
  const [searchValues, _setSearchValues] = useState<AdvancedSearchValues>(() =>
    parseQuery(init.query)
  );
  const [set, _setSet] = useState(init.set);
  const [sort, _setSort] = useState<SortKey>(init.sort);
  const [dir, _setDir] = useState<'asc' | 'desc'>(init.dir);
  const [favOnly, _setFavOnly] = useState(init.favOnly);
  const [deckFilter, _setDeckFilter] = useState<'any' | 'in' | 'out'>(
    init.deckFilter
  );
  const [page, _setPage] = useState(init.page);

  // Mirror filter state into the URL without triggering Next.js navigation,
  // so the page is shareable/bookmarkable but filter changes stay client-side.
  useEffect(() => {
    const sp = new URLSearchParams();
    const q = serializeQuery(searchValues);
    if (q) sp.set('q', q);
    if (set !== 'all') sp.set('set', set);
    if (sort !== 'name') sp.set('sort', sort);
    if (dir !== 'asc') sp.set('dir', dir);
    if (favOnly) sp.set('fav', '1');
    if (deckFilter !== 'any') sp.set('deck', deckFilter);
    if (page > 1) sp.set('page', String(page));
    const qs = sp.toString();
    window.history.replaceState(
      null,
      '',
      qs ? `/collection?${qs}` : '/collection'
    );
  }, [searchValues, set, sort, dir, favOnly, deckFilter, page]);

  return {
    searchValues,
    // Parses raw Scryfall query text and also extracts sort: keywords into the
    // sort state, matching the behaviour of the pod-wide search panel.
    submitQuery: (raw: string) => {
      const parsed = parseQuery(raw);
      _setSearchValues({ ...parsed, sort: undefined });
      if (parsed.sort) _setSort(parsed.sort as SortKey);
      _setPage(1);
    },
    setSearchValues: (v: AdvancedSearchValues) => {
      _setSearchValues(v);
      _setPage(1);
    },
    set,
    setSet: (v: string) => {
      _setSet(v);
      _setPage(1);
    },
    sort,
    setSort: (v: SortKey) => {
      _setSort(v);
      _setPage(1);
    },
    dir,
    setDir: (v: 'asc' | 'desc') => {
      _setDir(v);
      _setPage(1);
    },
    favOnly,
    setFavOnly: (v: boolean) => {
      _setFavOnly(v);
      _setPage(1);
    },
    deckFilter,
    setDeckFilter: (v: 'any' | 'in' | 'out') => {
      _setDeckFilter(v);
      _setPage(1);
    },
    page,
    setPage: _setPage,
    clearAll: () => {
      _setSearchValues(EMPTY_SEARCH_VALUES);
      _setSet('all');
      _setFavOnly(false);
      _setPage(1);
    },
  };
}
