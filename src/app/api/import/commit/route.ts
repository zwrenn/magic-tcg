import { requireUser } from "@/lib/auth";
import { parseManaboxCsv } from "@/lib/manabox";
import { replaceCollection, type ImportProgress } from "@/lib/import";

// First-time imports of a large collection can spend ~30s+ hitting Scryfall.
// Vercel caps this to the plan max (10s hobby / 60s+ pro). Re-imports are fast.
export const maxDuration = 300;

/**
 * Streams newline-delimited JSON progress events as the import runs, so the
 * client can show a live progress bar without any cross-request job state
 * (which wouldn't survive serverless anyway).
 */
export async function POST(req: Request) {
  const user = await requireUser();

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const { entries } = parseManaboxCsv(text);
  if (entries.length === 0) {
    return Response.json({ error: "No valid rows found in CSV." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (p: ImportProgress) =>
        controller.enqueue(encoder.encode(JSON.stringify(p) + "\n"));
      await replaceCollection(user.id, entries, emit);
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
