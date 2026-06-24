import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Pod news shown on the home board. Edit `events` (and bump `version`) for your
 * playgroup's own announcements; the featured set + fresh pulls are automatic.
 *
 * Bump `version` whenever you change the blurbs so the board re-pops for
 * everyone (the dismissed-cookie is keyed on version + featured set code).
 */
export const POD_ANNOUNCEMENTS = {
  version: "2026-06-a",
  events: [
    {
      emoji: "🎟️",
      title: "Modern Horizons 3 draft — Thursday",
      detail: "Fire it up this Thursday. Bring your bombs and questionable mana bases.",
    },
  ] as { emoji: string; title: string; detail: string }[],
  /** Pin a specific set code, or null to auto-detect the newest from Scryfall. */
  featuredSetCode: null as string | null,
};

const SCRYFALL_BASE = "https://api.scryfall.com";
/** Cache tag for the Scryfall sets lookup, force-refreshed by the daily cron. */
export const SETS_CACHE_TAG = "scryfall-sets";
/** A pull counts as "new!" if imported within this many days. */
const FRESH_DAYS = 7;
const HEADERS = {
  Accept: "application/json;q=0.9,*/*;q=0.8",
  "User-Agent": "ThePod/1.0 (MTG playgroup collection tool; +https://github.com/zwrenn/magic-tcg)",
};

// Paper, draftable expansion-type sets — the "new set everyone's opening".
const FEATURED_SET_TYPES = new Set(["core", "expansion", "draft_innovation", "masters"]);

export type FeaturedSet = {
  code: string;
  name: string;
  icon: string | null;
  releasedAt: string | null;
};

type ScryfallSet = {
  code: string;
  name: string;
  set_type: string;
  digital: boolean;
  released_at?: string;
  icon_svg_uri?: string;
};

/**
 * The newest real set, straight from Scryfall (cached 24h, so it self-refreshes
 * about once a day). Honors a manual override in POD_ANNOUNCEMENTS.featuredSetCode.
 */
export async function getFeaturedSet(): Promise<FeaturedSet | null> {
  try {
    const res = await fetch(`${SCRYFALL_BASE}/sets`, {
      headers: HEADERS,
      // 24h time-based refresh + a tag the daily cron can force-revalidate.
      next: { revalidate: 86400, tags: [SETS_CACHE_TAG] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: ScryfallSet[] };
    const all = json.data ?? [];

    const override = POD_ANNOUNCEMENTS.featuredSetCode;
    if (override) {
      const s = all.find((x) => x.code.toLowerCase() === override.toLowerCase());
      return s ? toFeatured(s) : null;
    }

    // Newest paper expansion-type set released by now (small future window so a
    // just-dropped set still shows the day it lands).
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 14);
    const cutoff = horizon.toISOString().slice(0, 10);

    const candidates = all
      .filter(
        (s) =>
          !s.digital &&
          FEATURED_SET_TYPES.has(s.set_type) &&
          s.released_at != null &&
          s.released_at <= cutoff,
      )
      .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));

    return candidates[0] ? toFeatured(candidates[0]) : null;
  } catch {
    return null;
  }
}

function toFeatured(s: ScryfallSet): FeaturedSet {
  return {
    code: s.code,
    name: s.name,
    icon: s.icon_svg_uri ?? null,
    releasedAt: s.released_at ?? null,
  };
}

export type FreshPull = {
  normalizedName: string;
  name: string;
  image: string | null;
  foil: boolean;
  owners: string[];
  /** Imported within the last FRESH_DAYS — gets a "new!" glow. */
  isNew: boolean;
};

/** Cards from a given set that the pod owns, newest-imported first. */
export async function getFreshPulls(setCode: string, limit = 16): Promise<FreshPull[]> {
  const rows = await db
    .select({
      normalizedName: schema.cards.normalizedName,
      name: schema.cards.name,
      image: schema.cards.imageUri,
      owner: schema.users.name,
      foil: schema.collectionItems.foil,
      importedAt: schema.collectionItems.importedAt,
    })
    .from(schema.collectionItems)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.collectionItems.cardId))
    .innerJoin(schema.users, eq(schema.users.id, schema.collectionItems.userId))
    .where(sql`lower(${schema.cards.setCode}) = ${setCode.toLowerCase()}`)
    .orderBy(desc(schema.collectionItems.importedAt));

  const freshCutoff = Date.now() - FRESH_DAYS * 86400 * 1000;

  // Aggregate by card (rows are newest-first, so first sighting wins for order).
  const byCard = new Map<string, FreshPull>();
  for (const r of rows) {
    const isNew = r.importedAt ? r.importedAt.getTime() >= freshCutoff : false;
    const existing = byCard.get(r.normalizedName);
    if (existing) {
      if (!existing.owners.includes(r.owner)) existing.owners.push(r.owner);
      if (!existing.image && r.image) existing.image = r.image;
      existing.foil = existing.foil || r.foil;
      existing.isNew = existing.isNew || isNew;
    } else {
      byCard.set(r.normalizedName, {
        normalizedName: r.normalizedName,
        name: r.name,
        image: r.image,
        foil: r.foil,
        owners: [r.owner],
        isNew,
      });
    }
  }
  return [...byCard.values()].slice(0, limit);
}

/** Stable id for "has this person seen the current news?" dismissal cookie. */
export function newsId(featured: FeaturedSet | null): string {
  return `${POD_ANNOUNCEMENTS.version}:${featured?.code ?? "none"}`;
}
