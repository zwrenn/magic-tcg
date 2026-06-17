'use client';

import { Select } from '@/components/Select';
import { Toggle } from '@/components/Toggle';
import type { SortKey } from '@/lib/search/collection';

type ViewMode = 'grid' | 'list';

interface SelectOption {
  value: string;
  label: string;
}

interface CollectionFiltersBarProps {
  sort: SortKey;
  onSortChange: (v: SortKey) => void;
  dir: 'asc' | 'desc';
  onDirToggle: () => void;
  deckFilter: 'any' | 'in' | 'out';
  onDeckFilterChange: (v: 'any' | 'in' | 'out') => void;
  favOnly: boolean;
  onFavOnlyToggle: () => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  set: string;
  onSetChange: (v: string) => void;
  setOptions: SelectOption[];
}

export function CollectionFiltersBar({
  sort,
  onSortChange,
  dir,
  onDirToggle,
  deckFilter,
  onDeckFilterChange,
  favOnly,
  onFavOnlyToggle,
  view,
  onViewChange,
  set,
  onSetChange,
  setOptions,
}: CollectionFiltersBarProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <button
        onClick={onFavOnlyToggle}
        className={`rounded-lg border px-3 py-1 font-medium transition ${
          favOnly
            ? 'border-warn bg-warn/15 text-warn'
            : 'border-border bg-surface text-muted hover:text-foreground'
        }`}
      >
        ★ Favorites
      </button>
      <Select
        label="Set"
        value={set}
        onChange={onSetChange}
        options={[{ value: 'all', label: 'All sets' }, ...setOptions]}
      />
      <Select
        label="Decks"
        value={deckFilter}
        onChange={(v) => onDeckFilterChange(v as 'any' | 'in' | 'out')}
        options={[
          { value: 'any', label: 'Any' },
          { value: 'in', label: 'In a deck' },
          { value: 'out', label: 'Not in a deck' },
        ]}
      />
      <Select
        label="Sort"
        value={sort}
        onChange={(v) => onSortChange(v as SortKey)}
        options={[
          { value: 'name', label: 'Name' },
          { value: 'cmc', label: 'Mana value' },
          { value: 'color', label: 'Color' },
          { value: 'type', label: 'Type' },
          { value: 'set', label: 'Set' },
          { value: 'quantity', label: 'Quantity' },
          { value: 'price', label: 'Price' },
        ]}
      />
      <button
        onClick={onDirToggle}
        title={dir === 'asc' ? 'Ascending' : 'Descending'}
        className="rounded-lg border border-border bg-surface px-2 py-1 text-foreground hover:border-accent/60"
      >
        {dir === 'asc' ? '↑' : '↓'}
      </button>
      <div className="ml-auto flex gap-1 rounded-lg bg-surface-2 p-1 text-xs">
        <Toggle active={view === 'grid'} onClick={() => onViewChange('grid')}>
          Grid
        </Toggle>
        <Toggle active={view === 'list'} onClick={() => onViewChange('list')}>
          List
        </Toggle>
      </div>
    </div>
  );
}
