import { useMemo, useState } from 'react';
import type { CollectionRow, SortKey } from '@/lib/search';
import {
  COLOR_BUCKETS,
  TYPE_BUCKETS,
  colorBucket,
  typeBucket,
  type ColorBucket,
  type TypeBucket,
} from '@/lib/card-types';
export type DeckUsage = Record<
  string,
  { id: number; name: string; owner?: string }[]
>;

const COLOR_ORDER: ColorBucket[] = [...COLOR_BUCKETS];
const TYPE_ORDER: TypeBucket[] = [...TYPE_BUCKETS];

export function useCollectionFilters(
  items: CollectionRow[],
  deckUsage: DeckUsage,
  favs: Set<string>
) {
  const [color, setColor] = useState<ColorBucket | 'all'>('all');
  const [type, setType] = useState<TypeBucket | 'all'>('all');
  const [set, setSet] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [favOnly, setFavOnly] = useState(false);
  const [deckFilter, setDeckFilter] = useState<'any' | 'in' | 'out'>('any');

  const decorated = useMemo(
    () =>
      items.map((r) => ({
        row: r,
        color: colorBucket(r.colorIdentity),
        type: typeBucket(r.typeLine),
        set: (r.setCode ?? '').toUpperCase(),
      })),
    [items]
  );

  const setOptions = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const d of decorated) {
      if (!d.set) continue;
      if (!byCode.has(d.set)) byCode.set(d.set, d.row.setName?.trim() || d.set);
    }
    return [...byCode.entries()]
      .map(([value, name]) => ({ value, label: name }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [decorated]);

  const visible = useMemo(() => {
    let v = decorated;
    if (favOnly) v = v.filter((d) => favs.has(d.row.normalizedName));
    if (color !== 'all') v = v.filter((d) => d.color === color);
    if (type !== 'all') v = v.filter((d) => d.type === type);
    if (set !== 'all') v = v.filter((d) => d.set === set);
    if (deckFilter !== 'any')
      v = v.filter((d) => {
        const inDeck = (deckUsage[d.row.normalizedName] ?? []).length > 0;
        return deckFilter === 'in' ? inDeck : !inDeck;
      });

    const base = (a: (typeof v)[number], b: (typeof v)[number]): number => {
      switch (sort) {
        case 'cmc':
          return (a.row.cmc ?? 99) - (b.row.cmc ?? 99);
        case 'color':
          return COLOR_ORDER.indexOf(a.color) - COLOR_ORDER.indexOf(b.color);
        case 'type':
          return TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
        case 'quantity':
          return a.row.quantity - b.row.quantity;
        case 'price':
          return (Number(a.row.priceUsd) || 0) - (Number(b.row.priceUsd) || 0);
        case 'set':
          return (a.row.setName ?? a.set).localeCompare(b.row.setName ?? b.set);
        default:
          return a.row.name.localeCompare(b.row.name);
      }
    };

    const factor = dir === 'asc' ? 1 : -1;
    const sorted = [...v].sort((a, b) => {
      const primary = base(a, b) * factor;
      return primary !== 0 ? primary : a.row.name.localeCompare(b.row.name);
    });
    return sorted.map((d) => d.row);
  }, [
    decorated,
    favOnly,
    favs,
    color,
    type,
    set,
    sort,
    dir,
    deckFilter,
    deckUsage,
  ]);

  function clearAll() {
    setFavOnly(false);
    setColor('all');
    setType('all');
    setSet('all');
  }

  return {
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
    setOptions,
    visible,
    clearAll,
  };
}
