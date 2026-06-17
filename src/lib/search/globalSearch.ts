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
 * "Does anyone have a Smothering Tithe?" — searches across all collections
 * and returns each matching card with the list of pod members who own it.
 *
 * Two-phase approach:
 *   1. Find candidate cards by name (ILIKE, no ownership constraint).
 *   2. Fetch ownership for just those cards, then merge.
 * This avoids a large GROUP BY over the whole collection table on every keystroke.
 *
 * Candidates are fetched at 3× the limit so the JS-side relevance re-ranking
 * has enough material to work with before trimming to the final limit.
 */
export async function globalSearch(
  q: string,
  limit = 40
): Promise<GlobalSearchResult[]> {
  const qNorm = normalizeName(q);
  if (!qNorm) return [];

  // selectDistinctOn deduplicates by normalizedName, keeping the row whose
  // imageUri is non-null (nulls sort last via the secondary ORDER BY expression).
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

  // Re-rank in JS: exact match → prefix match → substring match, then alphabetical.
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

  // Fetch ownership for only the ranked cards, grouped by card + user.
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
    // Sort owners by quantity descending so the biggest holder appears first.
    owners: (ownersByCard.get(c.normalizedName) ?? []).sort(
      (a, b) => b.qty - a.qty
    ),
  }));
}
