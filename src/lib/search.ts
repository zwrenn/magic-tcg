import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { normalizeName } from "./normalize";
import type { OwnerHolding } from "./matcher";

/** Distinct entries, total card count, and est. value for a user's collection. */
export async function collectionTotals(
  userId: number,
): Promise<{ distinct: number; total: number; valueUsd: number }> {
  const [row] = await db
    .select({
      distinct: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${schema.collectionItems.quantity}), 0)::int`,
      valueUsd: sql<number>`coalesce(sum(${schema.collectionItems.quantity} * ${schema.cards.pricesUsd}), 0)::float`,
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

export type CollectionRow = {
  name: string;
  normalizedName: string;
  image: string | null;
  typeLine: string | null;
  manaCost: string | null;
  cmc: number | null;
  colorIdentity: string | null;
  setCode: string | null;
  setName: string | null;
  priceUsd: string | null;
  quantity: number;
  foil: boolean;
  condition: string | null;
};

/** A user's cards, optionally filtered by name (trigram ILIKE). */
export async function searchUserCollection(
  userId: number,
  q: string,
  limit = 200,
): Promise<CollectionRow[]> {
  const qNorm = normalizeName(q);
  const where = qNorm
    ? and(
        eq(schema.collectionItems.userId, userId),
        sql`${schema.cards.normalizedName} ILIKE ${"%" + qNorm + "%"}`,
      )
    : eq(schema.collectionItems.userId, userId);

  const rows = await db
    .select({
      name: schema.cards.name,
      normalizedName: schema.cards.normalizedName,
      image: schema.cards.imageUri,
      typeLine: schema.cards.typeLine,
      manaCost: schema.cards.manaCost,
      cmc: schema.cards.cmc,
      colorIdentity: schema.cards.colorIdentity,
      setCode: schema.cards.setCode,
      setName: schema.cards.setName,
      priceUsd: schema.cards.pricesUsd,
      quantity: schema.collectionItems.quantity,
      foil: schema.collectionItems.foil,
      condition: schema.collectionItems.condition,
    })
    .from(schema.collectionItems)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.collectionItems.cardId))
    .where(where)
    .orderBy(schema.cards.name)
    .limit(limit);

  // numeric columns come back as strings from the driver
  return rows.map((r) => ({ ...r, cmc: r.cmc != null ? Number(r.cmc) : null }));
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
  limit = 40,
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
    .where(sql`${schema.cards.normalizedName} ILIKE ${"%" + qNorm + "%"}`)
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
    owners: (ownersByCard.get(c.normalizedName) ?? []).sort((a, b) => b.qty - a.qty),
  }));
}
