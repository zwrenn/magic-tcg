import { requireUser } from "@/lib/auth";
import { collectionTotals, searchUserCollection } from "@/lib/search";
import { getFavorites } from "@/lib/favorites";
import { CollectionView } from "./collection-view";
import { AddCardPanel } from "./add-card-panel";
import { ClearCollectionButton } from "./clear-collection-button";
import { SearchHotkey } from "@/components/search-hotkey";

// High cap so color/type/set filtering works across the whole collection
// (client-side). Covers any realistic personal collection.
const LIMIT = 5000;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const [totals, rows, favorites] = await Promise.all([
    collectionTotals(user.id),
    searchUserCollection(user.id, q, LIMIT),
    getFavorites(user.id),
  ]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <SearchHotkey />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {user.name}&apos;s cards
          </h1>
          <p className="mt-1 text-sm text-muted">
            {totals.distinct.toLocaleString()} distinct ·{" "}
            {totals.total.toLocaleString()} total ·{" "}
            <span className="text-foreground">
              ~$
              {totals.valueUsd.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
            </span>{" "}
            est. value
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddCardPanel />
          {totals.distinct > 0 && <ClearCollectionButton count={totals.distinct} />}
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

      {totals.distinct === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No cards yet —{" "}
          <a href="/import" className="text-accent hover:underline">
            import your ManaBox CSV
          </a>
          .
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No cards match “{q}”.</p>
      ) : (
        <div className="mt-5">
          <CollectionView
            rows={rows}
            total={totals.distinct}
            limit={LIMIT}
            query={q}
            favorites={[...favorites]}
          />
        </div>
      )}
    </main>
  );
}
