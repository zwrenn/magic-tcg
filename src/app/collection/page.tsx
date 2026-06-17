import { Suspense } from 'react';
import { requireUser } from '@/lib/auth';
import { collectionTotals } from '@/lib/search/collection';
import { CollectionViewLoader } from './components/CollectionViewLoader';
import { AddCardPanel } from './components/AddCardPanel';
import { ClearCollectionButton } from './components/ClearCollectionButton';
import { SearchHotkey } from '@/components/search-hotkey';
import { gridListRowClass } from './components/constants';

function CollectionGridSkeleton() {
  return (
    <div className="mt-5">
      <ul className={`grid gap-3 ${gridListRowClass}`}>
        {Array.from({ length: 24 }).map((_, i) => (
          <li
            key={i}
            className="aspect-[488/680] animate-pulse rounded-lg bg-surface-2"
          />
        ))}
      </ul>
    </div>
  );
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q = '' } = await searchParams;
  const totals = await collectionTotals(user.id);

  let content: React.ReactNode;
  if (totals.distinct === 0) {
    content = (
      <p className="mt-8 text-sm text-muted">
        No cards yet —{' '}
        <a href="/import" className="text-accent hover:underline">
          import your ManaBox CSV
        </a>
        .
      </p>
    );
  } else {
    content = (
      <Suspense fallback={<CollectionGridSkeleton />}>
        <CollectionViewLoader userId={user.id} q={q} total={totals.distinct} />
      </Suspense>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <SearchHotkey />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.name}&apos;s cards
          </h1>
          <p className="mt-1 text-sm text-muted">
            {totals.distinct.toLocaleString()} distinct ·{' '}
            {totals.total.toLocaleString()} total ·{' '}
            <span className="text-foreground">
              ~$
              {totals.valueUsd.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>{' '}
            est. value
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddCardPanel />
          {totals.distinct > 0 && (
            <ClearCollectionButton count={totals.distinct} />
          )}
        </div>
      </div>

      <form className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search your cards by name…  (press / )"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
          Search
        </button>
      </form>

      {content}
    </main>
  );
}
