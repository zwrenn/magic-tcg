import { requireUser } from "@/lib/auth";
import { createRequest } from "@/lib/requests";

export async function POST(req: Request) {
  const user = await requireUser();
  let body: { toUser?: string; cardName?: string; deckId?: number; note?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.toUser || !body.cardName) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  try {
    const result = await createRequest(user.id, {
      toUserName: body.toUser,
      cardName: body.cardName,
      deckId: body.deckId ?? null,
      note: body.note,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
