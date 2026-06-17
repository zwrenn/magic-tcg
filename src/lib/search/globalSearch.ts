import 'server-only';
import { eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { normalizeName } from '../normalize';
import type { OwnerHolding } from '../matcher';

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
