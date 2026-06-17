import 'server-only';
import { and, eq, inArray, sql } from 'drizzle-orm';
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
    return owners.some((x) => x.name === o);
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
