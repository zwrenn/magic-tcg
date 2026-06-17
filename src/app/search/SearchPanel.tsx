'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AdvancedSearchForm,
  type AdvancedSearchValues,
} from '@/components/AdvancedSearchForm';

interface SearchPanelProps {
  defaultValues: AdvancedSearchValues;
  defaultSort: string;
  defaultOwner: string;
  podMembers: readonly string[];
  viewerName: string;
  isAdvanced: boolean;
  simpleQ: string;
}

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'cmc', label: 'Mana value' },
  { value: 'price', label: 'Price' },
];

export function SearchPanel({
  defaultValues,
  defaultSort,
  defaultOwner,
  podMembers,
  viewerName,
  isAdvanced,
  simpleQ,
}: SearchPanelProps) {
  const router = useRouter();
  const [values, setValues] = useState<AdvancedSearchValues>(defaultValues);
  const [sort, setSort] = useState(defaultSort);
  const [owner, setOwner] = useState(defaultOwner);

  const ownerOptions = [
    { value: 'anyone', label: 'Anyone' },
    { value: 'everyone', label: 'Everyone in the pod' },
    { value: '2', label: 'At least 2 of us' },
    { value: '3', label: 'At least 3 of us' },
    ...podMembers.map((m) => ({
      value: m,
      label: m === viewerName ? 'Me' : m,
    })),
  ];

  function handleAdvancedSubmit(v: AdvancedSearchValues) {
    const sp = new URLSearchParams();
    sp.set('adv', '1');
    if (v.name) sp.set('q', v.name);
    if (v.typeLine) sp.set('type', v.typeLine);
    v.colors.forEach((c) => sp.append('color', c));
    if (v.colorMode !== 'including') sp.set('colormode', v.colorMode);
    if (v.colorless) sp.set('colorless', '1');
    if (v.rarity) sp.set('rarity', v.rarity);
    if (v.cmc) {
      sp.set('cmc', v.cmc);
      sp.set('cmcop', v.cmcOp);
    }
    if (owner !== 'anyone') sp.set('owner', owner);
    if (sort !== 'name') sp.set('sort', sort);
    router.push(`/search?${sp}`);
  }

  return (
    <>
      {/* Simple name search */}
      <form className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={isAdvanced ? '' : simpleQ}
          autoFocus={!isAdvanced}
          placeholder="e.g. Smothering Tithe"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button className="gel gel-green">Search</button>
      </form>

      {/* Advanced search */}
      <details open={isAdvanced} className="module mt-3 overflow-hidden">
        <summary className="cursor-pointer px-4 py-2.5 font-semibold text-(--purple-deep) select-none">
          ⚙ Advanced search
        </summary>
        <div className="border-t border-border p-4">
          <AdvancedSearchForm
            values={values}
            onChange={setValues}
            onSubmit={handleAdvancedSubmit}
            submitLabel="⚙ Run advanced search"
            sortInForm={{
              value: sort,
              options: SORT_OPTIONS,
              onChange: setSort,
            }}
            ownerInForm={{
              value: owner,
              options: ownerOptions,
              onChange: setOwner,
            }}
          />
        </div>
      </details>
    </>
  );
}
