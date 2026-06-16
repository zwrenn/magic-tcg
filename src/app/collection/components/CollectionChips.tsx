'use client';

import { Chip } from '@/components/Chip';
import type { ColorBucket, TypeBucket } from '@/lib/card-types';

interface SelectOption {
  value: string;
  label: string;
}

interface CollectionChipsProps {
  favOnly: boolean;
  onClearFavOnly: () => void;
  color: ColorBucket | 'all';
  onClearColor: () => void;
  type: TypeBucket | 'all';
  onClearType: () => void;
  set: string;
  onClearSet: () => void;
  setOptions: SelectOption[];
  onClearAll: () => void;
}

export function CollectionChips({
  favOnly,
  onClearFavOnly,
  color,
  onClearColor,
  type,
  onClearType,
  set,
  onClearSet,
  setOptions,
  onClearAll,
}: CollectionChipsProps) {
  const hasActiveFilter =
    favOnly || color !== 'all' || type !== 'all' || set !== 'all';
  if (!hasActiveFilter) return null;

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
      {favOnly && <Chip label="★ Favorites" onClear={onClearFavOnly} />}
      {color !== 'all' && <Chip label={color} onClear={onClearColor} />}
      {type !== 'all' && <Chip label={type} onClear={onClearType} />}
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
