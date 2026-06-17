'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import type { CollectionQueryResult } from '@/lib/search/collection';
import type { DeckUsage } from './useCollectionFilters';
import { useCollectionFilters } from './useCollectionFilters';
import { CollectionFiltersBar } from './CollectionFiltersBar';
import { CollectionChips } from './CollectionChips';
import { CollectionGrid } from './CollectionGrid';
import { CollectionList } from './CollectionList';
import { CollectionLightbox } from './CollectionLightbox';
import { gridListRowClass } from './constants';

type ViewMode = 'grid' | 'list';

interface CollectionViewProps {
  userId: number;
  favorites: string[];
  deckUsage?: DeckUsage;
}

export function CollectionView({
  userId,
  favorites,
  deckUsage = {},
}: CollectionViewProps) {
  const [view, setView] = useState<ViewMode>('grid');
  const [favs, setFavs] = useState<Set<string>>(() => new Set(favorites));
  const [zoom, setZoom] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const queryClient = useQueryClient();

  // 300 ms debounce so the API isn't hit on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  useEffect(() => {
    const saved = localStorage.getItem('pod_collection_view');
    if (saved === 'grid' || saved === 'list') setView(saved as ViewMode);
  }, []);

  function pickView(v: ViewMode) {
    setView(v);
    localStorage.setItem('pod_collection_view', v);
  }

  const {
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
  } = useCollectionFilters();

  const { data, isPending, isFetching } = useQuery<CollectionQueryResult>({
    queryKey: [
      'collection',
      userId,
      {
        q: debouncedQ,
        color,
        type,
        set,
        sortBy: sort,
        sortDir: dir,
        favOnly,
        deckFilter,
      },
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (debouncedQ) sp.set('q', debouncedQ);
      if (color !== 'all') sp.set('color', color);
      if (type !== 'all') sp.set('type', type);
      if (set !== 'all') sp.set('set', set);
      sp.set('sortBy', sort);
      sp.set('sortDir', dir);
      if (favOnly) sp.set('favOnly', '1');
      if (deckFilter !== 'any') sp.set('deckFilter', deckFilter);
      const res = await fetch(`/api/collection?${sp}`);
      if (!res.ok) throw new Error('Failed to fetch collection');
      return res.json();
    },
    // Keep the previous page's data visible while a new fetch is in-flight so
    // the grid doesn't flash empty on every filter change.
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? [];
  const setOptions = data?.sets ?? [];
  const total = data?.total ?? 0;

  function onFavChange(normalized: string, favorited: boolean) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(normalized);
      else next.delete(normalized);
      return next;
    });
  }

  async function changeQty(itemId: number, quantity: number) {
    if (quantity <= 0) setZoom(null);
    try {
      await fetch('/api/collection/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, quantity }),
      });
      queryClient.invalidateQueries({ queryKey: ['collection', userId] });
    } catch {
      /* best-effort; a manual refresh will reconcile */
    }
  }

  const close = useCallback(() => setZoom(null), []);
  const step = useCallback(
    (delta: number) =>
      setZoom((z) =>
        z === null ? z : Math.min(items.length - 1, Math.max(0, z + delta))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.items]
  );

  if (isPending) {
    return (
      <ul className={`grid gap-3 ${gridListRowClass}`}>
        {Array.from({ length: 24 }).map((_, i) => (
          <li
            key={i}
            className="aspect-[488/680] animate-pulse rounded-lg bg-surface-2"
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <form role="search" onSubmit={(e) => e.preventDefault()} className="mb-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your cards by name…  (press / )"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </form>
      <CollectionFiltersBar
        color={color}
        onColorChange={setColor}
        type={type}
        onTypeChange={setType}
        set={set}
        onSetChange={setSet}
        sort={sort}
        onSortChange={setSort}
        dir={dir}
        onDirToggle={() => setDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
        deckFilter={deckFilter}
        onDeckFilterChange={setDeckFilter}
        favOnly={favOnly}
        onFavOnlyToggle={() => setFavOnly((f) => !f)}
        view={view}
        onViewChange={pickView}
        setOptions={setOptions}
      />
      <CollectionChips
        favOnly={favOnly}
        onClearFavOnly={() => setFavOnly(false)}
        color={color}
        onClearColor={() => setColor('all')}
        type={type}
        onClearType={() => setType('all')}
        set={set}
        onClearSet={() => setSet('all')}
        setOptions={setOptions}
        onClearAll={clearAll}
      />
      <p className="mb-3 text-xs text-muted">
        {q ? (
          <>
            {items.length} match{items.length === 1 ? '' : 'es'} for &ldquo;{q}
            &rdquo;
          </>
        ) : (
          <>
            Showing {items.length.toLocaleString()} of {total.toLocaleString()}
          </>
        )}
      </p>
      {/* Dim the grid while a background refetch is in progress. */}
      <div
        className={
          isFetching ? 'opacity-60 transition-opacity duration-150' : ''
        }
      >
        {view === 'grid' ? (
          <CollectionGrid
            items={items}
            favs={favs}
            deckUsage={deckUsage}
            onFavChange={onFavChange}
            onZoom={setZoom}
          />
        ) : (
          <CollectionList
            items={items}
            favs={favs}
            deckUsage={deckUsage}
            onFavChange={onFavChange}
            onZoom={setZoom}
          />
        )}
      </div>
      {items.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          {favOnly
            ? 'No favorites match these filters yet — tap ☆ on a card to add one.'
            : 'No cards match these filters.'}
        </p>
      )}
      <CollectionLightbox
        visible={items}
        zoom={zoom}
        favs={favs}
        deckUsage={deckUsage}
        onClose={close}
        onStep={step}
        onFavChange={onFavChange}
        onChangeQty={changeQty}
      />
    </>
  );
}
