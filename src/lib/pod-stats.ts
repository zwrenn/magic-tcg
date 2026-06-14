import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type PodStats = { cards: number; decks: number; players: number };
export type RosterEntry = { name: string; count: number };

/** Banner LCD plaques: total cards across the pod, deck count, player count. */
export async function getPodStats(): Promise<PodStats> {
  const [[cards], [decks], [players]] = await Promise.all([
    db
      .select({ n: sql<number>`coalesce(sum(${schema.collectionItems.quantity}), 0)::int` })
      .from(schema.collectionItems),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.decks),
    db.select({ n: sql<number>`count(*)::int` }).from(schema.users),
  ]);
  return { cards: cards?.n ?? 0, decks: decks?.n ?? 0, players: players?.n ?? 0 };
}

/** Pod roster: every player with their total card count. */
export async function getRoster(): Promise<RosterEntry[]> {
  const rows = await db
    .select({
      name: schema.users.name,
      count: sql<number>`coalesce(sum(${schema.collectionItems.quantity}), 0)::int`,
    })
    .from(schema.users)
    .leftJoin(
      schema.collectionItems,
      eq(schema.collectionItems.userId, schema.users.id),
    )
    .groupBy(schema.users.id, schema.users.name)
    .orderBy(schema.users.id);
  return rows;
}
