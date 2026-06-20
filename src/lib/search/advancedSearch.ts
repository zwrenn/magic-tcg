import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { normalizeName } from '../normalize';
import type { OwnerHolding } from '../matcher';
import type { GlobalSearchResult } from './globalSearch';

export type AdvancedFilters = {
  name?: string;
  type?: string; // matched word-by-word against the type line
  colors?: string; // subset of "WUBRG"
  colorMode?: 'including' | 'exact' | 'atmost';
  colorless?: boolean; // colorless identity only
  rarity?: string; // common | uncommon | rare | mythic
  cmc?: number;
  cmcOp?: 'eq' | 'lte' | 'gte';
  /** "anyone" | a member name | "everyone" | "2" | "3" (≥N owners) */
  owner?: string;
  sort?: 'name' | 'cmc' | 'price';
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
};

// Extends GlobalSearchResult with card-detail fields that only advanced search returns.
export type AdvancedResult = GlobalSearchResult & {
  typeLine: string | null;
  cmc: number | null;
  colorIdentity: string | null;
  rarity: string | null;
  setCode: string | null;
  priceUsd: string | null;
};

export type AdvancedSearchResponse = {
  results: AdvancedResult[];
  total: number;
};

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;

/** Returns true when any filter beyond the default "show everything" state is active. */
export function hasAdvancedFilters(f: AdvancedFilters): boolean {
  return Boolean(
    f.name ||
    f.type ||
    f.colors ||
    f.colorless ||
    f.rarity ||
    f.cmc != null ||
    (f.owner && f.owner !== 'anyone')
  );
}

/**
 * Builds a correlated SQL condition that restricts cards by ownership.
 * All subqueries correlate on `cards.normalized_name` (the outer query's column).
 * Returns undefined for "anyone" — the INNER JOIN with collection_items already
 * guarantees ownership in that case.
 */
function buildOwnerCond(
  owner: string | undefined
): ReturnType<typeof sql> | undefined {
  if (!owner || owner === 'anyone') return undefined;

  if (owner === 'everyone') {
    // Card must be owned by every player who has any collection entry.
    return sql`(
      SELECT COUNT(DISTINCT ci2.user_id)
      FROM collection_items ci2
      JOIN cards c2 ON c2.id = ci2.card_id
      WHERE c2.normalized_name = cards.normalized_name
    ) >= (SELECT COUNT(DISTINCT user_id) FROM collection_items)`;
  }

  const n = Number(owner);
  if (!isNaN(n)) {
    // Card must be owned by at least N distinct players.
    return sql`(
      SELECT COUNT(DISTINCT ci2.user_id)
      FROM collection_items ci2
      JOIN cards c2 ON c2.id = ci2.card_id
      WHERE c2.normalized_name = cards.normalized_name
    ) >= ${n}`;
  }

  // Card must be owned by a specific named player.
  return sql`EXISTS (
    SELECT 1
    FROM collection_items ci2
    JOIN cards c2 ON c2.id = ci2.card_id
    JOIN users u2 ON u2.id = ci2.user_id
    WHERE c2.normalized_name = cards.normalized_name
      AND u2.name = ${owner}
  )`;
}

/**
 * Scryfall-style search over the pod's combined collection.
 *
 * Two-query approach:
 *   1. Inner query: DISTINCT ON (normalized_name) with all card-attribute filters
 *      and correlated owner-filter subqueries applied — gives one representative
 *      row per matching card, with deduplication preferring cards that have images.
 *   2. Outer query: ORDER BY the requested sort field, LIMIT/OFFSET for the page.
 *      A parallel COUNT(*) on the same inner query gives the total for pagination.
 *   3. Ownership detail query: fetches the per-owner breakdown for only the
 *      cards on the current page (not the whole result set).
 *
 * All filtering and sorting is done in the database — JS is only responsible
 * for assembling the final result shape.
 */
export async function advancedSearch(
  f: AdvancedFilters
): Promise<AdvancedSearchResponse> {
  const limit = f.limit ?? 40;
  const page = Math.max(1, f.page ?? 1);
  const offset = (page - 1) * limit;
  const sort = f.sort ?? 'name';
  const dir = f.sortDir ?? 'asc';

  // ── Card attribute filter conditions ──────────────────────────────────────
  const conds = [] as ReturnType<typeof sql>[];

  if (f.name) {
    const n = normalizeName(f.name);
    if (n)
      conds.push(sql`${schema.cards.normalizedName} ILIKE ${'%' + n + '%'}`);
  }
  if (f.type) {
    for (const word of f.type.trim().split(/\s+/).filter(Boolean)) {
      conds.push(sql`${schema.cards.typeLine} ILIKE ${'%' + word + '%'}`);
    }
  }
  if (f.rarity) {
    conds.push(sql`lower(${schema.cards.rarity}) = ${f.rarity.toLowerCase()}`);
  }
  if (f.cmc != null && Number.isFinite(f.cmc)) {
    if (f.cmcOp === 'lte') conds.push(sql`${schema.cards.cmc} <= ${f.cmc}`);
    else if (f.cmcOp === 'gte')
      conds.push(sql`${schema.cards.cmc} >= ${f.cmc}`);
    else conds.push(sql`${schema.cards.cmc} = ${f.cmc}`);
  }

  const ci = schema.cards.colorIdentity;
  if (f.colorless) {
    conds.push(sql`coalesce(${ci}, '') = ''`);
  } else if (f.colors) {
    const sel = new Set(
      f.colors
        .toUpperCase()
        .split('')
        .filter((c) => WUBRG.includes(c as never))
    );
    const mode = f.colorMode ?? 'including';
    for (const c of WUBRG) {
      const has = sel.has(c);
      if (mode === 'including') {
        if (has) conds.push(sql`${ci} ILIKE ${'%' + c + '%'}`);
      } else if (mode === 'exact') {
        conds.push(
          has
            ? sql`${ci} ILIKE ${'%' + c + '%'}`
            : sql`${ci} NOT ILIKE ${'%' + c + '%'}`
        );
      } else {
        // atmost: selected colors are optional, unselected are forbidden
        if (!has)
          conds.push(sql`coalesce(${ci}, '') NOT ILIKE ${'%' + c + '%'}`);
      }
    }
  }

  const ownerCond = buildOwnerCond(f.owner);
  const allConds = ownerCond ? [...conds, ownerCond] : conds;
  const where = allConds.length ? and(...allConds) : undefined;

  // ── Inner subquery: one row per card, image-preferring ────────────────────
  // DISTINCT ON requires the first ORDER BY column to match the distinct key.
  // The actual user-facing sort happens in the outer query.
  const inner = db
    .selectDistinctOn([schema.cards.normalizedName], {
      normalizedName: schema.cards.normalizedName,
      name: schema.cards.name,
      image: schema.cards.imageUri,
      typeLine: schema.cards.typeLine,
      cmc: schema.cards.cmc,
      colorIdentity: schema.cards.colorIdentity,
      rarity: schema.cards.rarity,
      setCode: schema.cards.setCode,
      priceUsd: schema.cards.pricesUsd,
    })
    .from(schema.cards)
    .innerJoin(
      schema.collectionItems,
      eq(schema.collectionItems.cardId, schema.cards.id)
    )
    .where(where)
    .orderBy(schema.cards.normalizedName, sql`${schema.cards.imageUri} is null`)
    .as('best_cards');

  // ── Outer ORDER BY ────────────────────────────────────────────────────────
  const nameCol = dir === 'desc' ? desc(inner.name) : asc(inner.name);
  type OrderTerm = ReturnType<typeof asc> | ReturnType<typeof sql>;
  let orderBy: OrderTerm[];

  switch (sort) {
    case 'cmc':
      orderBy = [
        dir === 'desc'
          ? sql`${inner.cmc} desc nulls last`
          : sql`${inner.cmc} asc nulls last`,
        asc(inner.name),
      ];
      break;
    case 'price':
      orderBy = [
        dir === 'desc'
          ? sql`${inner.priceUsd}::numeric desc nulls last`
          : sql`${inner.priceUsd}::numeric asc nulls last`,
        asc(inner.name),
      ];
      break;
    default: // name
      orderBy = [nameCol];
  }

  // ── Run paginated results + total count in parallel ───────────────────────
  const [candidates, [countRow]] = await Promise.all([
    db
      .select()
      .from(inner)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(inner),
  ]);

  const total = countRow?.total ?? 0;
  if (candidates.length === 0) return { results: [], total };

  // ── Ownership detail query (current page only) ────────────────────────────
  const names = candidates.map((c) => c.normalizedName);
  const ownership = await db
    .select({
      normalizedName: schema.cards.normalizedName,
      userName: schema.users.name,
      qty: sql<number>`sum(${schema.collectionItems.quantity})::int`,
      anyFoil: sql<boolean>`bool_or(${schema.collectionItems.foil})`,
    })
    .from(schema.collectionItems)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.collectionItems.cardId))
    .innerJoin(schema.users, eq(schema.users.id, schema.collectionItems.userId))
    .where(inArray(schema.cards.normalizedName, names))
    .groupBy(schema.cards.normalizedName, schema.users.name);

  const ownersByCard = new Map<string, OwnerHolding[]>();
  for (const row of ownership) {
    const list = ownersByCard.get(row.normalizedName) ?? [];
    list.push({ name: row.userName, qty: row.qty, foil: row.anyFoil });
    ownersByCard.set(row.normalizedName, list);
  }

  const results: AdvancedResult[] = candidates.map((c) => ({
    normalizedName: c.normalizedName,
    name: c.name,
    image: c.image,
    typeLine: c.typeLine,
    cmc: c.cmc != null ? Number(c.cmc) : null,
    colorIdentity: c.colorIdentity,
    rarity: c.rarity,
    setCode: c.setCode,
    priceUsd: c.priceUsd,
    owners: (ownersByCard.get(c.normalizedName) ?? []).sort(
      (a, b) => b.qty - a.qty
    ),
  }));

  return { results, total };
}
