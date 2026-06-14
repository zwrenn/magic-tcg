"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { parseDecklist } from "@/lib/deck-parser";
import { fetchArchidektDeck } from "@/lib/archidekt";
import { fetchCommanderDeck } from "@/lib/edhrec";
import { createDeck, deleteDeck, getDeck } from "@/lib/decks";

export type ActionState = { error?: string };

export async function createDeckFromPaste(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim() || "Untitled deck";
  const text = String(formData.get("decklist") ?? "");

  const { cards, ignored } = parseDecklist(text);
  if (cards.length === 0) {
    return { error: "Couldn't find any cards in that list." };
  }

  let deckId: number;
  try {
    deckId = await createDeck({
      ownerUserId: user.id,
      name,
      source: "paste",
      cards,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save deck." };
  }

  void ignored; // (could surface unparsed lines later)
  revalidatePath("/");
  redirect(`/decks/${deckId}`);
}

export async function createDeckFromArchidekt(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const url = String(formData.get("url") ?? "").trim();
  const nameOverride = String(formData.get("name") ?? "").trim();

  let fetched: { name: string; cards: Awaited<ReturnType<typeof fetchArchidektDeck>>["cards"] };
  try {
    fetched = await fetchArchidektDeck(url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't fetch that deck." };
  }
  if (fetched.cards.length === 0) {
    return { error: "That deck appears to be empty." };
  }

  let deckId: number;
  try {
    deckId = await createDeck({
      ownerUserId: user.id,
      name: nameOverride || fetched.name,
      source: "archidekt",
      cards: fetched.cards,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save deck." };
  }

  revalidatePath("/");
  redirect(`/decks/${deckId}`);
}

export async function createDeckFromCommander(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const commander = String(formData.get("commander") ?? "").trim();
  const nameOverride = String(formData.get("name") ?? "").trim();

  let fetched: Awaited<ReturnType<typeof fetchCommanderDeck>>;
  try {
    fetched = await fetchCommanderDeck(commander);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't reach EDHREC." };
  }
  if (fetched.cards.length === 0) {
    return { error: "EDHREC returned no cards for that commander." };
  }

  let deckId: number;
  try {
    deckId = await createDeck({
      ownerUserId: user.id,
      name: nameOverride || fetched.name,
      source: "edhrec",
      cards: fetched.cards,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to save deck." };
  }

  revalidatePath("/");
  redirect(`/decks/${deckId}`);
}

export async function deleteDeckAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = Number(formData.get("deckId"));
  if (Number.isFinite(id)) {
    // Only the deck's owner may delete it.
    const deck = await getDeck(id);
    if (deck && deck.ownerUserId === user.id) {
      await deleteDeck(id);
    }
  }
  revalidatePath("/");
  redirect("/");
}
