import { searchUserCollection } from '@/lib/search';
import { getFavorites } from '@/lib/favorites';
import { getDeckUsage } from '@/lib/decks';
import { CollectionView } from './CollectionView';

// High cap so color/type/set filtering works across the whole collection
// (client-side). Covers any realistic personal collection.
export const COLLECTION_LIMIT = 5000;

interface CollectionViewLoaderProps {
  userId: number;
  q: string;
  total: number;
}

export async function CollectionViewLoader({
  userId,
  q,
  total,
}: CollectionViewLoaderProps) {
  const [rows, favorites, deckUsage] = await Promise.all([
    searchUserCollection(userId, q, COLLECTION_LIMIT),
    getFavorites(userId),
    getDeckUsage(),
  ]);

  if (rows.length === 0) {
    return (
      <p className="mt-8 text-sm text-muted">
        No cards match &ldquo;{q}&rdquo;.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <CollectionView
        rows={rows}
        total={total}
        limit={COLLECTION_LIMIT}
        query={q}
        favorites={[...favorites]}
        deckUsage={deckUsage}
      />
    </div>
  );
}
