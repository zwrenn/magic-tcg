import { requireUser } from "@/lib/auth";
import { addCardToCollection } from "@/lib/collection";

export async function POST(req: Request) {
  const user = await requireUser();
  let body: {
    scryfallId?: string;
    quantity?: number;
    foil?: boolean;
    condition?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.scryfallId) {
    return Response.json({ error: "No card selected" }, { status: 400 });
  }

  try {
    const result = await addCardToCollection(user.id, body.scryfallId, {
      quantity: Number(body.quantity) || 1,
      foil: Boolean(body.foil),
      condition: body.condition ?? null,
    });
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed to add card" },
      { status: 500 },
    );
  }
}
