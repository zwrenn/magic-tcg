import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ParsedCard } from "./deck-parser";
import { ensureCardsByName } from "./scryfall";

export type DeckSource = "paste" | "archidekt" | "moxfield_text";

/**
 * Persist a parsed deck and its cards. Also warms the card cache by name so the
 * matcher has images / type / mana value even for cards nobody owns yet.
 */
export async function createDeck(opts: {
  ownerUserId: number;
  name: string;
  source: DeckSource;
  cards: ParsedCard[];
}): Promise<number> {
  const { ownerUserId, name, source, cards } = opts;
  if (cards.length === 0) throw new Error("No cards found in that deck.");

  // Best-effort metadata warm-up; never block deck creation on Scryfall.
  try {
    await ensureCardsByName(cards.map((c) => c.name));
  } catch {
    // matcher will still work via owned-card metadata; non-fatal
  }

  const [deck] = await db
    .insert(schema.decks)
    .values({ ownerUserId, name: name.slice(0, 200), source })
    .returning({ id: schema.decks.id });

  await db.insert(schema.deckCards).values(
    cards.map((c) => ({
      deckId: deck.id,
      cardName: c.name,
      normalizedName: c.normalizedName,
      quantity: c.quantity,
      isCommander: c.isCommander,
    })),
  );

  return deck.id;
}

export async function listDecks() {
  return db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      source: schema.decks.source,
      createdAt: schema.decks.createdAt,
      ownerName: schema.users.name,
      ownerUserId: schema.decks.ownerUserId,
    })
    .from(schema.decks)
    .innerJoin(schema.users, eq(schema.decks.ownerUserId, schema.users.id))
    .orderBy(desc(schema.decks.createdAt));
}

export async function getDeck(deckId: number) {
  const [deck] = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      source: schema.decks.source,
      createdAt: schema.decks.createdAt,
      ownerUserId: schema.decks.ownerUserId,
      ownerName: schema.users.name,
    })
    .from(schema.decks)
    .innerJoin(schema.users, eq(schema.decks.ownerUserId, schema.users.id))
    .where(eq(schema.decks.id, deckId))
    .limit(1);
  if (!deck) return null;

  const cards = await db
    .select()
    .from(schema.deckCards)
    .where(eq(schema.deckCards.deckId, deckId));

  return { ...deck, cards };
}

export async function deleteDeck(deckId: number): Promise<void> {
  await db.delete(schema.decks).where(eq(schema.decks.id, deckId));
}
