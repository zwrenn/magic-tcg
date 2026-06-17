import 'server-only';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Card, CollectionItem } from '@/db/schema';
import { normalizeName } from '../normalize';
import { COLOR_BUCKETS, TYPE_BUCKETS } from '../card-types';
import type { ColorBucket, TypeBucket } from '../card-types';

export async function collectionTotals(
  userId: number
): Promise<{ distinct: number; total: number; valueUsd: number }> {
  const [row] = await db
    .select({
      distinct: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.collectionItems.quantity}), 0)::int`,
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
