'use client';

import { Chip } from '@/components/Chip';
import type { AdvancedSearchValues } from '@/components/AdvancedSearchForm';
import { ComponentProps } from 'react';

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

const CMC_OP: Record<string, string> = { eq: '=', lte: '≤', gte: '≥' };

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
  const { name, typeLine, colors, colorless, rarity, cmc, cmcOp } =
    searchValues;

  function clear<K extends keyof AdvancedSearchValues>(
    key: K,
    value: AdvancedSearchValues[K]
  ) {
    onChangeSearchValues({ ...searchValues, [key]: value });
  }

  const chips = [
    name && { label: `"${name}"`, onClear: () => clear('name', '') },
    typeLine && {
      label: `type: ${typeLine}`,
      onClear: () => clear('typeLine', ''),
    },
    colors.length && {
      label: colors.join(', '),
      onClear: () => clear('colors', []),
    },
    colorless && {
      label: 'Colorless',
      onClear: () => clear('colorless', false),
    },
    rarity && {
      label: rarity[0].toUpperCase() + rarity.slice(1),
      onClear: () => clear('rarity', ''),
    },
    cmc && {
      label: `MV ${CMC_OP[cmcOp] ?? '='} ${cmc}`,
      onClear: () => clear('cmc', ''),
    },
    favOnly && { label: '★ Favorites', onClear: onClearFavOnly },
    set !== 'all' && {
      label: setOptions.find((s) => s.value === set)?.label ?? set,
      onClear: onClearSet,
    },
  ].filter(Boolean) as Pick<ComponentProps<typeof Chip>, 'label' | 'onClear'>[];

  if (chips.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
      {chips.map((chip) => (
        <Chip key={chip.label} label={chip.label} onClear={chip.onClear} />
      ))}
      <button
        onClick={onClearAll}
        className="text-muted underline hover:text-foreground"
      >
        Clear all
      </button>
    </div>
  );
}
