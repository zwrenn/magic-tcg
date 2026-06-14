import { requireUser } from "@/lib/auth";
import { addDeckCard, removeDeckCard } from "@/lib/decks";

// Add a card to a deck (or bump quantity).
export async function POST(req: Request) {
  const user = await requireUser();
  let body: { deckId?: number; name?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.deckId || !body.name) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  const res = await addDeckCard(user.id, body.deckId, body.name, body.quantity);
  if (!res.ok) {
    return Response.json(
      { error: res.error ?? "Could not add card" },
      { status: res.error === "Not allowed" ? 403 : 400 },
    );
  }
  return Response.json({ ok: true });
}

// Remove a card from a deck.
export async function DELETE(req: Request) {
  const user = await requireUser();
  let body: { deckId?: number; normalizedName?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.deckId || !body.normalizedName) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  const ok = await removeDeckCard(user.id, body.deckId, body.normalizedName);
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 403 });
  return Response.json({ ok: true });
}
