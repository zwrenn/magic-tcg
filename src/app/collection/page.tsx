import { requireUser } from "@/lib/auth";
import { collectionTotals, searchUserCollection } from "@/lib/search";
import { CardThumb } from "@/components/card-thumb";

const LIMIT = 200;

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q = "" } = await searchParams;
  const [totals, rows] = await Promise.all([
    collectionTotals(user.id),
    searchUserCollection(user.id, q, LIMIT),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">{user.name}&apos;s cards</h1>
      <p className="mt-1 text-sm text-muted">
        {totals.distinct.toLocaleString()} distinct ·{" "}
        {totals.total.toLocaleString()} total cards
      </p>

      <form className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search your cards by name…"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
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
        <>
          {q && rows.length === LIMIT && (
            <p className="mt-4 text-xs text-muted">
              Showing first {LIMIT}. Refine your search to narrow it down.
            </p>
          )}
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {rows.map((r, i) => (
              <li key={`${r.name}-${r.foil}-${i}`} className="flex items-center gap-3 px-3 py-2">
                <CardThumb name={r.name} image={r.image} />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{r.name}</span>
                  {r.typeLine && (
                    <div className="text-xs text-muted">{r.typeLine}</div>
                  )}
                </div>
                <div className="text-right text-sm">
                  <span className="font-medium">×{r.quantity}</span>
                  {r.foil && <span className="ml-1 text-accent" title="foil">✦</span>}
                  {r.condition && (
                    <div className="text-[11px] text-muted">{r.condition}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
