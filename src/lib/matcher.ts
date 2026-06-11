import "server-only";
import { eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getDeck } from "./decks";

export type OwnerHolding = { name: string; qty: number; foil: boolean };

export type DeckCardMatch = {
  normalizedName: string;
  name: string;
  image: string | null;
  typeLine: string | null;
  cmc: number | null;
  manaCost: string | null;
  needed: number;
  isCommander: boolean;
  /** Every pod member who owns at least one copy (any printing). */
  owners: OwnerHolding[];
};

export type DeckMatch = {
  deck: NonNullable<Awaited<ReturnType<typeof getDeck>>>;
  cards: DeckCardMatch[];
};

/**
 * The core: for each card in a deck, who in the pod owns it (summed across all
 * printings) and how many. Sectioning / owner-exclusion / sorting are done on
 * the client so toggles are instant — this just assembles the raw holdings.
 */
export async function matchDeck(deckId: number): Promise<DeckMatch | null> {
  const deck = await getDeck(deckId);
  if (!deck) return null;

  const names = [...new Set(deck.cards.map((c) => c.normalizedName))];
  if (names.length === 0) return { deck, cards: [] };

  // Per-card, per-owner owned quantity across all printings.
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

  // One representative printing per card for image/type/mana, preferring rows
  // that actually have an image.
  const meta = await db
    .selectDistinctOn([schema.cards.normalizedName], {
      normalizedName: schema.cards.normalizedName,
      name: schema.cards.name,
      image: schema.cards.imageUri,
      typeLine: schema.cards.typeLine,
      cmc: schema.cards.cmc,
      manaCost: schema.cards.manaCost,
    })
    .from(schema.cards)
    .where(inArray(schema.cards.normalizedName, names))
    .orderBy(
      schema.cards.normalizedName,
      sql`${schema.cards.imageUri} is null`,
      sql`${schema.cards.updatedAt} desc`,
    );
  const metaByCard = new Map(meta.map((m) => [m.normalizedName, m]));

  const cards: DeckCardMatch[] = deck.cards.map((dc) => {
    const m = metaByCard.get(dc.normalizedName);
    const owners = (ownersByCard.get(dc.normalizedName) ?? []).sort(
      (a, b) => b.qty - a.qty,
    );
    return {
      normalizedName: dc.normalizedName,
      name: m?.name ?? dc.cardName,
      image: m?.image ?? null,
      typeLine: m?.typeLine ?? null,
      cmc: m?.cmc != null ? Number(m.cmc) : null,
      manaCost: m?.manaCost ?? null,
      needed: dc.quantity,
      isCommander: dc.isCommander,
      owners,
    };
  });

  return { deck, cards };
}
