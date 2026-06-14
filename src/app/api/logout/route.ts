import { cookies } from "next/headers";
import { AUTH_COOKIE, USER_COOKIE } from "@/lib/auth-shared";

/** Clear the session cookies so the next request bounces back to the gate. */
export async function POST() {
  const jar = await cookies();
  jar.delete(AUTH_COOKIE);
  jar.delete(USER_COOKIE);
  return Response.json({ ok: true });
}
