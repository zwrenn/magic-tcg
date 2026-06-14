import "server-only";
import { inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Card, NewCard } from "@/db/schema";
import { normalizeName } from "./normalize";

/**
 * Scryfall integration. SERVER ONLY — never import from a client component.
 *
 * Strategy: the `cards` table is a permanent cache keyed by scryfall_id. We
 * only ever call Scryfall for identifiers we've never seen, then upsert the
 * result. Re-imports of a known collection therefore make ZERO external
 * requests. Scryfall asks callers to stay <=10 req/sec and send a descriptive
 * User-Agent — both enforced below.
 *
 * https://scryfall.com/docs/api  (POST /cards/collection: 75 ids/request)
 */

const SCRYFALL_BASE = "https://api.scryfall.com";
const BATCH_SIZE = 75; // Scryfall's hard max per /cards/collection request
const HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json;q=0.9,*/*;q=0.8",
  "User-Agent": "ThePod/1.0 (MTG playgroup collection tool; +https://github.com/zwrenn/magic-tcg)",
};

/** Simple token bucket: <=10 requests/sec, smoothed. */
class TokenBucket {
  private tokens: number;
  private last = Date.now();
  constructor(
    private readonly capacity: number,
    private readonly perSec: number,
  ) {
    this.tokens = capacity;
  }
  async take(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.tokens = Math.min(
        this.capacity,
        this.tokens + ((now - this.last) / 1000) * this.perSec,
      );
      this.last = now;
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const waitMs = ((1 - this.tokens) / this.perSec) * 1000;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

// No bursting: ~8 req/sec, one at a time (~125ms apart) so Scryfall stays happy.
const bucket = new TokenBucket(1, 8);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type ScryfallCard = {
  id: string;
  name: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  color_identity?: string[];
  rarity?: string;
  image_uris?: { normal?: string; small?: string };
  card_faces?: Array<{ image_uris?: { normal?: string; small?: string } }>;
  prices?: { usd?: string | null };
};

type Identifier = { id: string } | { name: string };

function imageOf(c: ScryfallCard): string | null {
  return (
    c.image_uris?.normal ??
    c.image_uris?.small ??
    // DFCs put images on the faces; use the front face.
    c.card_faces?.[0]?.image_uris?.normal ??
    c.card_faces?.[0]?.image_uris?.small ??
    null
  );
}

function toNewCard(c: ScryfallCard): NewCard {
  return {
    scryfallId: c.id,
    name: c.name,
    normalizedName: normalizeName(c.name),
    setCode: c.set ?? null,
    setName: c.set_name ?? null,
    collectorNumber: c.collector_number ?? null,
    imageUri: imageOf(c),
    manaCost: c.mana_cost ?? null,
    cmc: c.cmc != null ? String(c.cmc) : null,
    typeLine: c.type_line ?? null,
    colorIdentity: c.color_identity ? c.color_identity.join(",") : null,
    rarity: c.rarity ?? null,
    pricesUsd: c.prices?.usd ?? null,
  };
}

/**
 * POST one batch (<=75 identifiers). Returns resolved cards; missing are
 * dropped. Retries on 429/503 with backoff (honoring Retry-After) so a
 * transient rate-limit doesn't kill a whole import.
 */
async function fetchBatch(identifiers: Identifier[]): Promise<ScryfallCard[]> {
  const MAX_TRIES = 5;
  for (let attempt = 1; ; attempt++) {
    await bucket.take();
    let res: Response;
    try {
      res = await fetch(`${SCRYFALL_BASE}/cards/collection`, {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({ identifiers }),
        cache: "no-store",
      });
    } catch (e) {
      if (attempt >= MAX_TRIES) throw e;
      await sleep(500 * attempt);
      continue;
    }

    if (res.ok) {
      const json = (await res.json()) as { data?: ScryfallCard[] };
      return json.data ?? [];
    }

    // Back off and retry on rate-limit / transient server errors.
    if ((res.status === 429 || res.status >= 500) && attempt < MAX_TRIES) {
      const retryAfter = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 600 * attempt + 400;
      await sleep(waitMs);
      continue;
    }

    throw new Error(
      `Scryfall /cards/collection failed: ${res.status} ${res.statusText}`,
    );
  }
}

/** Insert any cards we just fetched, ignoring ones already cached by another concurrent path. */
async function cacheCards(cards: NewCard[]): Promise<void> {
  if (cards.length === 0) return;
  // de-dup within the batch by scryfallId (Scryfall can echo a printing once)
  const seen = new Set<string>();
  const unique = cards.filter((c) =>
    seen.has(c.scryfallId) ? false : (seen.add(c.scryfallId), true),
  );
  await db
    .insert(schema.cards)
    .values(unique)
    .onConflictDoNothing({ target: schema.cards.scryfallId });
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Card-name autocomplete for the manual "add a card" flow (all cards). */
export async function suggestCardNames(q: string): Promise<string[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  await bucket.take();
  const res = await fetch(
    `${SCRYFALL_BASE}/cards/autocomplete?q=${encodeURIComponent(term)}`,
    { headers: HEADERS, cache: "no-store" },
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: string[] };
  return (json.data ?? []).slice(0, 12);
}

export type Printing = {
  scryfallId: string;
  set: string;
  setName: string;
  collectorNumber: string;
  image: string | null;
  priceUsd: string | null;
};

/** Every printing of an exact card name, newest first — for the printing picker. */
export async function getCardPrintings(name: string): Promise<Printing[]> {
  const n = name.trim();
  if (!n) return [];
  await bucket.take();
  const url =
    `${SCRYFALL_BASE}/cards/search?` +
    new URLSearchParams({
      q: `!"${n}"`, // exact name match
      unique: "prints",
      order: "released",
      dir: "desc",
    }).toString();
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) return []; // 404 = unknown name
  const json = (await res.json()) as { data?: ScryfallCard[] };
  return (json.data ?? []).slice(0, 80).map((c) => ({
    scryfallId: c.id,
    set: (c.set ?? "").toUpperCase(),
    setName: c.set_name ?? "",
    collectorNumber: c.collector_number ?? "",
    image: imageOf(c),
    priceUsd: c.prices?.usd ?? null,
  }));
}

/**
 * Resolve a set of Scryfall IDs to cached `cards` rows, fetching+caching any
 * we don't already have. Returns a map keyed by scryfall_id. IDs Scryfall
 * doesn't recognize are simply absent from the result.
 */
export async function ensureCardsByScryfallId(
  scryfallIds: string[],
  opts?: { onProgress?: (resolvedMissing: number, totalMissing: number) => void },
): Promise<Map<string, Card>> {
  const ids = [...new Set(scryfallIds.filter(Boolean))];
  if (ids.length === 0) return new Map();

  // chunk queries to keep parameter counts sane for very large collections
  const existing: Card[] = [];
  for (const idChunk of chunk(ids, 1000)) {
    existing.push(
      ...(await db
        .select()
        .from(schema.cards)
        .where(inArray(schema.cards.scryfallId, idChunk))),
    );
  }
  const have = new Set(existing.map((c) => c.scryfallId));
  const missing = ids.filter((id) => !have.has(id));

  let done = 0;
  for (const batch of chunk(missing, BATCH_SIZE)) {
    const fetched = await fetchBatch(batch.map((id) => ({ id })));
    await cacheCards(fetched.map(toNewCard));
    done += batch.length;
    opts?.onProgress?.(done, missing.length);
  }

  // Re-select everything so the map contains DB rows (with PKs) for all ids.
  const all: Card[] = [];
  for (const idChunk of chunk(ids, 1000)) {
    all.push(
      ...(await db
        .select()
        .from(schema.cards)
        .where(inArray(schema.cards.scryfallId, idChunk))),
    );
  }
  return new Map(all.map((c) => [c.scryfallId, c]));
}

/**
 * Commander name suggestions for the deck-builder typeahead. Filtered to cards
 * that can actually be a commander, ranked by EDHREC popularity. Server-side so
 * the client never touches Scryfall directly.
 */
export async function suggestCommanders(q: string): Promise<string[]> {
  const term = q.trim();
  if (term.length < 2) return [];
  await bucket.take();
  const url =
    `${SCRYFALL_BASE}/cards/search?` +
    new URLSearchParams({
      q: `is:commander ${term}`,
      order: "edhrec",
      unique: "cards",
    }).toString();
  const res = await fetch(url, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) return []; // 404 = no matches yet (still typing); treat as empty
  const json = (await res.json()) as { data?: ScryfallCard[] };
  return (json.data ?? []).slice(0, 10).map((c) => c.name);
}

/**
 * Resolve card NAMES to cached metadata, keyed by normalizedName. Used to
 * enrich deck cards (image / type / mana value) even for cards nobody owns.
 * Skips names we already have a printing for — those cost zero requests.
 */
export async function ensureCardsByName(
  names: string[],
): Promise<Map<string, Card>> {
  // map normalized -> a representative display name to send to Scryfall
  const wanted = new Map<string, string>();
  for (const n of names) {
    const key = normalizeName(n);
    if (key && !wanted.has(key)) wanted.set(key, n.trim());
  }
  if (wanted.size === 0) return new Map();

  const keys = [...wanted.keys()];
  const existing = await db
    .select()
    .from(schema.cards)
    .where(inArray(schema.cards.normalizedName, keys));
  const result = new Map<string, Card>();
  for (const c of existing) if (!result.has(c.normalizedName)) result.set(c.normalizedName, c);

  const missingKeys = keys.filter((k) => !result.has(k));
  const missingNames = missingKeys.map((k) => wanted.get(k)!);

  for (const batch of chunk(missingNames, BATCH_SIZE)) {
    const fetched = await fetchBatch(batch.map((name) => ({ name })));
    await cacheCards(fetched.map(toNewCard));
  }

  if (missingKeys.length > 0) {
    const refetched = await db
      .select()
      .from(schema.cards)
      .where(inArray(schema.cards.normalizedName, missingKeys));
    for (const c of refetched)
      if (!result.has(c.normalizedName)) result.set(c.normalizedName, c);
  }

  return result;
}
