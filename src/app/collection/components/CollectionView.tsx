'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import type {
  CollectionQueryResult,
  CollectionRow,
} from '@/lib/search/collection';
import type { DeckUsage } from './useCollectionFilters';
import { useCollectionFilters } from './useCollectionFilters';
import { AdvancedSearchForm } from '@/components/AdvancedSearchForm';
import { CollectionFiltersBar } from './CollectionFiltersBar';
import { CollectionChips } from './CollectionChips';
import { CollectionGrid } from './CollectionGrid';
import { CollectionList } from './CollectionList';
import { CollectionLightbox } from './CollectionLightbox';
import { gridListRowClass } from './constants';
import { Pagination } from '@/components/Pagination';

type ViewMode = 'grid' | 'list';

interface CollectionViewProps {
  userId: number;
  favorites: string[];
  deckUsage?: DeckUsage;
}

const LIMIT = 60;
const emptyItems = [] as CollectionRow[];
const emptyOptions = [] as { value: string; label: string }[];

export function CollectionView({
  userId,
  favorites,
  deckUsage = {},
}: CollectionViewProps) {
  const [view, setView] = useState<ViewMode>('grid');
  const [favs, setFavs] = useState<Set<string>>(() => new Set(favorites));
  const [zoom, setZoom] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const saved = localStorage.getItem('pod_collection_view');
    if (saved === 'grid' || saved === 'list') setView(saved as ViewMode);
  }, []);

  function pickView(v: ViewMode) {
    setView(v);
    localStorage.setItem('pod_collection_view', v);
  }

  const {
    searchValues,
    setSearchValues,
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

  // Reset to page 1 whenever any filter or sort changes.
  useEffect(() => {
    setPage(1);
  }, [searchValues, set, sort, dir, favOnly, deckFilter]);

  const { data, isPending, isFetching } = useQuery<CollectionQueryResult>({
    queryKey: [
      'collection',
      userId,
      {
        searchValues,
        set,
        sortBy: sort,
        sortDir: dir,
        favOnly,
        deckFilter,
        page,
      },
    ],
    queryFn: async () => {
      const sp = new URLSearchParams();
      if (searchValues.name) sp.set('q', searchValues.name);
      if (searchValues.typeLine) sp.set('typeLine', searchValues.typeLine);
      if (searchValues.colors.length > 0)
        sp.set('colors', searchValues.colors.join(''));
      if (searchValues.colorMode !== 'including')
        sp.set('colorMode', searchValues.colorMode);
      if (searchValues.colorless) sp.set('colorless', 'true');
      if (searchValues.rarity) sp.set('rarity', searchValues.rarity);
      if (searchValues.cmc) {
        sp.set('cmc', searchValues.cmc);
        sp.set('cmcOp', searchValues.cmcOp);
      }
      if (set !== 'all') sp.set('set', set);
      sp.set('sortBy', sort);
      sp.set('sortDir', dir);
      if (favOnly) sp.set('favOnly', 'true');
      if (deckFilter !== 'any') sp.set('deckFilter', deckFilter);
      sp.set('page', String(page));
      sp.set('limit', String(LIMIT));
      const res = await fetch(`/api/collection?${sp}`);
      if (!res.ok) throw new Error('Failed to fetch collection');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  const items = data?.items ?? emptyItems;
  const setOptions = data?.sets ?? emptyOptions;
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

  const itemCount = items.length;

  useEffect(() => {
    setZoom((z) => (z !== null && z >= itemCount ? null : z));
  }, [itemCount]);

  const close = useCallback(() => setZoom(null), []);
  const step = useCallback(
    (delta: number) =>
      setZoom((z) =>
        z === null ? z : Math.min(itemCount - 1, Math.max(0, z + delta))
      ),
    [itemCount]
  );

  if (isPending) {
    return (
      <ul className={`grid gap-3 ${gridListRowClass}`}>
        {Array.from({ length: 24 }).map((_, i) => (
          <li
            key={i}
            className="aspect-488/680 animate-pulse rounded-lg bg-surface-2"
          />
        ))}
      </ul>
    );
  }

  return (
    <>
      <div ref={topRef} className="module mb-4 p-4">
        <AdvancedSearchForm
          values={searchValues}
          onChange={setSearchValues}
          onSubmit={setSearchValues}
          submitLabel="Search my collection"
        />
      </div>
      <CollectionFiltersBar
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
        set={set}
        onSetChange={setSet}
        setOptions={setOptions}
      />
      <CollectionChips
        searchValues={searchValues}
        onChangeSearchValues={setSearchValues}
        favOnly={favOnly}
        onClearFavOnly={() => setFavOnly(false)}
        set={set}
        onClearSet={() => setSet('all')}
        setOptions={setOptions}
        onClearAll={clearAll}
      />
      <p className="mb-3 text-xs text-muted">
        {total.toLocaleString()} card{total === 1 ? '' : 's'}
        {searchValues.name && <> matching &ldquo;{searchValues.name}&rdquo;</>}
        {Math.ceil(total / LIMIT) > 1 && (
          <>
            {' '}
            &middot; page {page} of {Math.ceil(total / LIMIT)}
          </>
        )}
      </p>
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
      <Pagination
        page={page}
        totalPages={Math.ceil(total / LIMIT)}
        disabled={isFetching}
        onPageChange={setPage}
        scrollTargetRef={topRef}
      />
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
