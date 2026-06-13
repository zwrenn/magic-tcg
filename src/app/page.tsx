import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listDecks } from "@/lib/decks";
import { ColorDots } from "@/components/mana";

export default async function HomePage() {
  await requireUser();
  const decks = await listDecks();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Decks</h1>
          <p className="mt-1 text-sm text-muted">
            Drop in a deck to see what the pod already owns.
          </p>
        </div>
        <Link
          href="/decks/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          + New deck
        </Link>
      </div>

      {decks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm text-muted">No decks yet.</p>
          <Link
            href="/decks/new"
            className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
          >
            Add your first deck
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {decks.map((d) => (
            <li key={d.id}>
              <Link
                href={`/decks/${d.id}`}
                className="block rounded-xl border border-border bg-surface p-4 transition hover:border-accent/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-medium">{d.name}</h2>
                  <div className="flex shrink-0 items-center gap-2">
                    {d.colors && <ColorDots identity={d.colors} />}
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
                      {d.source}
                    </span>
                  </div>
                </div>
                {d.commander && (
                  <p className="mt-1 truncate text-sm text-accent">{d.commander}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {d.cardCount} cards · by {d.ownerName} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
