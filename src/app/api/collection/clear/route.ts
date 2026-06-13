import { requireUser } from "@/lib/auth";
import { clearCollection } from "@/lib/collection";

export async function POST() {
  const user = await requireUser();
  const removed = await clearCollection(user.id);
  return Response.json({ ok: true, removed });
}
