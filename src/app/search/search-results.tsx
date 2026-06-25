'use client';

import { useMemo, useState } from 'react';
import { useCardZoom } from '@/components/card-zoom';
import { FavoriteStar } from '@/components/FavoriteStar';
import { QuickAddButton } from '@/components/quick-add-button';
import { ColorDots } from '@/components/mana';
import { SetSymbol } from '@/components/set-symbol';
import { Toggle } from '@/components/Toggle';
import { SearchOwnerChips } from './owner-chips';

type Owner = { name: string; qty: number; foil: boolean };
type DeckRef = { id: number; name: string };

export type SearchResultItem = {
  normalizedName: string;
  name: string;
  image: string | null;
  owners: Owner[];
  // Advanced-only meta (optional)
  typeLine?: string | null;
  cmc?: number | null;
  colorIdentity?: string | null;
  rarity?: string | null;
  setCode?: string | null;
  priceUsd?: string | null;
  // Per-result extras computed server-side
  decksByOwner: Record<string, DeckRef[]>;
  alreadyAsked: string[];
  favorite: boolean;
  advanced: boolean;
};

export function SearchResults({
  items,
  viewerName,
}: {
  items: SearchResultItem[];
  viewerName: string;
}) {
  const [view, setView] = useState<'list' | 'grid'>('list');
  const { openList } = useCardZoom();

  const zoomList = useMemo(
    () =>
      items.map((r) => ({
        name: r.name,
        image: r.image,
        key: r.normalizedName,
        holo: r.owners.some((o) => o.foil),
        favorite: r.favorite,
        owners: r.owners,
        viewerName,
        askedOwners: r.alreadyAsked,
      })),
    [items, viewerName]
  );
  const openAt = (i: number) => openList(zoomList, i);

  return (
    <>
      <div className="mb-2 flex justify-end">
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-xs">
          <Toggle active={view === 'list'} onClick={() => setView('list')}>
            List
          </Toggle>
          <Toggle active={view === 'grid'} onClick={() => setView('grid')}>
            Grid
          </Toggle>
        </div>
      </div>

      {view === 'list' ? (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {items.map((r, i) => (
            <li
              key={r.normalizedName}
              className="flex items-start gap-3 px-3 py-2"
            >
              <button
                type="button"
                title={r.name}
                onClick={() => openAt(i)}
                className="shrink-0"
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
              <FavoriteStar
                name={r.name}
                initial={r.favorite}
                className="mt-1 text-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openAt(i)}
                    className="min-w-0 flex-1 truncate text-left font-medium hover:text-accent"
                  >
                    {r.name}
                  </button>
                  <SearchOwnerChips
                    cardName={r.name}
                    owners={r.owners}
                    viewerName={viewerName}
                    decksByOwner={r.decksByOwner}
                    alreadyAsked={r.alreadyAsked}
                  />
                </div>
                {r.advanced && (
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <ColorDots identity={r.colorIdentity ?? null} />
                    <SetSymbol
                      setCode={r.setCode ?? null}
                      rarity={r.rarity ?? null}
                      className="text-sm"
                    />
                    {r.typeLine ?? ''}
                    {r.cmc != null ? ` · MV ${r.cmc}` : ''}
                    {r.priceUsd ? ` · $${r.priceUsd}` : ''}
                  </div>
                )}
              </div>
              <QuickAddButton name={r.name} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-2 grid grid-cols-3 gap-2 xs:grid-cols-4 sm:grid-cols-5 md:grid-cols-6">
          {items.map((r, i) => (
            <li key={r.normalizedName} className="relative">
              <button
                type="button"
                title={r.name}
                onClick={() => openAt(i)}
                className="group w-full"
              >
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image}
                    alt={r.name}
                    loading="lazy"
                    className="w-full rounded-lg border border-border object-cover transition group-hover:brightness-110"
                  />
                ) : (
                  <span className="grid aspect-[488/680] w-full place-items-center rounded-lg border border-border bg-surface-2 text-[8px] text-muted">
                    {r.name}
                  </span>
                )}
              </button>
              <div className="absolute top-1 left-1">
                <FavoriteStar
                  name={r.name}
                  initial={r.favorite}
                  className="text-base drop-shadow"
                />
              </div>
              {r.owners.length > 0 && (
                <div className="absolute right-1 bottom-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white">
                  {r.owners.length === 1
                    ? r.owners[0].name
                    : `${r.owners.length} owners`}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
