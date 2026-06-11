import { cookies } from "next/headers";
import {
  AUTH_COOKIE,
  USER_COOKIE,
  expectedAuthToken,
  sha256Hex,
} from "@/lib/auth-shared";
import { isPodMember } from "@/lib/pod";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: Request) {
  let body: { passphrase?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { passphrase = "", name = "" } = body;

  if (!isPodMember(name)) {
    return Response.json({ error: "Pick who you are first." }, { status: 400 });
  }

  const submitted = await sha256Hex(`the-pod::${passphrase}`);
  const expected = await expectedAuthToken();
  if (submitted !== expected) {
    return Response.json({ error: "Wrong passphrase." }, { status: 401 });
  }

  const jar = await cookies();
  const opts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  };
  jar.set(AUTH_COOKIE, expected, opts);
  jar.set(USER_COOKIE, name, opts);

  return Response.json({ ok: true });
}
