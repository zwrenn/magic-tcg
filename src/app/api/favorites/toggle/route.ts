import { requireUser } from "@/lib/auth";
import { toggleFavorite } from "@/lib/favorites";

export async function POST(req: Request) {
  const user = await requireUser();
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.name) {
    return Response.json({ error: "No card" }, { status: 400 });
  }
  const favorited = await toggleFavorite(user.id, body.name);
  return Response.json({ ok: true, favorited });
}
