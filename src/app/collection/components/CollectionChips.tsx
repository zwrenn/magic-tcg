'use client';

import { Chip } from '@/components/Chip';
import { QueryChips } from '@/components/QueryChips';
import type { AdvancedSearchValues } from '@/lib/search/queryParser';

interface CollectionChipsProps {
  searchValues: AdvancedSearchValues;
  onChangeSearchValues: (v: AdvancedSearchValues) => void;
  favOnly: boolean;
  onClearFavOnly: () => void;
  set: string;
  onClearSet: () => void;
  setOptions: { value: string; label: string }[];
  onClearAll: () => void;
}

export function CollectionChips({
  searchValues,
  onChangeSearchValues,
  favOnly,
  onClearFavOnly,
  set,
  onClearSet,
  setOptions,
  onClearAll,
}: CollectionChipsProps) {
  const { name, typeLine, colors, colorless, rarity, cmc } = searchValues;
  const hasQueryChips = !!(
    name ||
    typeLine ||
    colors.length ||
    colorless ||
    rarity ||
    cmc
  );
  if (!hasQueryChips && !favOnly && set === 'all') return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
      <QueryChips values={searchValues} onChange={onChangeSearchValues} />
      {favOnly && <Chip label="★ Favorites" onClear={onClearFavOnly} />}
      {set !== 'all' && (
        <Chip
          label={setOptions.find((s) => s.value === set)?.label ?? set}
          onClear={onClearSet}
        />
      )}
      <button
        onClick={onClearAll}
        className="text-muted underline hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
