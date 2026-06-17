import 'server-only';
import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Card, CollectionItem } from '@/db/schema';
import { normalizeName } from './normalize';
import type { OwnerHolding } from './matcher';
import { COLOR_BUCKETS, TYPE_BUCKETS } from './card-types';
import type { ColorBucket, TypeBucket } from './card-types';

/** Distinct entries, total card count, and est. value for a user's collection. */
export async function collectionTotals(
  userId: number
): Promise<{ distinct: number; total: number; valueUsd: number }> {
  const [row] = await db
    .select({
      distinct: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.collectionItems.quantity}), 0)::int`,
      // foil copies use the foil price when available
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

// Module-level projection used for both the live query and type inference below.
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

// Each field is typed against its source column in the schema-inferred Card /
// CollectionItem types so changes to the schema propagate here automatically.
// Keys match COLLECTION_SELECT (some differ from schema property names due to
// aliasing, e.g. imageUri → image, pricesUsd → priceUsd).
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
  color?: ColorBucket | 'all';
  type?: TypeBucket | 'all';
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

// Valid values for enum params — used by the API route for input validation.
export const VALID_COLORS: readonly (ColorBucket | 'all')[] = [
  'all',
  ...COLOR_BUCKETS,
];
export const VALID_TYPES: readonly (TypeBucket | 'all')[] = [
  'all',
  ...TYPE_BUCKETS,
];
export const VALID_SORT_KEYS: readonly SortKey[] = SORT_KEYS;

function buildOrderBy(sortBy: SortKey, sortDir: 'asc' | 'desc') {
  const d = sortDir === 'desc' ? desc : asc;
  const nameAsc = asc(schema.cards.name);
  switch (sortBy) {
    case 'cmc':
      return [d(schema.cards.cmc), nameAsc] as const;
    case 'quantity':
      return [d(schema.collectionItems.quantity), nameAsc] as const;
    case 'price': {
      const priceExpr = sql<number>`coalesce(${schema.cards.pricesUsd}::numeric, 0)`;
      return [d(priceExpr), nameAsc] as const;
    }
    case 'set':
      return [d(schema.cards.setName), nameAsc] as const;
    case 'color': {
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

/** A user's collection, with optional server-side filtering, sorting, and pagination. */
export async function searchUserCollection(
  userId: number,
  options: CollectionQueryOptions = {}
): Promise<CollectionQueryResult> {
  const {
    q = '',
    color = 'all',
    type = 'all',
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

  if (color !== 'all') {
    switch (color) {
      case 'Colorless':
        conds.push(sql`coalesce(${schema.cards.colorIdentity}, '') = ''`);
        break;
      case 'Multicolor':
        conds.push(sql`${schema.cards.colorIdentity} LIKE '%,%'`);
        break;
      default: {
        const letter: Record<string, string> = {
          White: 'W',
          Blue: 'U',
          Black: 'B',
          Red: 'R',
          Green: 'G',
        };
        if (letter[color])
          conds.push(sql`${schema.cards.colorIdentity} = ${letter[color]}`);
      }
    }
  }

  if (type !== 'all') {
    conds.push(sql`case
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%creature%' then 'Creature'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%planeswalker%' then 'Planeswalker'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%instant%' then 'Instant'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%sorcery%' then 'Sorcery'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%battle%' then 'Battle'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%artifact%' then 'Artifact'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%enchantment%' then 'Enchantment'
      when lower(coalesce(${schema.cards.typeLine}, '')) like '%land%' then 'Land'
      else 'Other'
    end = ${type}`);
  }

  if (set !== 'all') {
    conds.push(sql`upper(${schema.cards.setCode}) = ${set.toUpperCase()}`);
  }

  if (favOnly) {
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
    // sets are always computed from the full collection, ignoring active filters,
    // so the dropdown always shows all available options regardless of current view.
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

export type GlobalSearchResult = {
  normalizedName: string;
  name: string;
  image: string | null;
  owners: OwnerHolding[];
};

/**
 * "Does anyone have a Smothering Tithe?" — fuzzy name search across ALL
 * collections, returning each matching card with who owns it. Trigram-backed.
 */
export async function globalSearch(
  q: string,
  limit = 40
): Promise<GlobalSearchResult[]> {
  const qNorm = normalizeName(q);
  if (!qNorm) return [];

  // Candidate distinct cards, ranked by trigram similarity to the query.
  const candidates = await db
    .selectDistinctOn([schema.cards.normalizedName], {
      normalizedName: schema.cards.normalizedName,
      name: schema.cards.name,
      image: schema.cards.imageUri,
    })
    .from(schema.cards)
    .where(sql`${schema.cards.normalizedName} ILIKE ${'%' + qNorm + '%'}`)
    .orderBy(schema.cards.normalizedName, sql`${schema.cards.imageUri} is null`)
    .limit(limit * 3);

  // Rank by similarity (closer matches first), then trim.
  const ranked = candidates
    .map((c) => ({
      ...c,
      score:
        c.normalizedName === qNorm
          ? 3
          : c.normalizedName.startsWith(qNorm)
            ? 2
            : 1,
    }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);

  if (ranked.length === 0) return [];
  const names = ranked.map((c) => c.normalizedName);

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

  return ranked.map((c) => ({
    normalizedName: c.normalizedName,
    name: c.name,
    image: c.image,
    owners: (ownersByCard.get(c.normalizedName) ?? []).sort(
      (a, b) => b.qty - a.qty
    ),
  }));
}

// ---------------------------------------------------------------------------
// Advanced search — Scryfall-ish filters over the pod's COMBINED collection.
// ---------------------------------------------------------------------------

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
  limit?: number;
};

export type AdvancedResult = GlobalSearchResult & {
  typeLine: string | null;
  cmc: number | null;
  colorIdentity: string | null;
  rarity: string | null;
  setCode: string | null;
  priceUsd: string | null;
};

const WUBRG = ['W', 'U', 'B', 'R', 'G'] as const;

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

export async function advancedSearch(
  f: AdvancedFilters
): Promise<AdvancedResult[]> {
  const limit = f.limit ?? 80;
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
  if (f.rarity)
    conds.push(sql`lower(${schema.cards.rarity}) = ${f.rarity.toLowerCase()}`);
  if (f.cmc != null && Number.isFinite(f.cmc)) {
    if (f.cmcOp === 'lte') conds.push(sql`${schema.cards.cmc} <= ${f.cmc}`);
    else if (f.cmcOp === 'gte')
      conds.push(sql`${schema.cards.cmc} >= ${f.cmc}`);
    else conds.push(sql`${schema.cards.cmc} = ${f.cmc}`);
  }

  // Color identity. Letters are stored comma-joined (e.g. "W,U"); colorless = "".
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
        // at most: selected colors optional, unselected forbidden
        if (!has)
          conds.push(sql`coalesce(${ci}, '') NOT ILIKE ${'%' + c + '%'}`);
      }
    }
  }

  const where = conds.length ? and(...conds) : undefined;

  // Candidate cards that match AND are owned by someone in the pod.
  const candidates = await db
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
    .limit(600);

  if (candidates.length === 0) return [];
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

  // How many players have collections — for the "everyone" filter.
  const [{ n: playerCount } = { n: 0 }] = await db
    .select({
      n: sql<number>`count(distinct ${schema.collectionItems.userId})::int`,
    })
    .from(schema.collectionItems);

  const ownerFilter = (owners: OwnerHolding[]): boolean => {
    const o = f.owner ?? 'anyone';
    if (o === 'anyone') return owners.length > 0;
    if (o === 'everyone') return owners.length >= Math.max(1, playerCount);
    if (o === '2' || o === '3') return owners.length >= Number(o);
    return owners.some((x) => x.name === o); // specific member
  };

  const results: AdvancedResult[] = candidates
    .map((c) => ({
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
    }))
    .filter((r) => ownerFilter(r.owners));

  const sort = f.sort ?? 'name';
  results.sort((a, b) => {
    if (sort === 'cmc')
      return (a.cmc ?? 99) - (b.cmc ?? 99) || a.name.localeCompare(b.name);
    if (sort === 'price')
      return (Number(b.priceUsd) || 0) - (Number(a.priceUsd) || 0);
    return a.name.localeCompare(b.name);
  });

  return results.slice(0, limit);
}
