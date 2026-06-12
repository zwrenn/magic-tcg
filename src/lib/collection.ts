import "server-only";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureCardsByScryfallId } from "./scryfall";

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
