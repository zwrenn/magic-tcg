import { requireUser } from "@/lib/auth";
import { suggestCardNames } from "@/lib/scryfall";

/** Card-name autocomplete for the manual add-a-card flow. */
export async function GET(req: Request) {
  await requireUser();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const names = await suggestCardNames(q);
  return Response.json({ names });
}
