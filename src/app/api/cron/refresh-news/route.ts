import { revalidateTag } from "next/cache";
import { SETS_CACHE_TAG } from "@/lib/news";

/**
 * Daily cron (see vercel.json) that force-refreshes the Scryfall sets lookup so
 * a brand-new set appears even on a day with no visitors. The 24h time-based
 * revalidate already covers normal traffic; this is the belt-and-suspenders.
 *
 * If CRON_SECRET is set, Vercel sends it as a Bearer token — we require a match.
 * Unset → open (fine for an IP-allowlisted internal tool).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  // Next 16: second arg required; "max" = stale-while-revalidate semantics.
  revalidateTag(SETS_CACHE_TAG, "max");
  return Response.json({ ok: true, revalidated: SETS_CACHE_TAG });
}
