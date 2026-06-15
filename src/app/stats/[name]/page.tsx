import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, getUserByName } from "@/lib/auth";
import { collectionTotals, searchUserCollection } from "@/lib/search";
import {
  COLOR_BUCKETS,
  TYPE_BUCKETS,
  colorBucket,
  typeBucket,
} from "@/lib/card-types";
import { CardZoomButton } from "@/components/card-zoom";
import { getTrophies } from "@/lib/trophies";
import { PixelTrophy } from "@/components/pixel-trophy";

const COLOR_HEX: Record<string, string> = {
  White: "#f5f0d8",
  Blue: "#9ed0ec",
  Black: "#5a5550",
  Red: "#f0a18a",
  Green: "#9bd3ae",
  Multicolor: "#d6b85a",
  Colorless: "#cdc6c0",
};

export default async function PlayerStatsPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const viewer = await requireUser();
  const { name } = await params;
  const who = await getUserByName(decodeURIComponent(name));
  if (!who) notFound();
  const isSelf = who.id === viewer.id;

  const [totals, rows, trophies] = await Promise.all([
    collectionTotals(who.id),
    searchUserCollection(who.id, "", 100000),
    getTrophies(who.id),
  ]);
  const earnedCount = trophies.filter((t) => t.earned).length;

  if (totals.distinct === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="t-hero text-2xl">{who.name}&apos;s stats</h1>
        <p className="mt-8 text-sm text-muted">
          {isSelf ? (
            <>
              No cards yet —{" "}
              <a href="/import" className="text-accent hover:underline">
                import your ManaBox CSV
              </a>{" "}
              to see your breakdown.
            </>
          ) : (
            <>{who.name} hasn&apos;t imported a collection yet.</>
          )}
        </p>
      </main>
    );
  }

  const byColor = new Map<string, number>();
  const byType = new Map<string, number>();
  const sets = new Set<string>();
  for (const r of rows) {
    byColor.set(colorBucket(r.colorIdentity), (byColor.get(colorBucket(r.colorIdentity)) ?? 0) + r.quantity);
    byType.set(typeBucket(r.typeLine), (byType.get(typeBucket(r.typeLine)) ?? 0) + r.quantity);
    if (r.setCode) sets.add(r.setCode);
  }

  const colorRows = COLOR_BUCKETS.map((c) => ({ label: c, value: byColor.get(c) ?? 0 })).filter((r) => r.value > 0);
  const typeRows = TYPE_BUCKETS.map((t) => ({ label: t, value: byType.get(t) ?? 0 })).filter((r) => r.value > 0);
  const colorMax = Math.max(1, ...colorRows.map((r) => r.value));
  const typeMax = Math.max(1, ...typeRows.map((r) => r.value));

  const topValuable = [...rows]
    .filter((r) => r.priceUsd)
    .sort((a, b) => (Number(b.priceUsd) || 0) - (Number(a.priceUsd) || 0))
    .slice(0, 12);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-muted hover:text-foreground">
        ← Home
      </Link>
      <h1 className="t-hero mt-2 text-2xl">{who.name}&apos;s stats</h1>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Distinct cards" value={totals.distinct.toLocaleString()} />
        <Stat label="Total cards" value={totals.total.toLocaleString()} />
        <Stat label="Unique sets" value={sets.size.toLocaleString()} />
        <Stat label="Est. value" value={`$${totals.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="t-label mb-3">By color</h2>
          <div className="space-y-2">
            {colorRows.map((r) => (
              <Bar key={r.label} label={r.label} value={r.value} pct={(r.value / colorMax) * 100} color={COLOR_HEX[r.label] ?? "var(--accent)"} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="t-label mb-3">By type</h2>
          <div className="space-y-2">
            {typeRows.map((r) => (
              <Bar key={r.label} label={r.label} value={r.value} pct={(r.value / typeMax) * 100} color="var(--accent)" />
            ))}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <h2 className="t-label mb-3">Most valuable cards</h2>
        {topValuable.length === 0 ? (
          <p className="text-sm text-muted">No price data yet.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {topValuable.map((r, i) => (
              <li key={`${r.name}-${i}`}>
                <CardZoomButton name={r.name} image={r.image} allowEdit={isSelf} holo={r.foil} className="block w-full">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.image} alt={r.name} loading="lazy" className="aspect-[488/680] w-full rounded-lg border border-border object-cover" />
                  ) : (
                    <span className="flex aspect-[488/680] w-full items-center justify-center rounded-lg border border-border bg-surface-2 p-2 text-center text-xs text-muted">{r.name}</span>
                  )}
                </CardZoomButton>
                <div className="mt-1 truncate text-xs text-muted" title={r.name}>{r.name}</div>
                <div className="text-sm font-semibold text-good">${r.priceUsd}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Trophy cabinet */}
      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="t-hero text-xl">🏆 Trophy Cabinet</h2>
          <span className="lcd lcd-gold text-sm tabular-nums">
            {earnedCount} / {trophies.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {trophies.map((t) => (
            <div
              key={t.id}
              title={t.earned ? `Earned: ${t.desc}` : t.desc}
              className={`card flex items-center gap-3 p-3 ${t.earned ? "trophy-earned" : "trophy-locked"}`}
            >
              <span className="shrink-0">
                <PixelTrophy shape={t.shape} tier={t.tier} gem={t.gem} />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-[#3a3358]">{t.name}</div>
                {t.earned ? (
                  <div className="text-xs font-semibold text-[var(--green-deep)]">Earned!</div>
                ) : (
                  <>
                    <div className="truncate text-[11px] text-[#3a3358]/70">{t.desc}</div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full bg-[var(--purple)]"
                        style={{ width: `${Math.round(t.progress * 100)}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}

function Bar({ label, value, pct, color }: { label: string; value: number; pct: number; color: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 text-muted">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, backgroundColor: color }} />
      </div>
      <span className="w-12 shrink-0 text-right tabular-nums text-muted">{value.toLocaleString()}</span>
    </div>
  );
}
