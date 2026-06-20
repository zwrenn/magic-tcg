import { requireUser } from '@/lib/auth';
import {
  advancedSearch,
  hasAdvancedFilters,
  type AdvancedFilters,
  type AdvancedResult,
} from '@/lib/search/advancedSearch';
import { getFavorites } from '@/lib/favorites';
import { getDeckUsage } from '@/lib/decks';
import { getPendingOutgoingKeys } from '@/lib/requests';
import { parseQuery } from '@/lib/search/queryParser';
import { POD_MEMBERS } from '@/lib/pod';
import { SearchHotkey } from '@/components/search-hotkey';
import { Pagination } from '@/components/Pagination';
import { SearchResults, type SearchResultItem } from './search-results';
import { SearchPanel } from './SearchPanel';

const LIMIT = 40;

function ownerDecksMap(
  decks: { owner: string; id: number; name: string }[]
): Record<string, { id: number; name: string }[]> {
  const m: Record<string, { id: number; name: string }[]> = {};
  for (const d of decks) (m[d.owner] ??= []).push({ id: d.id, name: d.name });
  return m;
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? '';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const viewer = await requireUser();
  const sp = await searchParams;

  const rawQuery = one(sp.q);
  const defaultSort = one(sp.sort) || 'name';
  const defaultDir = (one(sp.dir) || 'asc') as 'asc' | 'desc';
  const defaultOwner = one(sp.owner) || 'anyone';
  const page = Math.max(1, parseInt(one(sp.page) || '1', 10) || 1);

  const parsed = parseQuery(rawQuery);

  const filters: AdvancedFilters = {
    name: parsed.name || undefined,
    type: parsed.typeLine || undefined,
    colors: parsed.colors.join('') || undefined,
    colorMode: parsed.colorMode,
    colorless: parsed.colorless || undefined,
    rarity: parsed.rarity || undefined,
    cmc: parsed.cmc ? Number(parsed.cmc) : undefined,
    cmcOp: parsed.cmcOp,
    owner: defaultOwner,
    sort: defaultSort as AdvancedFilters['sort'],
    sortDir: defaultDir,
    page,
    limit: LIMIT,
  };

  const [favorites, deckUsage, pendingAsks] = await Promise.all([
    getFavorites(viewer.id),
    getDeckUsage(),
    getPendingOutgoingKeys(viewer.id),
  ]);
  const pendingSet = new Set(pendingAsks);

  let results: AdvancedResult[] = [];
  let total = 0;
  const ran = hasAdvancedFilters(filters);
  if (ran) {
    ({ results, total } = await advancedSearch(filters));
  }

  const items: SearchResultItem[] = results.map((r) => ({
    normalizedName: r.normalizedName,
    name: r.name,
    image: r.image,
    owners: r.owners,
    typeLine: r.typeLine,
    cmc: r.cmc,
    colorIdentity: r.colorIdentity,
    rarity: r.rarity,
    setCode: r.setCode,
    priceUsd: r.priceUsd,
    decksByOwner: ownerDecksMap(deckUsage[r.normalizedName] ?? []),
    alreadyAsked: r.owners
      .filter((o) => pendingSet.has(`${r.normalizedName}::${o.name}`))
      .map((o) => o.name),
    favorite: favorites.has(r.normalizedName),
    advanced: true,
  }));

  // Base URL for pagination links — all current params except page.
  const baseUrlParams = new URLSearchParams();
  if (rawQuery) baseUrlParams.set('q', rawQuery);
  if (defaultSort !== 'name') baseUrlParams.set('sort', defaultSort);
  if (defaultDir !== 'asc') baseUrlParams.set('dir', defaultDir);
  if (defaultOwner !== 'anyone') baseUrlParams.set('owner', defaultOwner);
  const baseUrl = `/search?${baseUrlParams}`;

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <SearchHotkey />
      <h1 className="t-hero text-2xl">Who has it?</h1>
      <p className="mt-1 text-sm text-muted">
        Search every collection in the pod at once. Tip: press{' '}
        <kbd className="rounded border border-border bg-surface-2 px-1">/</kbd>{' '}
        to focus search.
      </p>

      <SearchPanel
        defaultQuery={rawQuery}
        defaultSort={defaultSort}
        defaultDir={defaultDir}
        defaultOwner={defaultOwner}
        podMembers={POD_MEMBERS}
        viewerName={viewer.name}
      />

      {ran && total === 0 && (
        <p className="mt-8 text-sm text-muted">
          Nothing in the pod matches those filters.
        </p>
      )}

      {total > 0 && (
        <>
          <p className="mt-6 text-xs text-muted">
            {total.toLocaleString()} card{total === 1 ? '' : 's'}
            {totalPages > 1 && (
              <>
                {' '}
                &middot; page {page} of {totalPages}
              </>
            )}
            {' · '}click a card, then use ← → to browse
          </p>
          <SearchResults items={items} viewerName={viewer.name} />
          <Pagination page={page} totalPages={totalPages} baseUrl={baseUrl} />
        </>
      )}
    </main>
  );
}
