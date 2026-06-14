import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { collectionTotals, searchUserCollection } from "./search";

export type Trophy = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
  /** Progress toward earning, 0..1 (for the locked hint bar). */
  progress: number;
};

/**
 * Compute a player's trophy cabinet from their collection + decks. All derived
 * from existing data — no new tables. Returns every trophy with earned/locked
 * state so the cabinet shows goals to chase, Neopets-style.
 */
export async function getTrophies(userId: number): Promise<Trophy[]> {
  const [totals, rows, deckRows, proxyRows] = await Promise.all([
    collectionTotals(userId),
    searchUserCollection(userId, "", 100000),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.decks)
      .where(eq(schema.decks.ownerUserId, userId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.deckCards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.deckCards.deckId))
      .where(and(eq(schema.decks.ownerUserId, userId), eq(schema.deckCards.isProxy, true))),
  ]);

  const foilCount = rows.reduce((s, r) => s + (r.foil ? r.quantity : 0), 0);
  const colors = new Set<string>();
  const sets = new Set<string>();
  for (const r of rows) {
    for (const c of (r.colorIdentity ?? "").split(",").filter(Boolean)) colors.add(c);
    if (r.setCode) sets.add(r.setCode);
  }
  const hasAllColors = ["W", "U", "B", "R", "G"].every((c) => colors.has(c));
  const decks = deckRows[0]?.n ?? 0;
  const proxies = proxyRows[0]?.n ?? 0;

  const clamp = (n: number, d: number) => Math.max(0, Math.min(1, n / d));

  // Each trophy: value (current) vs goal (threshold). Bool trophies use 0/1.
  const list: { id: string; icon: string; name: string; desc: string; value: number; goal: number }[] = [
    { id: "first", icon: "🌱", name: "First Steps", desc: "Import your first cards", value: totals.distinct, goal: 1 },
    { id: "century", icon: "💯", name: "Century Club", desc: "Own 100 cards", value: totals.total, goal: 100 },
    { id: "hoard", icon: "📦", name: "Card Hoard", desc: "Own 1,000 cards", value: totals.total, goal: 1000 },
    { id: "dragon", icon: "🐉", name: "Dragon's Hoard", desc: "Own 5,000 cards", value: totals.total, goal: 5000 },
    { id: "builder", icon: "🛠️", name: "Deck Builder", desc: "Save a deck", value: decks, goal: 1 },
    { id: "architect", icon: "🏛️", name: "Architect", desc: "Save 3 decks", value: decks, goal: 3 },
    { id: "foil1", icon: "✨", name: "Foil Fiend", desc: "Own a foil", value: foilCount, goal: 1 },
    { id: "foil50", icon: "🪙", name: "Foil Hoarder", desc: "Own 50 foils", value: foilCount, goal: 50 },
    { id: "spender", icon: "💰", name: "Big Spender", desc: "Collection worth $1,000", value: Math.round(totals.valueUsd), goal: 1000 },
    { id: "rainbow", icon: "🌈", name: "Full Spectrum", desc: "Own all five colors", value: hasAllColors ? 1 : colors.size, goal: hasAllColors ? 1 : 5 },
    { id: "proxy", icon: "🔁", name: "Proxy Royalty", desc: "Tag 20 proxies", value: proxies, goal: 20 },
    { id: "sets", icon: "🗺️", name: "Set Collector", desc: "Own cards from 50 sets", value: sets.size, goal: 50 },
  ];

  return list.map((t) => ({
    id: t.id,
    icon: t.icon,
    name: t.name,
    desc: t.desc,
    earned: t.value >= t.goal,
    progress: clamp(t.value, t.goal),
  }));
}
