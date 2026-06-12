import { normalizeName } from "./normalize";
import type { ParsedCard } from "./deck-parser";

/**
 * Pure (client-safe, testable) EDHREC helpers. The network fetch lives in
 * edhrec.ts (server-only); everything here is just string/data shaping.
 */

export type EdhrecCardView = {
  name?: string;
  num_decks?: number;
};
export type EdhrecCardList = { header?: string; cardviews?: EdhrecCardView[] };
export type EdhrecData = {
  header?: string;
  container?: { json_dict?: { cardlists?: EdhrecCardList[] } };
};

/**
 * EDHREC's page header tags the role, e.g. "Atraxa, Praetors' Voice (Commander)"
 * or "...(Background)". Strip it so the name matches the real card.
 */
export function cleanCommanderName(raw: string): string {
  return raw.replace(/\s*\((commander|background|partner)\)\s*$/i, "").trim();
}

/** Commander name -> EDHREC URL slug (front face, ascii, hyphenated). */
export function edhrecSlug(commander: string): string {
  const frontFace = commander.split("//")[0];
  return frontFace
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // any run of non-alphanumerics -> single hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}

/**
 * Flatten EDHREC's per-category card lists into a single deck: the commander
 * (flagged), then the most-included cards across all categories, deduped and
 * capped at `limit`.
 */
export function parseEdhrecCards(
  data: EdhrecData,
  commanderName: string,
  limit = 100,
): ParsedCard[] {
  const lists = data.container?.json_dict?.cardlists ?? [];
  const cleanName = cleanCommanderName(commanderName);
  const commanderKey = normalizeName(cleanName);

  const byKey = new Map<string, { name: string; numDecks: number }>();
  for (const list of lists) {
    for (const cv of list.cardviews ?? []) {
      const name = (cv.name ?? "").trim();
      if (!name) continue;
      const key = normalizeName(name);
      if (!key || key === commanderKey) continue; // skip the commander itself
      const numDecks = cv.num_decks ?? 0;
      const existing = byKey.get(key);
      if (!existing || numDecks > existing.numDecks) {
        byKey.set(key, { name, numDecks });
      }
    }
  }

  const ranked = [...byKey.values()]
    .sort((a, b) => b.numDecks - a.numDecks)
    .slice(0, limit);

  return [
    { name: cleanName, normalizedName: commanderKey, quantity: 1, isCommander: true },
    ...ranked.map((c) => ({
      name: c.name,
      normalizedName: normalizeName(c.name),
      quantity: 1,
      isCommander: false,
    })),
  ];
}
