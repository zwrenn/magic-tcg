/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CollectionRow } from '@/lib/search';
import type { DeckUsage } from './useCollectionFilters';
import { useCollectionFilters } from './useCollectionFilters';
import { CollectionFiltersBar } from './CollectionFiltersBar';
import { CollectionChips } from './CollectionChips';
import { CollectionGrid } from './CollectionGrid';
import { CollectionList } from './CollectionList';
import { CollectionLightbox } from './CollectionLightbox';

type ViewMode = 'grid' | 'list';

interface CollectionViewProps {
  rows: CollectionRow[];
  total: number;
  limit: number;
  query: string;
  favorites: string[];
  deckUsage?: DeckUsage;
}

export function CollectionView({
  rows,
  total,
  limit,
  query,
  favorites,
  deckUsage = {},
}: CollectionViewProps) {
  const [view, setView] = useState<ViewMode>('grid');
  const [favs, setFavs] = useState<Set<string>>(() => new Set(favorites));
  const [zoom, setZoom] = useState<number | null>(null);
  const [items, setItems] = useState<CollectionRow[]>(rows);

  useEffect(() => setItems(rows), [rows]);

  useEffect(() => {
    const saved = localStorage.getItem('pod_collection_view');
    if (saved === 'grid' || saved === 'list') setView(saved);
  }, []);

  function pickView(v: ViewMode) {
    setView(v);
    localStorage.setItem('pod_collection_view', v);
  }

  function onFavChange(normalized: string, favorited: boolean) {
    setFavs((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(normalized);
      else next.delete(normalized);
      return next;
    });
  }

  async function changeQty(itemId: number, quantity: number) {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((r) => r.id !== itemId)
        : prev.map((r) => (r.id === itemId ? { ...r, quantity } : r))
    );
    if (quantity <= 0) setZoom(null);
    try {
      await fetch('/api/collection/item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, quantity }),
      });
    } catch {
      /* optimistic; a refresh will reconcile */
    }
  }

  const filters = useCollectionFilters(items, deckUsage, favs);
  const {
    visible,
    setOptions,
    color,
    type,
    set,
    sort,
    dir,
    favOnly,
    deckFilter,
  } = filters;

  const close = useCallback(() => setZoom(null), []);
  const step = useCallback(
    (delta: number) =>
      setZoom((z) =>
        z === null ? z : Math.min(visible.length - 1, Math.max(0, z + delta))
      ),
    [visible.length]
  );

  const truncated = items.length >= limit && total > items.length;

  return (
    <>
      <CollectionFiltersBar
        color={color}
        onColorChange={filters.setColor}
        type={type}
        onTypeChange={filters.setType}
        set={set}
        onSetChange={filters.setSet}
        sort={sort}
        onSortChange={filters.setSort}
        dir={dir}
        onDirToggle={() =>
          filters.setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        }
        deckFilter={deckFilter}
        onDeckFilterChange={filters.setDeckFilter}
        favOnly={favOnly}
        onFavOnlyToggle={() => filters.setFavOnly((f) => !f)}
        view={view}
        onViewChange={pickView}
        setOptions={setOptions}
      />
      <CollectionChips
        favOnly={favOnly}
        onClearFavOnly={() => filters.setFavOnly(false)}
        color={color}
        onClearColor={() => filters.setColor('all')}
        type={type}
        onClearType={() => filters.setType('all')}
        set={set}
        onClearSet={() => filters.setSet('all')}
        setOptions={setOptions}
        onClearAll={filters.clearAll}
      />
      <p className="mb-3 text-xs text-muted">
        {query ? (
          <>
            {visible.length} match{visible.length === 1 ? '' : 'es'} for &ldquo;
            {query}&rdquo;
          </>
        ) : (
          <>
            Showing {visible.length.toLocaleString()} of{' '}
            {total.toLocaleString()}
            {truncated && ' — search to narrow further'}
          </>
        )}
      </p>
      {view === 'grid' ? (
        <CollectionGrid
          items={visible}
          favs={favs}
          deckUsage={deckUsage}
          onFavChange={onFavChange}
          onZoom={setZoom}
        />
      ) : (
        <CollectionList
          items={visible}
          favs={favs}
          deckUsage={deckUsage}
          onFavChange={onFavChange}
          onZoom={setZoom}
        />
      )}
      {visible.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          {favOnly
            ? 'No favorites match these filters yet — tap ☆ on a card to add one.'
            : 'No cards match these filters.'}
        </p>
      )}
      <CollectionLightbox
        visible={visible}
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
