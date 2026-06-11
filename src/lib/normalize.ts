/**
 * The ONE place card names get normalized.
 *
 * Used by BOTH the ManaBox importer and the deck parser so that a card in
 * someone's collection and the same card in a decklist collapse to the exact
 * same key. If you change this, you must re-import collections AND re-parse
 * decks, or matches will silently drift.
 *
 * Rules:
 *  - front face only for double-faced / split cards (split on `//`, take first)
 *  - strip diacritics (Lim-Dûl -> lim-dul, Æther -> aether)
 *  - lowercase
 *  - collapse internal whitespace, trim ends
 */
export function normalizeName(raw: string): string {
  if (!raw) return "";

  // Front face only. Covers MDFCs ("Fire // Ice"), transform DFCs that some
  // exports render as "Front // Back", and adventure cards.
  const frontFace = raw.split("//")[0];

  return frontFace
    .normalize("NFKD") // decompose accented chars into base + combining mark
    .replace(/[̀-ͯ]/g, "") // drop the combining marks
    .replace(/æ/gi, "ae") // Æther -> aether (ligature, not a combining mark)
    .replace(/œ/gi, "oe")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
