import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** The four friends in the pod. Seeded once; not user-created. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

/**
 * One row per distinct Scryfall printing we've ever seen, across everyone's
 * collections. Acts as a metadata cache so re-imports of known cards never hit
 * the Scryfall API. Matching happens on `normalized_name`, not on this row.
 */
export const cards = pgTable(
  "cards",
  {
    id: serial("id").primaryKey(),
    scryfallId: text("scryfall_id").notNull().unique(),
    name: text("name").notNull(),
    /** Shared normalizeName() output — the only thing the matcher compares. */
    normalizedName: text("normalized_name").notNull(),
    setCode: text("set_code"),
    setName: text("set_name"),
    collectorNumber: text("collector_number"),
    imageUri: text("image_uri"),
    manaCost: text("mana_cost"),
    /** Converted mana cost / mana value, from Scryfall. Powers matcher sort. */
    cmc: numeric("cmc"),
    typeLine: text("type_line"),
    /** Comma-joined WUBRG color identity (e.g. "U,B"; "" = colorless). For organizing. */
    colorIdentity: text("color_identity"),
    /** common | uncommon | rare | mythic | special | bonus — for rarity gems. */
    rarity: text("rarity"),
    /** Stored as numeric to avoid float drift; nullable (some cards lack a price). */
    pricesUsd: numeric("prices_usd"),
    /** Foil-finish USD price (Scryfall prices.usd_foil); used for foil copies. */
    priceUsdFoil: numeric("price_usd_foil"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // pg_trgm GIN index powers fuzzy ILIKE search in the global "who owns X" feature.
    index("cards_normalized_name_trgm")
      .using("gin", sql`${t.normalizedName} gin_trgm_ops`),
  ],
);

/**
 * A user owns N copies of a specific printing. Upload fully replaces a user's
 * rows (full re-sync). Duplicate CSV rows (same scryfall_id + foil) are merged
 * by summing quantity before insert.
 */
export const collectionItems = pgTable(
  "collection_items",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardId: integer("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    foil: boolean("foil").notNull().default(false),
    condition: text("condition"),
    source: text("source").notNull().default("manabox"),
    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("collection_items_user_idx").on(t.userId),
    index("collection_items_card_idx").on(t.cardId),
    // one row per (user, printing, foil) — enforces the merge-on-import invariant
    uniqueIndex("collection_items_user_card_foil_uniq").on(
      t.userId,
      t.cardId,
      t.foil,
    ),
  ],
);

export const decks = pgTable("decks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerUserId: integer("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  source: text("source", {
    enum: ["paste", "archidekt", "moxfield_text", "edhrec"],
  })
    .notNull()
    .default("paste"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Cards in a deck. Stored by name (+ normalized key) rather than card_id,
 * because a decklist references a card abstractly — any printing counts.
 */
export const deckCards = pgTable(
  "deck_cards",
  {
    id: serial("id").primaryKey(),
    deckId: integer("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    cardName: text("card_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    quantity: integer("quantity").notNull().default(1),
    isCommander: boolean("is_commander").notNull().default(false),
    /** Marked as a proxy (auto from Archidekt "proxy" labels, or toggled). */
    isProxy: boolean("is_proxy").notNull().default(false),
  },
  (t) => [index("deck_cards_deck_idx").on(t.deckId)],
);

/**
 * A user's favorited cards. Keyed by normalized_name (the card concept, not a
 * printing) so a star follows the card across every printing and shows up in
 * search too.
 */
export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    normalizedName: text("normalized_name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("favorites_user_name_uniq").on(t.userId, t.normalizedName),
    index("favorites_user_idx").on(t.userId),
  ],
);

/**
 * Card requests between pod members — "hey, can I borrow your Rhystic Study?".
 * from_user asks to_user for a card; to_user resolves it from their Inbox.
 */
export const requests = pgTable(
  "requests",
  {
    id: serial("id").primaryKey(),
    fromUserId: integer("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: integer("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    cardName: text("card_name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    /** Optional deck the request is for context. */
    deckId: integer("deck_id").references(() => decks.id, { onDelete: "set null" }),
    note: text("note"),
    /** pending | given | declined | cancelled */
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("requests_to_idx").on(t.toUserId),
    index("requests_from_idx").on(t.fromUserId),
  ],
);

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type DeckCard = typeof deckCards.$inferSelect;
