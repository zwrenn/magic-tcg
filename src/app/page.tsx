import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listDecks } from "@/lib/decks";
import { ColorDots } from "@/components/mana";

const COLOR_HEX: Record<string, string> = {
  W: "#f5f0d8", U: "#9ed0ec", B: "#5a5550", R: "#f0a18a", G: "#9bd3ae",
};

function deckGradient(colors: string): string {
  const parts = colors.split(",").filter(Boolean);
  if (parts.length === 0) return "linear-gradient(135deg, #2a2620, #16140f)";
  if (parts.length === 1) return `linear-gradient(135deg, ${COLOR_HEX[parts[0]]}55, #16140f)`;
  return `linear-gradient(135deg, ${parts.map((c) => `${COLOR_HEX[c]}55`).join(", ")})`;
}

export default async function HomePage() {
  const user = await requireUser();
  const decks = await listDecks();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
      {/* Hero */}
      <section className="card relative mb-8 overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ background: "radial-gradient(circle at 50% 0%, var(--accent), transparent 60%)" }} />
        <h1 className="t-hero relative text-4xl sm:text-5xl">The Pod</h1>
        <div className="relative mt-3 flex justify-center gap-2 text-2xl">
          <i className="ms ms-w ms-cost ms-shadow" />
          <i className="ms ms-u ms-cost ms-shadow" />
          <i className="ms ms-b ms-cost ms-shadow" />
          <i className="ms ms-r ms-cost ms-shadow" />
          <i className="ms ms-g ms-cost ms-shadow" />
        </div>
        <p className="relative mx-auto mt-3 max-w-md text-sm text-muted">
          Your playgroup&apos;s shared spellbook. Drop in a deck and see what the
          pod already owns between you.
        </p>
        <div className="relative mt-5">
          <Link
            href="/decks/new"
            className="inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110 hover:shadow-[var(--glow)]"
          >
            + Forge a new deck
          </Link>
        </div>
      </section>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="t-label text-sm">Decks ({decks.length})</h2>
        <span className="text-xs text-muted">Signed in as {user.name}</span>
      </div>

      {decks.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-muted">No decks in the pod yet.</p>
          <Link
            href="/decks/new"
            className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Add your first deck
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((d) => (
            <li key={d.id}>
              <Link
                href={`/decks/${d.id}`}
                className="card group block overflow-hidden transition hover:border-[var(--border-strong)] hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
              >
                {/* Commander art */}
                <div className="relative aspect-[5/3] overflow-hidden">
                  {d.commanderImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.commanderImage}
                      alt={d.commander ?? d.name}
                      loading="lazy"
                      className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center gap-2 text-2xl"
                      style={{ background: deckGradient(d.colors) }}
                    >
                      {(d.colors.split(",").filter(Boolean).length
                        ? d.colors.split(",").filter(Boolean)
                        : ["c"]
                      ).map((c, i) => (
                        <i key={i} className={`ms ms-${c.toLowerCase()} ms-cost ms-shadow`} />
                      ))}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/30 to-transparent" />
                  {d.colors && (
                    <ColorDots identity={d.colors} className="absolute right-2 top-2 text-base" />
                  )}
                </div>
                {/* Plate */}
                <div className="relative -mt-6 px-4 pb-4">
                  <h3 className="truncate text-base" title={d.name}>{d.name}</h3>
                  {d.commander && (
                    <p className="truncate text-xs text-accent">{d.commander}</p>
                  )}
                  <p className="mt-1 text-xs text-muted">
                    {d.cardCount} cards · by {d.ownerName}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
