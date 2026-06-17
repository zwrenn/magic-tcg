import { requireUser } from '@/lib/auth';
import {
  advancedSearch,
  hasAdvancedFilters,
  type AdvancedFilters,
  type AdvancedResult,
} from '@/lib/search/advancedSearch';
import type { GlobalSearchResult } from '@/lib/search/globalSearch';
import { getFavorites } from '@/lib/favorites';
import { getDeckUsage } from '@/lib/decks';
import { getPendingOutgoingKeys } from '@/lib/requests';
import { POD_MEMBERS } from '@/lib/pod';
import { SearchHotkey } from '@/components/search-hotkey';
import { SearchResults, type SearchResultItem } from './search-results';
import { SearchPanel } from './SearchPanel';
import type { AdvancedSearchValues } from '@/components/AdvancedSearchForm';

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

  const colorArr = Array.isArray(sp.color)
    ? sp.color
    : sp.color
      ? [sp.color]
      : [];

  const filters: AdvancedFilters = {
    name: one(sp.q),
    type: one(sp.type),
    colors: colorArr.join(''),
    colorMode: (one(sp.colormode) ||
      'including') as AdvancedFilters['colorMode'],
    colorless: one(sp.colorless) === '1',
    rarity: one(sp.rarity),
    cmc: one(sp.cmc) ? Number(one(sp.cmc)) : undefined,
    cmcOp: (one(sp.cmcop) || 'eq') as AdvancedFilters['cmcOp'],
    owner: one(sp.owner) || 'anyone',
    sort: (one(sp.sort) || 'name') as AdvancedFilters['sort'],
  };

  // Shape for the client AdvancedSearchForm component.
  const formValues: AdvancedSearchValues = {
    name: filters.name ?? '',
    typeLine: filters.type ?? '',
    colors: colorArr,
    colorMode: filters.colorMode ?? 'including',
    colorless: filters.colorless ?? false,
    rarity: filters.rarity ?? '',
    cmc: filters.cmc != null ? String(filters.cmc) : '',
    cmcOp: filters.cmcOp ?? 'eq',
  };

  const [favorites, deckUsage, pendingAsks] = await Promise.all([
    getFavorites(viewer.id),
    getDeckUsage(),
    getPendingOutgoingKeys(viewer.id),
  ]);
  const pendingSet = new Set(pendingAsks);

  let results: (GlobalSearchResult | AdvancedResult)[] = [];
  const ran = hasAdvancedFilters(filters);
  if (ran) {
    results = await advancedSearch(filters);
  }

  const items: SearchResultItem[] = results.map((r) => {
    const adv = 'typeLine' in r ? (r as AdvancedResult) : null;
    return {
      normalizedName: r.normalizedName,
      name: r.name,
      image: r.image,
      owners: r.owners,
      typeLine: adv?.typeLine ?? null,
      cmc: adv?.cmc ?? null,
      colorIdentity: adv?.colorIdentity ?? null,
      rarity: adv?.rarity ?? null,
      setCode: adv?.setCode ?? null,
      priceUsd: adv?.priceUsd ?? null,
      decksByOwner: ownerDecksMap(deckUsage[r.normalizedName] ?? []),
      alreadyAsked: r.owners
        .filter((o) => pendingSet.has(`${r.normalizedName}::${o.name}`))
        .map((o) => o.name),
      favorite: favorites.has(r.normalizedName),
      advanced: Boolean(adv),
    };
  });

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
        defaultValues={formValues}
        defaultSort={filters.sort ?? 'name'}
        defaultOwner={filters.owner ?? 'anyone'}
        podMembers={POD_MEMBERS}
        viewerName={viewer.name}
      />

      {ran && results.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          Nothing in the pod matches those filters.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="mt-6 text-xs text-muted">
            {results.length} card{results.length === 1 ? '' : 's'}
            {results.length >= 80 ? ' (showing first 80)' : ''}
            {' · '}click a card, then use ← → to browse
          </p>
          <SearchResults items={items} viewerName={viewer.name} />
        </>
      )}
    </main>
  );
}
