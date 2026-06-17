import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Card, CollectionItem } from '@/db/schema';
import { normalizeName } from '../normalize';

/** Aggregate stats for a user's collection: distinct entries, total copies, and estimated value. */
export async function collectionTotals(
  userId: number
): Promise<{ distinct: number; total: number; valueUsd: number }> {
  const [row] = await db
    .select({
      distinct: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.collectionItems.quantity}), 0)::int`,
      // Foil copies use the foil price when available, falling back to the regular price.
      valueUsd: sql<number>`coalesce(sum(${schema.collectionItems.quantity} * coalesce(case when ${schema.collectionItems.foil} then ${schema.cards.priceUsdFoil} else ${schema.cards.pricesUsd} end, ${schema.cards.pricesUsd})), 0)::float`,
    })
    .from(schema.collectionItems)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.collectionItems.cardId))
    .where(eq(schema.collectionItems.userId, userId));
  return {
    distinct: row?.distinct ?? 0,
    total: row?.total ?? 0,
    valueUsd: row?.valueUsd ?? 0,
  };
}

// Shared between the live query (.select) and the RawCollectionRow type below,
// so the selected columns and their TypeScript types always stay in sync.
// Some keys differ from the schema column names due to aliasing (e.g. imageUri → image).
const COLLECTION_SELECT = {
  id: schema.collectionItems.id,
  name: schema.cards.name,
  normalizedName: schema.cards.normalizedName,
  image: schema.cards.imageUri,
  typeLine: schema.cards.typeLine,
  manaCost: schema.cards.manaCost,
  cmc: schema.cards.cmc,
  colorIdentity: schema.cards.colorIdentity,
  rarity: schema.cards.rarity,
  setCode: schema.cards.setCode,
  setName: schema.cards.setName,
  priceUsd: schema.cards.pricesUsd,
  priceUsdFoil: schema.cards.priceUsdFoil,
  quantity: schema.collectionItems.quantity,
  foil: schema.collectionItems.foil,
  condition: schema.collectionItems.condition,
};

// Each field is typed against its source column so schema changes propagate automatically.
type RawCollectionRow = {
  id: CollectionItem['id'];
  name: Card['name'];
  normalizedName: Card['normalizedName'];
  image: Card['imageUri'];
  typeLine: Card['typeLine'];
  manaCost: Card['manaCost'];
  cmc: Card['cmc']; // Postgres numeric — Drizzle returns string | null
  colorIdentity: Card['colorIdentity'];
  rarity: Card['rarity'];
  setCode: Card['setCode'];
  setName: Card['setName'];
  priceUsd: Card['pricesUsd'];
  priceUsdFoil: Card['priceUsdFoil'];
  quantity: CollectionItem['quantity'];
  foil: CollectionItem['foil'];
  condition: CollectionItem['condition'];
};

// cmc is cast string → number in the result map; priceUsdFoil is stripped there
// (merged into priceUsd for foil copies). Everything else is the raw DB type.
export type CollectionRow = Omit<RawCollectionRow, 'cmc' | 'priceUsdFoil'> & {
  cmc: number | null;
};

// `as const` tuple is the single source of truth: SortKey and VALID_SORT_KEYS
// are both derived from it so they can never drift apart.
const SORT_KEYS = [
  'name',
  'cmc',
  'color',
  'type',
  'quantity',
  'price',
  'set',
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export type CollectionQueryOptions = {
  q?: string;
  // Advanced search-style filters (replace the old color/type bucket params)
  typeLine?: string;
  colors?: string; // joined WUBRG string, e.g. "WU"
  colorMode?: 'including' | 'exact' | 'atmost';
  colorless?: boolean;
  rarity?: string;
  cmc?: number;
  cmcOp?: 'eq' | 'lte' | 'gte';
  // Instant filters
  set?: string | 'all';
  sortBy?: SortKey;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  favOnly?: boolean;
  deckFilter?: 'any' | 'in' | 'out';
};

export type CollectionQueryResult = {
  items: CollectionRow[];
  total: number;
  sets: { value: string; label: string }[];
};

export const VALID_SORT_KEYS: readonly SortKey[] = SORT_KEYS;

/**
 * Builds the ORDER BY clause for a given sort key.
 * Color and type sorts use SQL CASE expressions to assign a numeric bucket order
 * rather than sorting alphabetically on the raw string — this keeps the output
 * consistent with the bucket ordering defined in card-types.ts.
 * All sorts use name as a stable secondary key.
 */
function buildOrderBy(sortBy: SortKey, sortDir: 'asc' | 'desc') {
  const d = sortDir === 'desc' ? desc : asc;
  const nameAsc = asc(schema.cards.name);
  switch (sortBy) {
    case 'cmc':
      return [d(schema.cards.cmc), nameAsc] as const;
    case 'quantity':
      return [d(schema.collectionItems.quantity), nameAsc] as const;
    case 'price': {
      // NULL price means untracked/ultra-rare — treat as high value, not zero.
      const priceExpr = sql<number>`coalesce(${schema.cards.pricesUsd}::numeric, 9999)`;
      return [d(priceExpr), nameAsc] as const;
    }
    case 'set':
      return [d(schema.cards.setName), nameAsc] as const;
    case 'color': {
      // WUBRG order, then multicolor, then colorless.
      const colorOrder = sql<number>`case
        when coalesce(${schema.cards.colorIdentity}, '') = 'W' then 0
        when coalesce(${schema.cards.colorIdentity}, '') = 'U' then 1
        when coalesce(${schema.cards.colorIdentity}, '') = 'B' then 2
        when coalesce(${schema.cards.colorIdentity}, '') = 'R' then 3
        when coalesce(${schema.cards.colorIdentity}, '') = 'G' then 4
        when ${schema.cards.colorIdentity} like '%,%' then 5
        else 6
      end`;
      return [d(colorOrder), nameAsc] as const;
    }
    case 'type': {
      // Priority order mirrors typeBucket() in card-types.ts.
      const typeOrder = sql<number>`case
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%creature%' then 0
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%planeswalker%' then 1
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%instant%' then 2
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%sorcery%' then 3
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%battle%' then 4
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%artifact%' then 5
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%enchantment%' then 6
        when lower(coalesce(${schema.cards.typeLine}, '')) like '%land%' then 7
        else 8
      end`;
      return [d(typeOrder), nameAsc] as const;
    }
    default:
      return [d(schema.cards.name)] as const;
  }
}

/**
 * Query a single user's collection with optional server-side filtering, sorting, and pagination.
 *
 * Fires three queries in parallel:
 *   1. Paginated result rows.
 *   2. Total matching count (for pagination UI).
 *   3. All distinct sets the user owns — intentionally ignores active filters so
 *      the set dropdown always shows every option regardless of the current view.
 */
const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;

export async function searchUserCollection(
  userId: number,
  options: CollectionQueryOptions = {}
): Promise<CollectionQueryResult> {
  const {
    q = '',
    typeLine,
    colors,
    colorMode = 'including',
    colorless = false,
    rarity,
    cmc,
    cmcOp = 'eq',
    set = 'all',
    sortBy = 'name',
    sortDir = 'asc',
    page = 1,
    limit = 60,
    favOnly = false,
    deckFilter = 'any',
  } = options;

  const conds = [eq(schema.collectionItems.userId, userId)] as ReturnType<
    typeof sql
  >[];

  const qNorm = normalizeName(q);
  if (qNorm) {
    conds.push(sql`${schema.cards.normalizedName} ILIKE ${'%' + qNorm + '%'}`);
  }

  if (typeLine) {
    for (const word of typeLine.trim().split(/\s+/).filter(Boolean)) {
      conds.push(sql`${schema.cards.typeLine} ILIKE ${'%' + word + '%'}`);
    }
  }

  if (rarity) {
    conds.push(sql`lower(${schema.cards.rarity}) = ${rarity.toLowerCase()}`);
  }

  if (cmc != null && Number.isFinite(cmc)) {
    if (cmcOp === 'lte') conds.push(sql`${schema.cards.cmc} <= ${cmc}`);
    else if (cmcOp === 'gte') conds.push(sql`${schema.cards.cmc} >= ${cmc}`);
    else conds.push(sql`${schema.cards.cmc} = ${cmc}`);
  }

  const ci = schema.cards.colorIdentity;
  if (colorless) {
    conds.push(sql`coalesce(${ci}, '') = ''`);
  } else if (colors) {
    const sel = new Set(
      colors
        .toUpperCase()
        .split('')
        .filter((c) => WUBRG.includes(c as never))
    );
    if (sel.size > 0) {
      for (const c of WUBRG) {
        const has = sel.has(c);
        if (colorMode === 'including') {
          if (has) conds.push(sql`${ci} ILIKE ${'%' + c + '%'}`);
        } else if (colorMode === 'exact') {
          conds.push(
            has
              ? sql`${ci} ILIKE ${'%' + c + '%'}`
              : sql`${ci} NOT ILIKE ${'%' + c + '%'}`
          );
        } else {
          // atmost: selected optional, unselected forbidden
          if (!has)
            conds.push(sql`coalesce(${ci}, '') NOT ILIKE ${'%' + c + '%'}`);
        }
      }
    }
  }

  if (set !== 'all') {
    conds.push(sql`upper(${schema.cards.setCode}) = ${set.toUpperCase()}`);
  }

  if (favOnly) {
    // Correlated EXISTS against the favorites table — avoids a join that would
    // multiply rows when a card is favorited multiple times.
    conds.push(sql`exists (
      select 1 from favorites
      where favorites.user_id = ${userId}
      and favorites.normalized_name = cards.normalized_name
    )`);
  }

  if (deckFilter === 'in') {
    conds.push(sql`exists (
      select 1 from deck_cards
      where deck_cards.normalized_name = cards.normalized_name
    )`);
  } else if (deckFilter === 'out') {
    conds.push(sql`not exists (
      select 1 from deck_cards
      where deck_cards.normalized_name = cards.normalized_name
    )`);
  }

  const where = and(...conds);
  const orderBy = buildOrderBy(sortBy, sortDir);
  const offset = (page - 1) * limit;

  const [rows, [countRow], setsRows] = await Promise.all([
    db
      .select(COLLECTION_SELECT)
      .from(schema.collectionItems)
      .innerJoin(
        schema.cards,
        eq(schema.cards.id, schema.collectionItems.cardId)
      )
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.collectionItems)
      .innerJoin(
        schema.cards,
        eq(schema.cards.id, schema.collectionItems.cardId)
      )
      .where(where),
    // No active filters — always returns every set the user owns.
    db
      .selectDistinct({
        setCode: schema.cards.setCode,
        setName: schema.cards.setName,
      })
      .from(schema.collectionItems)
      .innerJoin(
        schema.cards,
        eq(schema.cards.id, schema.collectionItems.cardId)
      )
      .where(eq(schema.collectionItems.userId, userId))
      .orderBy(schema.cards.setName),
  ]);

  // Drizzle returns Postgres numeric columns as strings; cast cmc here.
  // Foil copies display the foil price when one exists, otherwise fall back to regular.
  const items = rows.map(({ priceUsdFoil, ...r }) => ({
    ...r,
    cmc: r.cmc != null ? Number(r.cmc) : null,
    priceUsd: r.foil && priceUsdFoil ? priceUsdFoil : r.priceUsd,
  }));

  return {
    items,
    total: countRow?.count ?? 0,
    sets: setsRows
      .filter((s) => s.setCode)
      .map((s) => ({
        value: s.setCode!.toUpperCase(),
        label: s.setName?.trim() || s.setCode!.toUpperCase(),
      })),
  };
}
