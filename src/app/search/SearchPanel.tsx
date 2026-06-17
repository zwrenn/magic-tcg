'use client';

import { useRouter } from 'next/navigation';
import { SearchInput } from '@/components/SearchInput';

interface SearchPanelProps {
  defaultQuery: string;
}

export function SearchPanel({ defaultQuery }: SearchPanelProps) {
  const router = useRouter();

  function handleSubmit(rawQuery: string) {
    if (!rawQuery.trim()) {
      router.push('/search');
      return;
    }
    router.push(`/search?q=${encodeURIComponent(rawQuery.trim())}`);
  }

  return (
    <div className="mt-5">
      <SearchInput
        defaultQuery={defaultQuery}
        onSubmit={handleSubmit}
        submitLabel="Search"
      />
    </div>
  );
}
