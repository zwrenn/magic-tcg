import { requireUser } from "@/lib/auth";
import { removeCardByName } from "@/lib/collection";

/** Remove all of the current user's copies of a card (by name). */
export async function POST(req: Request) {
  const user = await requireUser();
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.name) {
    return Response.json({ error: "No card name" }, { status: 400 });
  }
  const removed = await removeCardByName(user.id, body.name);
  return Response.json({ ok: true, removed });
}
