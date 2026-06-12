import { requireUser } from "@/lib/auth";
import { collectionTotals, searchUserCollection } from "@/lib/search";
import {
  COLOR_BUCKETS,
  TYPE_BUCKETS,
  colorBucket,
  typeBucket,
} from "@/lib/card-types";
import { CardZoomButton } from "@/components/card-zoom";

const COLOR_HEX: Record<string, string> = {
  White: "#f5f0d8",
  Blue: "#9ed0ec",
  Black: "#5a5550",
  Red: "#f0a18a",
  Green: "#9bd3ae",
  Multicolor: "#d6b85a",
  Colorless: "#cdc6c0",
};

export default async function StatsPage() {
  const user = await requireUser();
  const [totals, rows] = await Promise.all([
    collectionTotals(user.id),
    searchUserCollection(user.id, "", 100000),
  ]);

  if (totals.distinct === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Stats</h1>
        <p className="mt-8 text-sm text-muted">
          No cards yet —{" "}
          <a href="/import" className="text-accent hover:underline">
            import your ManaBox CSV
          </a>{" "}
          to see your breakdown.
        </p>
      </main>
    );
  }

  // Aggregate by color / type (weighted by quantity).
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
      <h1 className="text-2xl font-semibold tracking-tight">{user.name}&apos;s stats</h1>

      {/* Top-line numbers */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Distinct cards" value={totals.distinct.toLocaleString()} />
        <Stat label="Total cards" value={totals.total.toLocaleString()} />
        <Stat label="Unique sets" value={sets.size.toLocaleString()} />
        <Stat label="Est. value" value={`$${totals.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent />
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        {/* Colors */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">By color</h2>
          <div className="space-y-2">
            {colorRows.map((r) => (
              <Bar
                key={r.label}
                label={r.label}
                value={r.value}
                pct={(r.value / colorMax) * 100}
                color={COLOR_HEX[r.label] ?? "var(--accent)"}
              />
            ))}
          </div>
        </section>

        {/* Types */}
        <section>
          <h2 className="mb-3 text-sm font-semibold">By type</h2>
          <div className="space-y-2">
            {typeRows.map((r) => (
              <Bar
                key={r.label}
                label={r.label}
                value={r.value}
                pct={(r.value / typeMax) * 100}
                color="var(--accent)"
              />
            ))}
          </div>
        </section>
      </div>

      {/* Most valuable */}
      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold">Most valuable cards</h2>
        {topValuable.length === 0 ? (
          <p className="text-sm text-muted">No price data yet.</p>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {topValuable.map((r, i) => (
              <li key={`${r.name}-${i}`}>
                <CardZoomButton name={r.name} image={r.image} className="block w-full">
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
    </main>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
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
