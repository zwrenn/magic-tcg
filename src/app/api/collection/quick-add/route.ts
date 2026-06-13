import { requireUser } from "@/lib/auth";
import { addCardByName } from "@/lib/collection";

/** One-click add a card to the current user's collection by name. */
export async function POST(req: Request) {
  const user = await requireUser();
  let body: { name?: string; quantity?: number; foil?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.name) {
    return Response.json({ error: "No card name" }, { status: 400 });
  }
  const result = await addCardByName(user.id, body.name, {
    quantity: Number(body.quantity) || 1,
    foil: Boolean(body.foil),
  });
  if (!result) {
    return Response.json({ error: "Card not found" }, { status: 404 });
  }
  return Response.json({ ok: true, ...result });
}
