import "server-only";
import { normalizeName } from "./normalize";
import type { ParsedCard } from "./deck-parser";

/**
 * Archidekt deck import. Public read-only API:
 *   GET https://archidekt.com/api/decks/{id}/
 * We skip cards in categories that aren't part of the deck (Maybeboard,
 * Considering, anything flagged includedInDeck=false) and flag the Commander
 * category.
 */

type ArchidektCategory = { name: string; includedInDeck?: boolean };
type ArchidektCardEntry = {
  quantity?: number;
  categories?: string[];
  card?: {
    oracleCard?: { name?: string };
    name?: string;
  };
};
type ArchidektDeck = {
  name?: string;
  cards?: ArchidektCardEntry[];
  categories?: ArchidektCategory[];
};

export function extractArchidektId(input: string): string | null {
  const trimmed = input.trim();
  // Full URL: https://archidekt.com/decks/123456/whatever
  const m = trimmed.match(/archidekt\.com\/decks\/(\d+)/i);
  if (m) return m[1];
  // Bare id
  if (/^\d+$/.test(trimmed)) return trimmed;
  return null;
}

const ALWAYS_EXCLUDE = new Set(["maybeboard", "maybe", "considering"]);

export async function fetchArchidektDeck(
  idOrUrl: string,
): Promise<{ name: string; cards: ParsedCard[] }> {
  const id = extractArchidektId(idOrUrl);
  if (!id) throw new Error("That doesn't look like an Archidekt deck URL.");

  const res = await fetch(`https://archidekt.com/api/decks/${id}/`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ThePod/1.0 (MTG playgroup collection tool)",
    },
    cache: "no-store",
  });
  if (res.status === 404) throw new Error("Archidekt deck not found (is it private?).");
  if (!res.ok) throw new Error(`Archidekt request failed (${res.status}).`);

  const deck = (await res.json()) as ArchidektDeck;

  // Categories explicitly excluded from the deck.
  const excluded = new Set(ALWAYS_EXCLUDE);
  for (const cat of deck.categories ?? []) {
    if (cat.includedInDeck === false) excluded.add(cat.name.trim().toLowerCase());
  }

  const byKey = new Map<string, ParsedCard>();
  for (const entry of deck.cards ?? []) {
    const name = (entry.card?.oracleCard?.name ?? entry.card?.name ?? "").trim();
    if (!name) continue;

    const cats = (entry.categories ?? []).map((c) => c.trim());
    if (cats.some((c) => excluded.has(c.toLowerCase()))) continue;

    const isCommander = cats.some((c) => c.toLowerCase() === "commander");
    // Many players tag proxies with a "Proxy" category in Archidekt.
    const isProxy = cats.some((c) => c.toLowerCase().includes("proxy"));
    const quantity = entry.quantity && entry.quantity > 0 ? entry.quantity : 1;
    const normalizedName = normalizeName(name);
    if (!normalizedName) continue;

    const existing = byKey.get(normalizedName);
    if (existing) {
      existing.quantity += quantity;
      existing.isCommander = existing.isCommander || isCommander;
      existing.isProxy = existing.isProxy || isProxy;
    } else {
      byKey.set(normalizedName, { name, normalizedName, quantity, isCommander, isProxy });
    }
  }

  return {
    name: deck.name?.trim() || `Archidekt deck ${id}`,
    cards: [...byKey.values()],
  };
}
