import { requireUser } from "@/lib/auth";
import { setItemQuantity } from "@/lib/collection";

/** Update (or remove, when quantity <= 0) a single collection item. */
export async function POST(req: Request) {
  const user = await requireUser();
  let body: { id?: number; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.id) {
    return Response.json({ error: "No item id" }, { status: 400 });
  }
  const result = await setItemQuantity(user.id, body.id, Number(body.quantity) || 0);
  return Response.json({ ok: true, ...result });
}
