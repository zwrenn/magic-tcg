import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { ParsedCard } from "./deck-parser";
import { ensureCardsByName } from "./scryfall";
import { isBasicLand } from "./card-types";

export type DeckSource = "paste" | "archidekt" | "moxfield_text" | "edhrec";

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

export type DeckSummary = {
  id: number;
  name: string;
  source: string;
  createdAt: Date;
  ownerName: string;
  ownerUserId: number;
  cardCount: number;
  commander: string | null;
  /** Comma-joined WUBRG color identity of the whole deck. */
  colors: string;
};

export async function listDecks(): Promise<DeckSummary[]> {
  const decks = await db
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

  if (decks.length === 0) return [];

  // Per-deck card counts.
  const counts = await db
    .select({
      deckId: schema.deckCards.deckId,
      cardCount: sql<number>`count(*)::int`,
    })
    .from(schema.deckCards)
    .groupBy(schema.deckCards.deckId);
  const countByDeck = new Map(counts.map((c) => [c.deckId, c.cardCount]));

  // Commander per deck (first flagged card).
  const commanders = await db
    .select({ deckId: schema.deckCards.deckId, cardName: schema.deckCards.cardName })
    .from(schema.deckCards)
    .where(eq(schema.deckCards.isCommander, true));
  const cmdrByDeck = new Map<number, string>();
  for (const c of commanders) if (!cmdrByDeck.has(c.deckId)) cmdrByDeck.set(c.deckId, c.cardName);

  // Deck color identity: union of color letters across the deck's cards.
  const colorRows = await db
    .select({
      deckId: schema.deckCards.deckId,
      colorIdentity: schema.cards.colorIdentity,
    })
    .from(schema.deckCards)
    .innerJoin(
      schema.cards,
      eq(schema.cards.normalizedName, schema.deckCards.normalizedName),
    );
  const colorsByDeck = new Map<number, Set<string>>();
  for (const row of colorRows) {
    if (!row.colorIdentity) continue;
    const set = colorsByDeck.get(row.deckId) ?? new Set<string>();
    for (const c of row.colorIdentity.split(",").filter(Boolean)) set.add(c);
    colorsByDeck.set(row.deckId, set);
  }
  const WUBRG = ["W", "U", "B", "R", "G"];

  return decks.map((d) => ({
    ...d,
    cardCount: countByDeck.get(d.id) ?? 0,
    commander: cmdrByDeck.get(d.id) ?? null,
    colors: WUBRG.filter((c) => colorsByDeck.get(d.id)?.has(c)).join(","),
  }));
}

export type BuildableDeck = DeckSummary & {
  covered: number;
  missing: number;
  /** Non-basic cards that count toward coverage. */
  total: number;
  coveragePct: number;
};

/**
 * Score every saved deck by how completely it can be built from the pod's
 * COMBINED collections. A deck card counts as covered when the pod owns at
 * least the needed quantity across everyone. Sorted most-complete first.
 */
export async function getBuildableDecks(): Promise<BuildableDeck[]> {
  const decks = await listDecks();
  if (decks.length === 0) return [];

  // Pod-combined owned quantity per card (any printing), summed across members.
  const owned = await db
    .select({
      normalizedName: schema.cards.normalizedName,
      qty: sql<number>`sum(${schema.collectionItems.quantity})::int`,
    })
    .from(schema.collectionItems)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.collectionItems.cardId))
    .groupBy(schema.cards.normalizedName);
  const ownedMap = new Map(owned.map((o) => [o.normalizedName, o.qty]));

  const deckCardRows = await db
    .select({
      deckId: schema.deckCards.deckId,
      normalizedName: schema.deckCards.normalizedName,
      quantity: schema.deckCards.quantity,
    })
    .from(schema.deckCards);

  const agg = new Map<number, { covered: number; total: number }>();
  for (const dc of deckCardRows) {
    if (isBasicLand(dc.normalizedName)) continue; // basics aren't "needs"
    const a = agg.get(dc.deckId) ?? { covered: 0, total: 0 };
    a.total += 1;
    if ((ownedMap.get(dc.normalizedName) ?? 0) >= dc.quantity) a.covered += 1;
    agg.set(dc.deckId, a);
  }

  return decks
    .map((d) => {
      const a = agg.get(d.id) ?? { covered: 0, total: 0 };
      const total = a.total;
      const covered = a.covered;
      return {
        ...d,
        covered,
        total,
        missing: total - covered,
        coveragePct: total ? Math.round((covered / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.coveragePct - a.coveragePct || a.missing - b.missing);
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
