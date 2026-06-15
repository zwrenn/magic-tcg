import { requireUser } from "@/lib/auth";
import {
  globalSearch,
  advancedSearch,
  hasAdvancedFilters,
  type AdvancedFilters,
  type GlobalSearchResult,
  type AdvancedResult,
} from "@/lib/search";
import { getFavorites } from "@/lib/favorites";
import { getDeckUsage } from "@/lib/decks";
import { getPendingOutgoingKeys } from "@/lib/requests";
import { POD_MEMBERS } from "@/lib/pod";
import { CardZoomButton } from "@/components/card-zoom";
import { FavoriteStar } from "@/components/favorite-star";
import { QuickAddButton } from "@/components/quick-add-button";
import { SearchHotkey } from "@/components/search-hotkey";
import { ColorDots } from "@/components/mana";
import { SetSymbol } from "@/components/set-symbol";
import { SearchOwnerChips } from "./owner-chips";

function ownerDecksMap(
  decks: { owner: string; id: number; name: string }[],
): Record<string, { id: number; name: string }[]> {
  const m: Record<string, { id: number; name: string }[]> = {};
  for (const d of decks) (m[d.owner] ??= []).push({ id: d.id, name: d.name });
  return m;
}

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const viewer = await requireUser();
  const sp = await searchParams;

  const isAdvanced = one(sp.adv) === "1";

  // Advanced filter parsing.
  const colorArr = Array.isArray(sp.color) ? sp.color : sp.color ? [sp.color] : [];
  const filters: AdvancedFilters = {
    name: one(sp.q),
    type: one(sp.type),
    colors: colorArr.join(""),
    colorMode: (one(sp.colormode) || "including") as AdvancedFilters["colorMode"],
    colorless: one(sp.colorless) === "1",
    rarity: one(sp.rarity),
    cmc: one(sp.cmc) ? Number(one(sp.cmc)) : undefined,
    cmcOp: (one(sp.cmcop) || "eq") as AdvancedFilters["cmcOp"],
    owner: one(sp.owner) || "anyone",
    sort: (one(sp.sort) || "name") as AdvancedFilters["sort"],
  };

  const q = one(sp.q);

  const [favorites, deckUsage, pendingAsks] = await Promise.all([
    getFavorites(viewer.id),
    getDeckUsage(),
    getPendingOutgoingKeys(viewer.id),
  ]);
  const pendingSet = new Set(pendingAsks);

  let results: (GlobalSearchResult | AdvancedResult)[] = [];
  let ran = false;
  if (isAdvanced && hasAdvancedFilters(filters)) {
    results = await advancedSearch(filters);
    ran = true;
  } else if (!isAdvanced && q.trim()) {
    results = await globalSearch(q);
    ran = true;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <SearchHotkey />
      <h1 className="t-hero text-2xl">Who has it?</h1>
      <p className="mt-1 text-sm text-muted">
        Search every collection in the pod at once. Tip: press{" "}
        <kbd className="rounded border border-border bg-surface-2 px-1">/</kbd> to
        focus search.
      </p>

      {/* Simple name search */}
      <form className="mt-5 flex gap-2">
        <input
          name="q"
          defaultValue={isAdvanced ? "" : q}
          autoFocus
          placeholder="e.g. Smothering Tithe"
          className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button className="gel gel-green">Search</button>
      </form>

      {/* Advanced search */}
      <details open={isAdvanced} className="module mt-3 overflow-hidden">
        <summary className="cursor-pointer select-none px-4 py-2.5 font-semibold text-[var(--purple-deep)]">
          ⚙ Advanced search
        </summary>
        <form className="space-y-3 border-t border-border p-4">
          <input type="hidden" name="adv" value="1" />

          <Field label="Card name">
            <input name="q" defaultValue={isAdvanced ? q : ""} placeholder="part of a name" className="input" />
          </Field>

          <Field label="Type line">
            <input
              name="type"
              defaultValue={filters.type}
              placeholder="e.g. legendary creature"
              className="input"
            />
          </Field>

          <Field label="Color identity">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {(["W", "U", "B", "R", "G"] as const).map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-1 text-sm">
                    <input type="checkbox" name="color" value={c} defaultChecked={colorArr.includes(c)} className="accent-[var(--purple)]" />
                    <i className={`ms ms-${c.toLowerCase()} ms-cost`} aria-hidden /> {c}
                  </label>
                ))}
              </div>
              <select name="colormode" defaultValue={filters.colorMode} className="rounded-lg border border-border bg-surface px-2 py-1 text-sm">
                <option value="including">including these</option>
                <option value="exact">exactly these</option>
                <option value="atmost">at most these</option>
              </select>
              <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                <input type="checkbox" name="colorless" value="1" defaultChecked={filters.colorless} className="accent-[var(--purple)]" />
                Colorless only
              </label>
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Rarity">
              <select name="rarity" defaultValue={filters.rarity} className="input">
                <option value="">Any</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="mythic">Mythic</option>
              </select>
            </Field>
            <Field label="Mana value">
              <div className="flex gap-1.5">
                <select name="cmcop" defaultValue={filters.cmcOp} className="input !w-auto">
                  <option value="eq">=</option>
                  <option value="lte">≤</option>
                  <option value="gte">≥</option>
                </select>
                <input name="cmc" type="number" min="0" defaultValue={filters.cmc ?? ""} placeholder="any" className="input" />
              </div>
            </Field>
            <Field label="Owned by">
              <select name="owner" defaultValue={filters.owner} className="input">
                <option value="anyone">Anyone</option>
                <option value="everyone">Everyone in the pod</option>
                <option value="2">At least 2 of us</option>
                <option value="3">At least 3 of us</option>
                {POD_MEMBERS.map((m) => (
                  <option key={m} value={m}>{m === viewer.name ? "Me" : m}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <Field label="Sort">
              <select name="sort" defaultValue={filters.sort} className="input !w-auto">
                <option value="name">Name</option>
                <option value="cmc">Mana value</option>
                <option value="price">Price</option>
              </select>
            </Field>
            <button className="gel gel-purple mt-5">⚙ Run advanced search</button>
          </div>
        </form>
      </details>

      {ran && results.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          Nothing in the pod matches{isAdvanced ? " those filters" : ` “${q}”`}.
        </p>
      )}

      {results.length > 0 && (
        <>
          <p className="mt-6 text-xs text-muted">
            {results.length} card{results.length === 1 ? "" : "s"}
            {isAdvanced && results.length >= 80 ? " (showing first 80)" : ""}
          </p>
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {results.map((r) => {
              const decks = deckUsage[r.normalizedName] ?? [];
              const adv = "typeLine" in r ? (r as AdvancedResult) : null;
              return (
                <li key={r.normalizedName} className="flex items-start gap-3 px-3 py-2">
                  <CardZoomButton name={r.name} image={r.image} holo={r.owners.some((o) => o.foil)} className="shrink-0">
                    {r.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.image} alt={r.name} loading="lazy" className="h-12 w-9 rounded-[3px] border border-border object-cover" />
                    ) : (
                      <span className="grid h-12 w-9 place-items-center rounded-[3px] border border-border bg-surface-2 text-[8px] text-muted">no img</span>
                    )}
                  </CardZoomButton>
                  <FavoriteStar name={r.name} initial={favorites.has(r.normalizedName)} className="mt-1 text-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <CardZoomButton
                        name={r.name}
                        image={r.image}
                        holo={r.owners.some((o) => o.foil)}
                        className="min-w-0 flex-1 truncate text-left font-medium hover:text-accent"
                      >
                        {r.name}
                      </CardZoomButton>
                      <SearchOwnerChips
                        cardName={r.name}
                        owners={r.owners}
                        viewerName={viewer.name}
                        decksByOwner={ownerDecksMap(decks)}
                        alreadyAsked={r.owners
                          .filter((o) => pendingSet.has(`${r.normalizedName}::${o.name}`))
                          .map((o) => o.name)}
                      />
                    </div>
                    {adv && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                        <ColorDots identity={adv.colorIdentity} />
                        <SetSymbol setCode={adv.setCode} rarity={adv.rarity} className="text-sm" />
                        {adv.typeLine ?? ""}
                        {adv.cmc != null ? ` · MV ${adv.cmc}` : ""}
                        {adv.priceUsd ? ` · $${adv.priceUsd}` : ""}
                      </div>
                    )}
                  </div>
                  <QuickAddButton name={r.name} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="t-label mb-1 block">{label}</span>
      {children}
    </label>
  );
}
