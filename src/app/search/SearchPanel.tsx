'use client';

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
}: SearchPanelProps) {
  const router = useRouter();

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

  function handleSubmit(v: AdvancedSearchValues) {
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
    if (v.owner && v.owner !== 'anyone') sp.set('owner', v.owner);
    if (v.sort && v.sort !== 'name') sp.set('sort', v.sort);
    router.push(`/search?${sp}`);
  }

  return (
    <div className="mt-5">
      <AdvancedSearchForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        submitLabel="Search"
        sortInForm={{
          defaultValue: defaultSort,
          options: SORT_OPTIONS,
        }}
        ownerInForm={{
          defaultValue: defaultOwner,
          options: ownerOptions,
        }}
      />
    </div>
  );
}
