import { config } from "dotenv";

// Load env BEFORE importing the db client.
config({ path: ".env.local" });
config();

/**
 * Backfill `color_identity` (and refresh cmc/type) for cards imported before
 * that column existed. Safe to re-run — only touches rows missing the data.
 *
 *   pnpm db:backfill
 */
async function main() {
  const { db, schema } = await import("./index");
  const { isNull, or, eq } = await import("drizzle-orm");

  const rows = await db
    .select({ id: schema.cards.id, scryfallId: schema.cards.scryfallId })
    .from(schema.cards)
    .where(
      or(
        isNull(schema.cards.colorIdentity),
        isNull(schema.cards.setName),
        isNull(schema.cards.rarity),
      ),
    );

  if (rows.length === 0) {
    console.log("Nothing to backfill — all cards already have color identity.");
    return;
  }
  console.log(`Backfilling ${rows.length} card(s)…`);

  const HEADERS = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "ThePod/1.0 (collection backfill)",
  };

  let updated = 0;
  for (let i = 0; i < rows.length; i += 75) {
    const batch = rows.slice(i, i + 75);
    const res = await fetch("https://api.scryfall.com/cards/collection", {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ identifiers: batch.map((r) => ({ id: r.scryfallId })) }),
    });
    if (!res.ok) {
      console.warn(`  batch ${i} failed: ${res.status}`);
      continue;
    }
    const json = (await res.json()) as {
      data?: Array<{
        id: string;
        color_identity?: string[];
        cmc?: number;
        type_line?: string;
        set_name?: string;
        rarity?: string;
      }>;
    };
    for (const c of json.data ?? []) {
      await db
        .update(schema.cards)
        .set({
          colorIdentity: (c.color_identity ?? []).join(","),
          cmc: c.cmc != null ? String(c.cmc) : undefined,
          typeLine: c.type_line ?? undefined,
          setName: c.set_name ?? undefined,
          rarity: c.rarity ?? undefined,
        })
        .where(eq(schema.cards.scryfallId, c.id));
      updated++;
    }
    process.stdout.write(`\r  ${updated}/${rows.length}`);
    await new Promise((r) => setTimeout(r, 100)); // be nice to Scryfall (~10/s)
  }
  console.log(`\nDone. Updated ${updated} card(s).`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  },
);
