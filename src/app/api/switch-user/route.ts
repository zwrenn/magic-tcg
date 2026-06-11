import { cookies } from "next/headers";
import { USER_COOKIE } from "@/lib/auth-shared";
import { isPodMember } from "@/lib/pod";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Switch which pod member you are, without re-entering the passphrase. */
export async function POST(req: Request) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!isPodMember(body.name ?? "")) {
    return Response.json({ error: "Unknown member" }, { status: 400 });
  }
  (await cookies()).set(USER_COOKIE, body.name!, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return Response.json({ ok: true });
}
