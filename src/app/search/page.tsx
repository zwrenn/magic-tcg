import { requireUser } from "@/lib/auth";
import { globalSearch } from "@/lib/search";
import { getFavorites } from "@/lib/favorites";
import { CardZoomButton } from "@/components/card-zoom";
import { FavoriteStar } from "@/components/favorite-star";
import { SearchHotkey } from "@/components/search-hotkey";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const viewer = await requireUser();
  const { q = "" } = await searchParams;
  const results = q.trim() ? await globalSearch(q) : [];
  const favorites = await getFavorites(viewer.id);
  const label = (name: string) => (name === viewer.name ? "you" : name);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <SearchHotkey />
      <h1 className="text-2xl font-semibold tracking-tight">Who has it?</h1>
      <p className="mt-1 text-sm text-muted">
        Search every collection in the pod at once. Tip: press{" "}
        <kbd className="rounded border border-border bg-surface-2 px-1">/</kbd> to
        focus search.
      </p>

      <form className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="e.g. Smothering Tithe"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
          Search
        </button>
      </form>

      {q.trim() && results.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          Nothing in any collection matches “{q}”.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {results.map((r) => (
            <li key={r.normalizedName} className="flex items-center gap-3 px-3 py-2">
              <CardZoomButton name={r.name} image={r.image} className="shrink-0">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image}
                    alt={r.name}
                    loading="lazy"
                    className="h-12 w-9 rounded-[3px] border border-border object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">
                    no img
                  </span>
                )}
              </CardZoomButton>
              <FavoriteStar
                name={r.name}
                initial={favorites.has(r.normalizedName)}
                className="text-lg"
              />
              <CardZoomButton
                name={r.name}
                image={r.image}
                className="min-w-0 flex-1 truncate text-left font-medium hover:text-accent"
              >
                {r.name}
              </CardZoomButton>
              <div className="flex flex-wrap justify-end gap-1">
                {r.owners.length === 0 ? (
                  <span className="text-xs text-muted">nobody has it</span>
                ) : (
                  r.owners.map((o) => (
                    <span
                      key={o.name}
                      className="rounded-full bg-surface-2 px-2 py-0.5 text-xs"
                      title={o.foil ? "has a foil copy" : undefined}
                    >
                      {label(o.name)} ×{o.qty}
                      {o.foil ? " ✦" : ""}
                    </span>
                  ))
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
