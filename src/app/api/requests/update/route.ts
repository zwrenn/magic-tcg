import { requireUser } from "@/lib/auth";
import { updateRequestStatus } from "@/lib/requests";

export async function POST(req: Request) {
  const user = await requireUser();
  let body: { id?: number; status?: "given" | "declined" | "cancelled" };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.id || !body.status) {
    return Response.json({ error: "Missing fields" }, { status: 400 });
  }
  const ok = await updateRequestStatus(user.id, body.id, body.status);
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 403 });
  return Response.json({ ok: true });
}
