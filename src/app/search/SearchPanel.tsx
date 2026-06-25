'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/SearchInput';
import { Select } from '@/components/Select';
import { Toggle } from '@/components/Toggle';
import { Chip } from '@/components/Chip';
import { QueryChips } from '@/components/QueryChips';
import {
  parseQuery,
  serializeQuery,
  type AdvancedSearchValues,
} from '@/lib/search/queryParser';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'cmc', label: 'Mana value' },
  { value: 'price', label: 'Price' },
];

interface SearchPanelProps {
  defaultQuery: string;
  defaultSort: string;
  defaultDir: 'asc' | 'desc';
  defaultOwner: string;
  podMembers: readonly string[];
  viewerName: string;
}

export function SearchPanel({
  defaultQuery,
  defaultSort,
  defaultDir,
  defaultOwner,
  podMembers,
  viewerName,
}: SearchPanelProps) {
  const router = useRouter();
  const [sort, setSort] = useState(defaultSort);
  const [dir, setDir] = useState(defaultDir);
  const [owner, setOwner] = useState(defaultOwner);

  // Keep local state in sync when URL params change (e.g. query submit preserves sort)
  useEffect(() => setSort(defaultSort), [defaultSort]);
  useEffect(() => setDir(defaultDir), [defaultDir]);
  useEffect(() => setOwner(defaultOwner), [defaultOwner]);

  const ownerOptions = [
    { value: 'anyone', label: 'Anyone' },
    ...podMembers.map((m) => ({
      value: m,
      label: m === viewerName ? 'Me' : m,
    })),
  ];

  function buildUrl(q: string, s: string, d: string, o: string) {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (s !== 'name') sp.set('sort', s);
    if (d !== 'asc') sp.set('dir', d);
    if (o !== 'anyone') sp.set('owner', o);
    const qs = sp.toString();
    return qs ? `/search?${qs}` : '/search';
  }

  function handleQuerySubmit(rawQuery: string) {
    const parsed = parseQuery(rawQuery.trim());
    // Extract sort:/owner: typed into the query box into their dedicated URL params
    const cleanQuery = serializeQuery({
      ...parsed,
      sort: undefined,
      owner: undefined,
    });
    const nextSort = parsed.sort || sort;
    const nextOwner = parsed.owner || owner;
    setSort(nextSort);
    setOwner(nextOwner);
    router.push(buildUrl(cleanQuery, nextSort, dir, nextOwner));
  }

  // Chips derive from the current URL's query string (server-rendered, always in sync).
  const parsedQuery = parseQuery(defaultQuery);

  function handleChipChange(updated: AdvancedSearchValues) {
    const q = serializeQuery({ ...updated, sort: undefined, owner: undefined });
    router.push(buildUrl(q, sort, dir, owner));
  }

  const { name, typeLine, colors, colorless, rarity, cmc } = parsedQuery;
  const hasQueryChips = !!(
    name ||
    typeLine ||
    colors.length ||
    colorless ||
    rarity ||
    cmc
  );
  const showChips = hasQueryChips || owner !== 'anyone';

  return (
    <div className="mt-5 space-y-3">
      <SearchInput
        defaultQuery={defaultQuery}
        onSubmit={handleQuerySubmit}
        submitLabel="Search"
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          label="Sort"
          value={sort}
          onChange={(v) => {
            setSort(v);
            router.push(buildUrl(defaultQuery, v, dir, owner));
          }}
          options={SORT_OPTIONS}
        />
        <div className="flex gap-1 rounded-lg bg-surface-2 p-1 text-xs">
          <Toggle
            active={dir === 'asc'}
            onClick={() => {
              setDir('asc');
              router.push(buildUrl(defaultQuery, sort, 'asc', owner));
            }}
          >
            ↑ Asc
          </Toggle>
          <Toggle
            active={dir === 'desc'}
            onClick={() => {
              setDir('desc');
              router.push(buildUrl(defaultQuery, sort, 'desc', owner));
            }}
          >
            ↓ Desc
          </Toggle>
        </div>
        <Select
          label="Owned by"
          value={owner}
          onChange={(v) => {
            setOwner(v);
            router.push(buildUrl(defaultQuery, sort, dir, v));
          }}
          options={ownerOptions}
        />
      </div>
      {showChips && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <QueryChips values={parsedQuery} onChange={handleChipChange} />
          {owner !== 'anyone' && (
            <Chip
              label={`Owner: ${ownerOptions.find((o) => o.value === owner)?.label ?? owner}`}
              onClear={() => {
                setOwner('anyone');
                router.push(buildUrl(defaultQuery, sort, dir, 'anyone'));
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
