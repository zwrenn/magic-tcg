import { requireUser } from '@/lib/auth';
import {
  collectionTotals,
  VALID_SORT_KEYS,
  type SortKey,
} from '@/lib/search/collection';
import { getFavorites } from '@/lib/favorites';
import { getDeckUsage } from '@/lib/decks';
import type { CollectionFilterInit } from './components/useCollectionFilters';
import { CollectionView } from './components/CollectionView';
import { AddCardPanel } from './components/AddCardPanel';
import { ClearCollectionButton } from './components/ClearCollectionButton';
import { SearchHotkey } from '@/components/search-hotkey';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? '';

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const user = await requireUser();
  const [totals, favorites, deckUsage, sp] = await Promise.all([
    collectionTotals(user.id),
    getFavorites(user.id),
    getDeckUsage(),
    searchParams,
  ]);

  const rawSort = one(sp.sort);
  const rawDeck = one(sp.deck);
  const initial: CollectionFilterInit = {
    query: one(sp.q),
    sort: VALID_SORT_KEYS.includes(rawSort as SortKey)
      ? (rawSort as SortKey)
      : 'name',
    dir: one(sp.dir) === 'desc' ? 'desc' : 'asc',
    favOnly: one(sp.fav) === '1',
    deckFilter: (rawDeck === 'in' || rawDeck === 'out' ? rawDeck : 'any') as
      | 'any'
      | 'in'
      | 'out',
    set: one(sp.set) || 'all',
    page: Math.max(1, parseInt(one(sp.page) || '1', 10) || 1),
  };

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

      {totals.distinct === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No cards yet —{' '}
          <a href="/import" className="text-accent hover:underline">
            import your ManaBox CSV
          </a>
          .
        </p>
      ) : (
        <div className="mt-5">
          <CollectionView
            userId={user.id}
            favorites={[...favorites]}
            deckUsage={deckUsage}
            initial={initial}
          />
        </div>
      )}
    </main>
  );
}
