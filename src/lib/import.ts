import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { ensureCardsByScryfallId } from "./scryfall";
import type { ManaboxEntry } from "./manabox";

export type ImportProgress =
  | { stage: "enriching"; done: number; total: number }
  | { stage: "writing" }
  | {
      stage: "done";
      oldCount: number;
      newDistinct: number;
      newTotalQuantity: number;
      unresolved: number;
    }
  | { stage: "error"; message: string };

const INSERT_CHUNK = 500;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Current distinct collection_items rows for a user (pre-import count). */
export async function currentCollectionCount(userId: number): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.collectionItems)
    .where(eq(schema.collectionItems.userId, userId));
  return row?.n ?? 0;
}

/**
 * Full re-sync of a user's collection from parsed ManaBox entries, reporting
 * progress via `emit`.
 *
 * Order matters for safety: resolve+cache all cards via Scryfall FIRST (the
 * slow, failure-prone part) and only mutate the DB once that succeeds. If
 * enrichment throws or times out, the existing collection is untouched and
 * re-running picks up a warm card cache.
 */
export async function replaceCollection(
  userId: number,
  entries: ManaboxEntry[],
  emit: (p: ImportProgress) => void,
): Promise<void> {
  try {
    const oldCount = await currentCollectionCount(userId);

    emit({ stage: "enriching", done: 0, total: entries.length });
    const cardMap = await ensureCardsByScryfallId(
      entries.map((e) => e.scryfallId),
      { onProgress: (done, total) => emit({ stage: "enriching", done, total }) },
    );

    const rows: (typeof schema.collectionItems.$inferInsert)[] = [];
    let unresolved = 0;
    for (const e of entries) {
      const card = cardMap.get(e.scryfallId);
      if (!card) {
        unresolved++;
        continue;
      }
      rows.push({
        userId,
        cardId: card.id,
        quantity: e.quantity,
        foil: e.foil,
        condition: e.condition,
        source: "manabox",
      });
    }

    emit({ stage: "writing" });

    // Replace: clear then insert. neon-http has no interactive transactions, so
    // this isn't strictly atomic — the window is tiny (local DB ops, no network
    // round-trips to Scryfall here) and re-running is always safe.
    await db
      .delete(schema.collectionItems)
      .where(eq(schema.collectionItems.userId, userId));
    for (const part of chunk(rows, INSERT_CHUNK)) {
      await db.insert(schema.collectionItems).values(part);
    }

    emit({
      stage: "done",
      oldCount,
      newDistinct: rows.length,
      newTotalQuantity: rows.reduce((s, r) => s + (r.quantity ?? 0), 0),
      unresolved,
    });
  } catch (err) {
    emit({
      stage: "error",
      message: err instanceof Error ? err.message : "Import failed",
    });
  }
}
