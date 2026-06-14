import { requireUser } from "@/lib/auth";
import { setDeckCardProxy } from "@/lib/decks";

export async function POST(req: Request) {
  const user = await requireUser();
  let body: { deckId?: number; normalizedName?: string; isProxy?: boolean };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.deckId || !body.normalizedName) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  const ok = await setDeckCardProxy(
    user.id,
    body.deckId,
    body.normalizedName,
    Boolean(body.isProxy),
  );
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 403 });
  return Response.json({ ok: true });
}
