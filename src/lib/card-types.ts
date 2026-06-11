/** Bucket a Scryfall type_line into one primary card type for filtering. */
export const TYPE_BUCKETS = [
  "Creature",
  "Planeswalker",
  "Instant",
  "Sorcery",
  "Artifact",
  "Enchantment",
  "Battle",
  "Land",
  "Other",
] as const;

export type TypeBucket = (typeof TYPE_BUCKETS)[number];

export function typeBucket(typeLine: string | null): TypeBucket {
  if (!typeLine) return "Other";
  const t = typeLine.toLowerCase();
  // Order matters: a card is bucketed by its most "spell-like" type first.
  if (t.includes("creature")) return "Creature";
  if (t.includes("planeswalker")) return "Planeswalker";
  if (t.includes("instant")) return "Instant";
  if (t.includes("sorcery")) return "Sorcery";
  if (t.includes("battle")) return "Battle";
  if (t.includes("artifact")) return "Artifact";
  if (t.includes("enchantment")) return "Enchantment";
  if (t.includes("land")) return "Land";
  return "Other";
}
