import { requireUser } from "@/lib/auth";
import { getCardPrintings } from "@/lib/scryfall";

/** All printings of an exact card name, for the printing picker. */
export async function GET(req: Request) {
  await requireUser();
  const name = new URL(req.url).searchParams.get("name") ?? "";
  const printings = await getCardPrintings(name);
  return Response.json({ printings });
}
