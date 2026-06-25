import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  USER_COOKIE,
  expectedAuthToken,
  passphraseRequired,
} from "@/lib/auth-shared";

/**
 * Passphrase gate (Next 16 "proxy" convention — formerly middleware). Every
 * request must carry a valid `pod_auth` cookie (the salted hash of
 * POD_PASSPHRASE) AND a chosen profile, or it bounces to /gate. Low-stakes by
 * design — keeps the site from being fully public, nothing more.
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const authed =
    !passphraseRequired() ||
    req.cookies.get(AUTH_COOKIE)?.value === (await expectedAuthToken());
  const hasProfile = Boolean(req.cookies.get(USER_COOKIE)?.value);

  if (authed && hasProfile) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except the gate, its API, cron (self-authed via
  // CRON_SECRET), Next internals and static files.
  matcher: [
    "/((?!gate|api/gate|api/cron|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|ogg|wav|m4a)$).*)",
  ],
};
