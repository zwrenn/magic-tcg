import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getBuildableDecks } from "@/lib/decks";
import { ColorDots } from "@/components/mana";

export default async function BuildablePage() {
  const user = await requireUser();
  const decks = await getBuildableDecks(user.id);

  const ready = decks.filter((d) => d.coveragePct === 100);
  const close = decks.filter((d) => d.coveragePct < 100 && d.coveragePct >= 75);
  const rest = decks.filter((d) => d.coveragePct < 75);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Buildable</h1>
      <p className="mt-1 text-sm text-muted">
        How completely each deck can be built from the pod&apos;s combined cards.
      </p>

      {decks.length === 0 ? (
        <div className="card mt-8 p-10 text-center text-sm text-muted">
          No decks yet —{" "}
          <Link href="/decks/new" className="text-accent hover:underline">
            add a deck
          </Link>{" "}
          to see what the pod can build.
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <Section title="Buildable now" tone="text-good" decks={ready} empty="Nothing fully covered yet." />
          <Section title="Almost there (75%+)" tone="text-warn" decks={close} empty="Nothing close yet." />
          <Section title="Everything else" tone="text-muted" decks={rest} empty="" />
        </div>
      )}
    </main>
  );
}

function Section({
  title,
  tone,
  decks,
  empty,
}: {
  title: string;
  tone: string;
  decks: Awaited<ReturnType<typeof getBuildableDecks>>;
  empty: string;
}) {
  if (decks.length === 0) {
    return empty ? (
      <section>
        <h2 className={`t-label mb-2`}>{title}</h2>
        <p className="text-sm text-muted">{empty}</p>
      </section>
    ) : null;
  }
  return (
    <section>
      <h2 className={`t-label mb-3 ${tone}`}>
        {title} ({decks.length})
      </h2>
      <ul className="space-y-2">
        {decks.map((d) => (
          <li key={d.id}>
            <Link
              href={`/decks/${d.id}`}
              className="card flex items-center gap-4 p-4 transition hover:border-[var(--border-strong)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{d.name}</span>
                  {d.colors && <ColorDots identity={d.colors} />}
                  {d.coveragePct === 100 && (
                    <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-semibold text-good">
                      ✓ READY
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {d.commander ? `${d.commander} · ` : ""}
                  {d.covered}/{d.total} non-basic cards
                  {d.missing > 0 && ` · ${d.missing} missing`}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.coveragePct}%`,
                      backgroundColor:
                        d.coveragePct === 100
                          ? "var(--good)"
                          : d.coveragePct >= 75
                            ? "var(--warn)"
                            : "var(--border-strong)",
                    }}
                  />
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-xl font-bold tabular-nums">{d.coveragePct}%</div>
                <div className="t-label">covered</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
