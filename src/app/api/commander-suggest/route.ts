import { requireUser } from "@/lib/auth";
import { suggestCommanders } from "@/lib/scryfall";

/** Typeahead suggestions for the commander deck builder. */
export async function GET(req: Request) {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const names = await suggestCommanders(q);
  return Response.json({ names });
}
