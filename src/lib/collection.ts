import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureCardsByScryfallId, ensureCardsByName } from "./scryfall";
import { normalizeName } from "./normalize";

/** Remove every copy of a card (any printing/finish) from a user's collection,
 *  matched by name. Returns how many rows were removed. */
export async function removeCardByName(
  userId: number,
  name: string,
): Promise<number> {
  const key = normalizeName(name);
  if (!key) return 0;
  const cardIds = (
    await db
      .select({ id: schema.cards.id })
      .from(schema.cards)
      .where(eq(schema.cards.normalizedName, key))
  ).map((c) => c.id);
  if (cardIds.length === 0) return 0;

  const [before] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.collectionItems)
    .where(
      and(
        eq(schema.collectionItems.userId, userId),
        inArray(schema.collectionItems.cardId, cardIds),
      ),
    );
  await db
    .delete(schema.collectionItems)
    .where(
      and(
        eq(schema.collectionItems.userId, userId),
        inArray(schema.collectionItems.cardId, cardIds),
      ),
    );
  return before?.n ?? 0;
}

/**
 * Quick-add a card to a collection by NAME (any printing counts). Used by the
 * one-click "Add to collection" buttons in search / the card zoom. Resolves a
 * representative printing via the cache (or Scryfall) then increments.
 */
export async function addCardByName(
  userId: number,
  name: string,
  opts: { quantity?: number; foil?: boolean } = {},
): Promise<{ name: string; added: number } | null> {
  const map = await ensureCardsByName([name]);
  const card = [...map.values()][0];
  if (!card) return null;
  return addCardToCollection(userId, card.scryfallId, {
    quantity: opts.quantity ?? 1,
    foil: opts.foil ?? false,
  });
}

/** Set a collection item's quantity (<=0 deletes it). Scoped to the user. */
export async function setItemQuantity(
  userId: number,
  itemId: number,
  quantity: number,
): Promise<{ removed: boolean; quantity: number }> {
  if (quantity <= 0) {
    await db
      .delete(schema.collectionItems)
      .where(
        and(
          eq(schema.collectionItems.id, itemId),
          eq(schema.collectionItems.userId, userId),
        ),
      );
    return { removed: true, quantity: 0 };
  }
  await db
    .update(schema.collectionItems)
    .set({ quantity })
    .where(
      and(
        eq(schema.collectionItems.id, itemId),
        eq(schema.collectionItems.userId, userId),
      ),
    );
  return { removed: false, quantity };
}

/** Wipe a user's entire collection. Returns how many rows were removed. */
export async function clearCollection(userId: number): Promise<number> {
  const [before] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.collectionItems)
    .where(eq(schema.collectionItems.userId, userId));
  await db
    .delete(schema.collectionItems)
    .where(eq(schema.collectionItems.userId, userId));
  return before?.n ?? 0;
}

/**
 * Add a single printing to a user's collection (the "I just opened it" flow).
 * Incremental — unlike the ManaBox import this does NOT replace anything. If the
 * user already has that printing in the same finish, the quantity is bumped.
 */
export async function addCardToCollection(
  userId: number,
  scryfallId: string,
  opts: { quantity: number; foil: boolean; condition?: string | null },
): Promise<{ name: string; added: number }> {
  const qty = Math.max(1, Math.floor(opts.quantity || 1));
  const map = await ensureCardsByScryfallId([scryfallId]);
  const card = map.get(scryfallId);
  if (!card) throw new Error("Couldn't find that printing on Scryfall.");

  await db
    .insert(schema.collectionItems)
    .values({
      userId,
      cardId: card.id,
      quantity: qty,
      foil: opts.foil,
      condition: opts.condition ?? null,
      source: "manual",
    })
    // unique index is (user_id, card_id, foil) — same printing+finish bumps qty
    .onConflictDoUpdate({
      target: [
        schema.collectionItems.userId,
        schema.collectionItems.cardId,
        schema.collectionItems.foil,
      ],
      set: { quantity: sql`${schema.collectionItems.quantity} + ${qty}` },
    });

  return { name: card.name, added: qty };
}
