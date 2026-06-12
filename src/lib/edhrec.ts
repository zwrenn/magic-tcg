import "server-only";
import type { ParsedCard } from "./deck-parser";
import {
  cleanCommanderName,
  edhrecSlug,
  parseEdhrecCards,
  type EdhrecData,
} from "./edhrec-parse";

/**
 * EDHREC integration (unofficial JSON API). Given a commander, pull the cards
 * most commonly played with it and treat them as a deck so the matcher can show
 * what the pod already owns.
 *
 *   GET https://json.edhrec.com/pages/commanders/{slug}.json
 *
 * Pure slug/parsing logic lives in edhrec-parse.ts (testable, client-safe).
 */
export async function fetchCommanderDeck(
  commanderInput: string,
  limit = 100,
): Promise<{ name: string; commanderName: string; cards: ParsedCard[] }> {
  const input = commanderInput.trim();
  if (!input) throw new Error("Enter a commander name.");
  const slug = edhrecSlug(input);
  if (!slug) throw new Error("That doesn't look like a commander name.");

  const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "ThePod/1.0 (MTG playgroup collection tool)",
    },
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error(
      `EDHREC has no page for "${input}". Check the spelling, or use the exact card name.`,
    );
  }
  if (!res.ok) throw new Error(`EDHREC request failed (${res.status}).`);

  const data = (await res.json()) as EdhrecData;
  const commanderName = cleanCommanderName((data.header ?? input).trim());
  const cards = parseEdhrecCards(data, commanderName, limit);

  return { name: `${commanderName} — EDHREC`, commanderName, cards };
}
