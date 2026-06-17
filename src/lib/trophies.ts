import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { collectionTotals, searchUserCollection } from './search';
import type { TrophyShape, TrophyTier } from '@/components/pixel-trophy';

export type Trophy = {
  id: string;
  name: string;
  desc: string;
  earned: boolean;
  /** Progress toward earning, 0..1 (for the locked hint bar). */
  progress: number;
  /** Pixel-art graphic. */
  shape: TrophyShape;
  tier: TrophyTier;
  gem: string;
};

/**
 * Compute a player's trophy cabinet from their collection + decks. All derived
 * from existing data — no new tables. Returns every trophy with earned/locked
 * state so the cabinet shows goals to chase, Neopets-style.
 */
export async function getTrophies(userId: number): Promise<Trophy[]> {
  const [totals, { items: rows }, deckRows, proxyRows] = await Promise.all([
    collectionTotals(userId),
    searchUserCollection(userId, { limit: 100000 }),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.decks)
      .where(eq(schema.decks.ownerUserId, userId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.deckCards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.deckCards.deckId))
      .where(
        and(
          eq(schema.decks.ownerUserId, userId),
          eq(schema.deckCards.isProxy, true)
        )
      ),
  ]);

  const foilCount = rows.reduce((s, r) => s + (r.foil ? r.quantity : 0), 0);
  const colors = new Set<string>();
  const sets = new Set<string>();
  for (const r of rows) {
    for (const c of (r.colorIdentity ?? '').split(',').filter(Boolean))
      colors.add(c);
    if (r.setCode) sets.add(r.setCode);
  }
  const hasAllColors = ['W', 'U', 'B', 'R', 'G'].every((c) => colors.has(c));
  const decks = deckRows[0]?.n ?? 0;
  const proxies = proxyRows[0]?.n ?? 0;

  const clamp = (n: number, d: number) => Math.max(0, Math.min(1, n / d));

  // Each trophy: value (current) vs goal (threshold). Bool trophies use 0/1.
  type Def = {
    id: string;
    name: string;
    desc: string;
    value: number;
    goal: number;
    shape: TrophyShape;
    tier: TrophyTier;
    gem: string;
  };
  const list: Def[] = [
    {
      id: 'first',
      name: 'First Steps',
      desc: 'Import your first cards',
      value: totals.distinct,
      goal: 1,
      shape: 'medal',
      tier: 'bronze',
      gem: '#7ee06a',
    },
    {
      id: 'century',
      name: 'Century Club',
      desc: 'Own 100 cards',
      value: totals.total,
      goal: 100,
      shape: 'cup',
      tier: 'silver',
      gem: '#36a7e0',
    },
    {
      id: 'hoard',
      name: 'Card Hoard',
      desc: 'Own 1,000 cards',
      value: totals.total,
      goal: 1000,
      shape: 'cup',
      tier: 'gold',
      gem: '#9b6cff',
    },
    {
      id: 'dragon',
      name: "Dragon's Hoard",
      desc: 'Own 5,000 cards',
      value: totals.total,
      goal: 5000,
      shape: 'crown',
      tier: 'gold',
      gem: '#ff5db5',
    },
    {
      id: 'builder',
      name: 'Deck Builder',
      desc: 'Save a deck',
      value: decks,
      goal: 1,
      shape: 'ribbon',
      tier: 'bronze',
      gem: '#5cc04a',
    },
    {
      id: 'architect',
      name: 'Architect',
      desc: 'Save 3 decks',
      value: decks,
      goal: 3,
      shape: 'cup',
      tier: 'silver',
      gem: '#ffce3a',
    },
    {
      id: 'foil1',
      name: 'Foil Fiend',
      desc: 'Own a foil',
      value: foilCount,
      goal: 1,
      shape: 'star',
      tier: 'bronze',
      gem: '#ff79b0',
    },
    {
      id: 'foil50',
      name: 'Foil Hoarder',
      desc: 'Own 50 foils',
      value: foilCount,
      goal: 50,
      shape: 'star',
      tier: 'gold',
      gem: '#36a7e0',
    },
    {
      id: 'spender',
      name: 'Big Spender',
      desc: 'Collection worth $1,000',
      value: Math.round(totals.valueUsd),
      goal: 1000,
      shape: 'gem',
      tier: 'gold',
      gem: '#5cffd0',
    },
    {
      id: 'rainbow',
      name: 'Full Spectrum',
      desc: 'Own all five colors',
      value: hasAllColors ? 1 : colors.size,
      goal: hasAllColors ? 1 : 5,
      shape: 'gem',
      tier: 'gold',
      gem: '#ff9a3d',
    },
    {
      id: 'proxy',
      name: 'Proxy Royalty',
      desc: 'Tag 20 proxies',
      value: proxies,
      goal: 20,
      shape: 'medal',
      tier: 'silver',
      gem: '#9b6cff',
    },
    {
      id: 'sets',
      name: 'Set Collector',
      desc: 'Own cards from 50 sets',
      value: sets.size,
      goal: 50,
      shape: 'ribbon',
      tier: 'silver',
      gem: '#36a7e0',
    },
  ];

  return list.map((t) => ({
    id: t.id,
    name: t.name,
    desc: t.desc,
    earned: t.value >= t.goal,
    progress: clamp(t.value, t.goal),
    shape: t.shape,
    tier: t.tier,
    gem: t.gem,
  }));
}
