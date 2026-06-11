import { requireUser } from "@/lib/auth";
import { parseManaboxCsv } from "@/lib/manabox";
import { currentCollectionCount } from "@/lib/import";

export const maxDuration = 60;

export async function POST(req: Request) {
  const user = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const { entries, rawRowCount, totalQuantity, warnings } = parseManaboxCsv(text);

  if (entries.length === 0) {
    return Response.json(
      { error: warnings.join(" ") || "No valid rows found in CSV." },
      { status: 400 },
    );
  }

  const oldCount = await currentCollectionCount(user.id);

  return Response.json({
    ok: true,
    user: user.name,
    oldCount,
    newDistinct: entries.length,
    newTotalQuantity: totalQuantity,
    rawRowCount,
    warnings,
  });
}
